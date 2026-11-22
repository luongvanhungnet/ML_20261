"""Reproducible L3-L11 experiments. Run: python ml/src/course_experiments.py."""

import argparse
import hashlib
import json
import platform
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.cluster import KMeans
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import RandomForestClassifier
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score, adjusted_rand_score, classification_report, confusion_matrix,
    davies_bouldin_score, f1_score, log_loss, mean_absolute_error,
    mean_squared_error, normalized_mutual_info_score, r2_score, silhouette_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from threadpoolctl import threadpool_limits

from preprocess import (
    build_preprocessing_pipeline, PREDICTIVE_NUMERIC_FEATURES,
    PREDICTIVE_CATEGORICAL_FEATURES,
)

ROOT = Path(__file__).resolve().parents[2]
SEED = 42
FEATURES = PREDICTIVE_NUMERIC_FEATURES + PREDICTIVE_CATEGORICAL_FEATURES


def pipeline(model):
    return Pipeline([("preprocessor", build_preprocessing_pipeline()), ("model", clone(model))])


def classification_metrics(y, pred, probabilities, classes):
    return {
        "accuracy": accuracy_score(y, pred),
        "macro_f1": f1_score(y, pred, average="macro", zero_division=0),
        "weighted_f1": f1_score(y, pred, average="weighted", zero_division=0),
        "log_loss": log_loss(y, probabilities, labels=classes),
        "class_order": classes.tolist(),
        "confusion_matrix": confusion_matrix(y, pred, labels=classes).tolist(),
        "per_class": classification_report(y, pred, labels=classes, output_dict=True, zero_division=0),
    }


def regression_metrics(y, pred):
    return {"mae": mean_absolute_error(y, pred),
            "rmse": float(np.sqrt(mean_squared_error(y, pred))), "r2": r2_score(y, pred)}


def run(data_path):
    started = time.perf_counter()
    raw = pd.read_csv(data_path)
    required = FEATURES + ["Attack Type", "Anomaly Scores"]
    missing = sorted(set(required) - set(raw.columns))
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")
    data = raw.copy()
    for col in PREDICTIVE_CATEGORICAL_FEATURES + ["Attack Type"]:
        data[col] = data[col].astype("string").str.strip().replace("", pd.NA)
        data[col] = data[col].astype(object).where(data[col].notna(), np.nan)
    for col in PREDICTIVE_NUMERIC_FEATURES + ["Anomaly Scores"]:
        data[col] = pd.to_numeric(data[col], errors="coerce").replace([np.inf, -np.inf], np.nan)
    data = data.drop_duplicates()
    # The shared row split permits comparisons across all three tasks.
    data = data.dropna(subset=["Attack Type", "Anomaly Scores"])
    train_val, test = train_test_split(data.index.to_numpy(), test_size=0.15,
                                     random_state=SEED, stratify=data["Attack Type"])
    train, val = train_test_split(train_val, test_size=0.15 / 0.85,
                                 random_state=SEED, stratify=data.loc[train_val, "Attack Type"])
    splits = {"train": train.tolist(), "validation": val.tolist(), "test": test.tolist()}
    artifacts = ROOT / "ml/artifacts/course"
    artifacts.mkdir(parents=True, exist_ok=True)
    results = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": str(data_path.relative_to(ROOT)) if data_path.is_relative_to(ROOT) else str(data_path),
        "sha256": hashlib.sha256(data_path.read_bytes()).hexdigest(),
        "versions": {"python": platform.python_version(), "numpy": np.__version__,
                     "pandas": pd.__version__, "scikit_learn": sklearn.__version__},
        "seed": SEED, "raw_shape": list(raw.shape), "clean_rows": len(data),
        "duplicate_rows_removed": len(raw) - len(raw.drop_duplicates()),
        "invalid_target_rows_removed": len(raw.drop_duplicates()) - len(data),
        "missing_by_column": raw.isna().sum().to_dict(),
        "class_counts": data["Attack Type"].value_counts().to_dict(),
        "features": FEATURES, "excluded_columns": [c for c in raw if c not in FEATURES],
        "split_sizes": {k: len(v) for k, v in splits.items()},
        "classification": {}, "regression": {}, "clustering": {},
    }
    (artifacts / "split_indices.json").write_text(json.dumps(splits), encoding="utf-8")
    X = data[FEATURES]
    classifiers = {
        "Dummy majority baseline": DummyClassifier(strategy="most_frequent"),
        "L6 Logistic regression": LogisticRegression(max_iter=1000, random_state=SEED),
        "L7 KNN": KNeighborsClassifier(n_neighbors=15, n_jobs=1),
        "L8 Decision tree": DecisionTreeClassifier(max_depth=8, min_samples_leaf=20, random_state=SEED),
        "L8 Random forest": RandomForestClassifier(n_estimators=100, max_depth=12, min_samples_leaf=5, random_state=SEED, n_jobs=1),
        "L9 Gaussian naive Bayes": GaussianNB(),
        "L10 Neural network": MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=200,
                                             early_stopping=True, validation_fraction=0.1,
                                             n_iter_no_change=15, random_state=SEED),
        "L11 Linear SVM": CalibratedClassifierCV(
            LinearSVC(C=1.0, dual=False, max_iter=5000, random_state=SEED), cv=3, n_jobs=1),
    }
    regressors = {
        "Dummy mean baseline": DummyRegressor(strategy="mean"),
        "L3 Linear regression": LinearRegression(),
        "L3 Ridge regression": Ridge(alpha=1.0),
        "L3 Decision tree regression": DecisionTreeRegressor(max_depth=8, min_samples_leaf=20, random_state=SEED),
    }
    for task, candidates, target in [("classification", classifiers, "Attack Type"),
                                      ("regression", regressors, "Anomaly Scores")]:
        y = data[target]
        for index, (name, model) in enumerate(candidates.items()):
            print(f"Training {name} ({len(train)} rows)...", flush=True)
            fitted = pipeline(model)
            tick = time.perf_counter()
            with warnings.catch_warnings(record=True) as captured:
                warnings.simplefilter("always", ConvergenceWarning)
                fitted.fit(X.loc[train], y.loc[train])
            entry = {"fit_seconds": time.perf_counter() - tick,
                     "parameters": json.loads(json.dumps(model.get_params(), default=str)),
                     "warnings": [str(w.message) for w in captured]}
            for split_name, indices in [("validation", val), ("test", test)]:
                pred = fitted.predict(X.loc[indices])
                if task == "classification":
                    entry[split_name] = classification_metrics(
                        y.loc[indices], pred, fitted.predict_proba(X.loc[indices]), fitted.classes_)
                else:
                    entry[split_name] = regression_metrics(y.loc[indices], pred)
            filename = f"{task}_{index}.joblib"
            joblib.dump(fitted, artifacts / filename)
            entry["artifact"] = str((artifacts / filename).relative_to(ROOT))
            if task == "classification" and hasattr(fitted.named_steps["model"], "n_iter_"):
                entry["iterations"] = np.asarray(fitted.named_steps["model"].n_iter_).tolist()
            results[task][name] = entry
            print(f"  Test: {entry['test'] if task == 'regression' else {k: entry['test'][k] for k in ['accuracy', 'macro_f1', 'log_loss']}}", flush=True)
        if task == "classification":
            selected = max(candidates, key=lambda n: results[task][n]["validation"]["macro_f1"])
        else:
            selected = min(candidates, key=lambda n: results[task][n]["validation"]["rmse"])
        results[f"selected_{task}"] = selected

    preprocessor = build_preprocessing_pipeline()
    z_train = preprocessor.fit_transform(X.loc[train])
    z_val = preprocessor.transform(X.loc[val])
    z_test = preprocessor.transform(X.loc[test])
    for k in range(2, 7):
        print(f"Training L4-5 KMeans k={k}...", flush=True)
        model = KMeans(n_clusters=k, n_init=10, random_state=SEED)
        model.fit(z_train)
        labels = model.predict(z_val)
        results["clustering"][str(k)] = {
            "validation_silhouette": silhouette_score(z_val, labels, sample_size=2000, random_state=SEED),
            "train_inertia": model.inertia_, "iterations": int(model.n_iter_),
        }
        joblib.dump(Pipeline([("preprocessor", preprocessor), ("model", model)]), artifacts / f"clustering_k{k}.joblib")
    chosen_k = max(results["clustering"], key=lambda k: results["clustering"][k]["validation_silhouette"])
    chosen = joblib.load(artifacts / f"clustering_k{chosen_k}.joblib")
    labels = chosen.named_steps["model"].predict(z_test)
    results["selected_clustering_k"] = int(chosen_k)
    results["clustering_test"] = {
        "silhouette": silhouette_score(z_test, labels, sample_size=2000, random_state=SEED),
        "davies_bouldin": davies_bouldin_score(z_test, labels),
        "adjusted_rand_vs_attack_type": adjusted_rand_score(data.loc[test, "Attack Type"], labels),
        "normalized_mutual_information_vs_attack_type": normalized_mutual_info_score(data.loc[test, "Attack Type"], labels),
        "cluster_sizes": {str(k): int(v) for k, v in zip(*np.unique(labels, return_counts=True))},
        "cluster_feature_means": data.loc[test, PREDICTIVE_NUMERIC_FEATURES].assign(cluster=labels).groupby("cluster").mean().to_dict(orient="index"),
        "cluster_attack_counts": pd.crosstab(pd.Series(labels, name="cluster"), pd.Series(data.loc[test, "Attack Type"].to_numpy(), name="attack_type")).to_dict(orient="index"),
    }
    results["encoded_features"] = preprocessor.get_feature_names_out().tolist()
    results["elapsed_seconds"] = time.perf_counter() - started
    reports = ROOT / "ml/reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "course_experiments.json").write_text(json.dumps(results, indent=2, allow_nan=False), encoding="utf-8")
    write_report(results)
    print("Saved docs/ml_training_report.txt and ml/reports/course_experiments.json", flush=True)


def write_report(r):
    lines = [
        "CYBERSECURITY MACHINE LEARNING REPORT: L3-L11", "=" * 65,
        f"Generated (UTC): {r['generated_utc']}", f"Dataset: {r['dataset']}",
        f"Dataset SHA256: {r['sha256']}", f"Software versions: {r['versions']}",
        "", "1. PURPOSE AND DATA", 
        "L3: regression; L4-5: clustering; L6: classification; L7: KNN;",
        "L8: trees; L9: probability (Gaussian naive Bayes); L10: neural network; L11: SVM.",
        "The requested 'datasheet' folder is absent; the existing dataset folder is used.",
        f"Raw shape: {r['raw_shape']}; usable rows: {r['clean_rows']}.",
        f"Exact duplicate rows removed: {r['duplicate_rows_removed']}; invalid target rows removed: {r['invalid_target_rows_removed']}.",
        f"Attack Type distribution: {r['class_counts']}",
        "Classification target: Attack Type (DDoS, Intrusion, Malware).",
        "Regression target: Anomaly Scores (continuous observed score, not a verified risk probability).",
        "Clustering: group traffic without using either target as an input.",
        "", "2. PREPROCESSING AND EVALUATION DESIGN",
        f"Inputs: {', '.join(r['features'])}.",
        "Strip categorical whitespace; coerce invalid numeric values and infinity to missing;",
        "remove exact duplicate records and rows missing either target before splitting.",
        "Numeric: median imputation then standard scaling. Categorical: mode imputation",
        "then dense one-hot encoding; unseen categories are ignored at inference.",
        "Each pipeline fits its imputation, scaling and encoding on training rows only.",
        f"Excluded input columns: {', '.join(r['excluded_columns'])}.",
        "Exclusions avoid post-event indicators, targets, identity fields, and unstructured text.",
        f"70/15/15 random split stratified by Attack Type; seed={r['seed']}; counts={r['split_sizes']}.",
        "All models use the same rows. Model settings are predefined; there is no supervised",
        "hyperparameter search. Select models by validation macro-F1 / RMSE, including baselines.",
        "The test set is used for final comparison only, never for fitting or selection.",
        "MLP additionally uses 10% of training rows internally for early stopping.",
        "Linear SVM probabilities use 3-fold sigmoid calibration within training rows. They are not",
        "independently validated real-world risk estimates. Log loss evaluates class probabilities.",
        f"Encoded feature count: {len(r['encoded_features'])}.",
        "Missing values in the original CSV:",
    ]
    lines += [f"  {col}: {count}" for col, count in r["missing_by_column"].items()]
    lines += ["", "3. L6-L11 CLASSIFICATION RESULTS", "Model | Validation macro-F1 | Test accuracy | Test macro-F1 | Test log loss"]
    for name, e in r["classification"].items():
        v, t = e["validation"], e["test"]
        lines.append(f"{name} | {v['macro_f1']:.6f} | {t['accuracy']:.6f} | {t['macro_f1']:.6f} | {t['log_loss']:.6f}")
    lines += [f"Selected by validation macro-F1: {r['selected_classification']}",
              "Accuracy: fraction correct; macro-F1: equal weight per class; lower log loss is better.",
              "Logistic regression models linear class boundaries. KNN votes among 15 neighbors.",
              "Decision trees learn feature splits; random forest averages 100 randomized trees.",
              "Gaussian naive Bayes applies Bayes' rule with class-conditional Gaussian features",
              "and an independence assumption (approximate for one-hot features).",
              "The neural network uses two hidden layers (64, 32) with ReLU activations.",
              "Linear SVM learns a margin-based linear boundary (C=1), with 3-fold sigmoid calibration.",
              "The initial RBF SVM run was stopped after more than eight minutes without completing;",
              "it has no reported scores. Linear SVM was used for practical full-dataset training.",
              "The hard majority baseline assigns zero probability to other classes; its log loss",
              "is therefore very large after numerical clipping, even at baseline accuracy."]
    for name, e in r["classification"].items():
        t = e["test"]
        lines += ["", name, f"Fit time: {e['fit_seconds']:.3f}s; artifact: {e['artifact']}",
                  f"Parameters: {json.dumps(e['parameters'], sort_keys=True)}",
                  f"Confusion matrix: rows=true, columns=predicted; order={t['class_order']}"]
        lines += [f"  {row}" for row in t["confusion_matrix"]]
        lines.append("Class | Precision | Recall | F1 | Support")
        for label in t["class_order"]:
            c = t["per_class"][label]
            lines.append(f"{label} | {c['precision']:.6f} | {c['recall']:.6f} | {c['f1-score']:.6f} | {int(c['support'])}")
        lines.append(f"Training warnings: {e['warnings'] or 'None'}")
    lines += ["", "4. L3 REGRESSION RESULTS", "Model | Validation RMSE | Test MAE | Test RMSE | Test R2"]
    for name, e in r["regression"].items():
        v, t = e["validation"], e["test"]
        lines.append(f"{name} | {v['rmse']:.6f} | {t['mae']:.6f} | {t['rmse']:.6f} | {t['r2']:.6f}")
    lines += [f"Selected by validation RMSE: {r['selected_regression']}",
              "MAE/RMSE use anomaly-score units; lower is better. R2=0 is the test-mean reference;",
              "negative R2 means worse than predicting the test-set mean.",
              "Linear regression minimizes squared error; ridge adds L2 regularization (alpha=1).",
              "The regression tree uses max_depth=8 and min_samples_leaf=20.",
              "", "5. L4-5 CLUSTERING RESULTS",
              "KMeans fits training inputs with k=2..6, n_init=10. Choose k by validation silhouette.",
              "Silhouette uses a reproducible sample of up to 2,000 validation/test rows.",
              "k | Validation silhouette | Training inertia"]
    for k, e in r["clustering"].items():
        lines.append(f"{k} | {e['validation_silhouette']:.6f} | {e['train_inertia']:.6f}")
    lines += [f"Selected k: {r['selected_clustering_k']}", json.dumps(r["clustering_test"], indent=2),
              "Higher silhouette and lower Davies-Bouldin indicate better geometric separation.",
              "ARI/NMI compare clusters with attack labels only after fitting; those labels never",
              "drive clustering. ARI near zero indicates chance-level agreement.",
              "One-hot feature geometry affects clusters; geometric groups need not be attack groups.",
              "", "6. INTERPRETATION AND LIMITATIONS"]
    c = r["classification"][r["selected_classification"]]["test"]
    b = r["classification"]["Dummy majority baseline"]["test"]
    reg = r["regression"][r["selected_regression"]]["test"]
    rb = r["regression"]["Dummy mean baseline"]["test"]
    lines += [f"Validation-selected classifier test accuracy={c['accuracy']:.6f}, macro-F1={c['macro_f1']:.6f}.",
              f"Majority baseline test accuracy={b['accuracy']:.6f}, macro-F1={b['macro_f1']:.6f}.",
              f"Validation-selected regressor test RMSE={reg['rmse']:.6f}; mean baseline={rb['rmse']:.6f}.",
              "Small metric differences from a single split do not establish reliable improvement.",
              "Poor performance is a valid result: these inputs may contain little information about",
              "the labels. This experiment cannot establish the dataset's provenance or realism.",
              "Only three attack classes occur; no benign class is available. These models classify",
              "among known attack categories and cannot establish attack-versus-benign detection.",
              "A random split measures within-dataset generalization, not future deployment or transfer",
              "to other networks. No temporal/group holdout or confidence intervals were evaluated.",
              "The seven-feature baseline intentionally omits text/identity and event-response fields.",
              "Results apply to this feature policy and model settings, not all possible predictors.",
              "These results are measured by this script. Existing docs/evaluation.md contains other",
              "claims which this experiment does not reproduce or validate.",
              "", "7. REPRODUCTION AND OUTPUTS",
              "Run from the project root: python ml/src/course_experiments.py",
              "Optional input: --data path/to/cybersecurity_attacks.csv",
              "Install dependencies: python -m pip install -r ml/requirements.txt",
              "Detailed metrics, estimator parameters and versions: ml/reports/course_experiments.json",
              "Fitted preprocessing + estimator pipelines: ml/artifacts/course/*.joblib",
              "Original CSV row indices for all partitions: ml/artifacts/course/split_indices.json",
              "Models are fitted on training rows only; no production service is changed by this run.",
              f"Total execution time: {r['elapsed_seconds']:.3f} seconds."]
    (ROOT / "docs").mkdir(exist_ok=True)
    (ROOT / "docs/ml_training_report.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    default = ROOT / "datasheet/cybersecurity_attacks.csv"
    if not default.exists():
        default = ROOT / "dataset/cybersecurity_attacks.csv"
    parser.add_argument("--data", type=Path, default=default)
    args = parser.parse_args()
    with threadpool_limits(limits=2):
        run(args.data.resolve())
