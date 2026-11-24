"""Train and compare D.O.N.G. Naive Bayes and SVM models on labeled CSVs."""

import argparse
import json
from datetime import datetime
from pathlib import Path
from time import perf_counter

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.dummy import DummyClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    make_scorer,
    mean_squared_error,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split

from dong_data import CLASSES, DATASETS, LABEL, SPLIT_RATIOS, fetch_data, load_splits, prepare_data
from dong_models import ALGORITHMS, candidates


ROOT = Path(__file__).resolve().parent
CV_SEEDS = (42, 43, 44)
FOLDS = 5
MACRO_OPTIONS = {"average": "macro", "labels": CLASSES, "zero_division": 0}


def _features_and_labels(frame):
    return frame.drop(columns=LABEL), frame[LABEL]


def _one_hot_mse(y, predictions):
    labels = np.asarray(CLASSES)
    actual = np.asarray(y)[:, None] == labels
    predicted = np.asarray(predictions)[:, None] == labels
    return mean_squared_error(actual, predicted)


def _metrics(y, predictions):
    report = classification_report(y, predictions, labels=CLASSES, output_dict=True, zero_division=0)
    macro = report["macro avg"]
    return {
        "macro_f1": macro["f1-score"],
        "accuracy": report["accuracy"],
        "macro_precision": macro["precision"],
        "macro_recall": macro["recall"],
        "mse": _one_hot_mse(y, predictions),
    }, report


CV_SCORERS = {
    # Keep the existing *_test_score columns for the primary metric, Macro-F1.
    "score": make_scorer(f1_score, **MACRO_OPTIONS),
    "accuracy": "accuracy",
    "macro_precision": make_scorer(precision_score, **MACRO_OPTIONS),
    "macro_recall": make_scorer(recall_score, **MACRO_OPTIONS),
    "neg_mse": make_scorer(_one_hot_mse, greater_is_better=False),
}


def _tune(estimator, grid, frame, jobs):
    X, y = _features_and_labels(frame)
    splits = [
        split
        for seed in CV_SEEDS
        for split in StratifiedKFold(FOLDS, shuffle=True, random_state=seed).split(X, y)
    ]
    search = GridSearchCV(estimator, grid, scoring=CV_SCORERS, cv=splits, n_jobs=jobs, refit=False, error_score="raise")
    start = perf_counter()
    search.fit(X, y)
    elapsed = perf_counter() - start
    results = pd.DataFrame(search.cv_results_)
    # Export positive MSE values while preserving the ranking by lowest error.
    neg_mse_columns = [f"split{fold}_test_neg_mse" for fold in range(len(splits))] + ["mean_test_neg_mse"]
    results[neg_mse_columns] = -results[neg_mse_columns]
    results = results.rename(columns=lambda column: column.replace("neg_mse", "mse"))
    best_index = results["rank_test_score"].idxmin()
    best_params = results.at[best_index, "params"]
    summary = {
        "tuning_seconds": elapsed,
        "best_params": json.dumps(best_params, sort_keys=True),
    }
    for scorer in CV_SCORERS:
        score_key = scorer.removeprefix("neg_")
        metric = "macro_f1" if score_key == "score" else score_key
        seed_columns = []
        for repeat, seed in enumerate(CV_SEEDS):
            columns = [f"split{repeat * FOLDS + fold}_test_{score_key}" for fold in range(FOLDS)]
            seed_column = f"{metric}_seed_{seed}"
            results[seed_column] = results[columns].mean(axis=1)
            seed_columns.append(seed_column)
        std_column = "std_across_seeds" if metric == "macro_f1" else f"{metric}_std_across_seeds"
        results[std_column] = results[seed_columns].std(axis=1, ddof=1)
        summary[f"cv_{metric}_mean"] = results.at[best_index, f"mean_test_{score_key}"]
        summary[f"cv_{metric}_seed_std"] = results.at[best_index, std_column]
    return estimator.set_params(**best_params), summary, results


def _write_test_outputs(output, name, y, predictions, report):
    matrix = pd.DataFrame(confusion_matrix(y, predictions, labels=CLASSES), index=CLASSES, columns=CLASSES)
    matrix.to_csv(output / f"{name}_confusion.csv", index_label="actual / predicted")
    per_class = pd.DataFrame.from_dict({label: report[label] for label in CLASSES}, orient="index")
    per_class.to_csv(output / f"{name}_class_metrics.csv", index_label="label")
    return {f"recall_{label.lower()}": report[label]["recall"] for label in CLASSES}


def _evaluate(dataset, name, estimator, splits, output, *, validation_only, save_model, shuffled=False):
    train, validation, test = splits
    X_train, y_train = _features_and_labels(train)
    X_val, y_val = _features_and_labels(validation)
    rng = np.random.default_rng(CV_SEEDS[0])
    val_model = clone(estimator).fit(X_train, rng.permutation(y_train) if shuffled else y_train)
    result = {"dataset": dataset, "model": name}
    validation_metrics, _ = _metrics(y_val, val_model.predict(X_val))
    result.update({f"validation_{key}": value for key, value in validation_metrics.items()})
    if validation_only:
        return result, None

    X_dev, y_dev = _features_and_labels(pd.concat([train, validation]))
    X_test, y_test = _features_and_labels(test)
    fitted = clone(estimator)
    training_labels = rng.permutation(y_dev) if shuffled else y_dev
    start = perf_counter()
    fitted.fit(X_dev, training_labels)
    result["fit_seconds"] = perf_counter() - start
    start = perf_counter()
    predictions = fitted.predict(X_test)
    result["predict_seconds"] = perf_counter() - start
    test_metrics, test_report = _metrics(y_test, predictions)
    result.update({f"test_{key}": value for key, value in test_metrics.items()})
    result.update(_write_test_outputs(output, name, y_test, predictions, test_report))
    if save_model:
        joblib.dump(fitted, output / f"{name}.joblib", compress=3)
    return result, predictions


def _run_dataset(dataset, args):
    output = args.output_dir / dataset
    output.mkdir()
    print(f"\n[{dataset}] Preparing data", flush=True)
    frame, numeric, categorical, audit = prepare_data(
        dataset, args.data_dir, CV_SEEDS[0], full_data=args.full_data
    )
    splits = load_splits(frame, seed=CV_SEEDS[0])
    train, validation, test = splits
    tuning = train
    if args.tune_rows and len(train) > args.tune_rows:
        tuning, _ = train_test_split(train, train_size=args.tune_rows, stratify=train[LABEL], random_state=CV_SEEDS[0])
    if tuning[LABEL].value_counts().reindex(CLASSES, fill_value=0).min() < FOLDS:
        raise ValueError("The tuning sample needs at least five rows of each class. Increase --tune-rows.")
    audit.update({
        "split_seed": CV_SEEDS[0], "cv_seeds": list(CV_SEEDS), "folds_per_seed": FOLDS,
        "split_ratios": SPLIT_RATIOS,
        "split_sizes": {"train": len(train), "validation": len(validation), "test": len(test), "tuning": len(tuning)},
        "sampling": "balanced" if dataset == "cicids2017" and not args.full_data else "all_cleaned",
        "validation_only": args.validation_only, "scikit_learn": sklearn.__version__,
    })
    (output / "data_audit.json").write_text(
        json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    configured = {}
    selected = candidates(numeric, categorical, CV_SEEDS[0], algorithm=args.algorithm)
    for name, (estimator, grid) in selected.items():
        print(f"[{dataset}] Tuning {name} on {len(tuning):,} training rows", flush=True)
        estimator, summary, cv_results = _tune(estimator, grid, tuning, args.jobs)
        cv_results.to_csv(output / f"{name}_cv.csv", index=False)
        configured[name] = (estimator, summary)

    models = {
        **configured,
        "majority": (DummyClassifier(strategy="most_frequent"), {}),
        "uniform": (DummyClassifier(strategy="uniform", random_state=CV_SEEDS[0]), {}),
    }
    if "linear_svm" in configured:
        models["shuffled_linear_svm"] = (configured["linear_svm"][0], {})
    predictions = pd.DataFrame({"row_id": test.index, "actual": test[LABEL].to_numpy()}) if not args.validation_only else None
    rows = []
    score_column = "validation_macro_f1" if args.validation_only else "test_macro_f1"
    for name, (estimator, summary) in models.items():
        print(f"[{dataset}] Evaluating {name}", flush=True)
        result, predicted = _evaluate(
            dataset, name, estimator, splits, output,
            validation_only=args.validation_only, save_model=name in configured,
            shuffled=name == "shuffled_linear_svm",
        )
        print(f"[{dataset}] {name} {score_column}={result[score_column]:.4f}", flush=True)
        rows.append({**result, **summary})
        if predictions is not None:
            predictions[name] = predicted
    if predictions is not None:
        predictions.to_csv(output / "predictions.csv", index=False)
    return rows


def main(*, algorithm=None, argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    if algorithm is None:
        parser.add_argument("--algorithm", choices=("all", *ALGORITHMS), default="all")
    else:
        parser.set_defaults(algorithm=algorithm)
    parser.add_argument("--dataset", choices=("all", *DATASETS), default="all")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data")
    parser.add_argument("--output-dir", type=Path, default=None, help="New experiment output directory")
    parser.add_argument("--full-data", action="store_true", help="Use all cleaned rows of the three target classes")
    parser.add_argument("--tune-rows", type=int, default=4_000, help="Maximum training rows used in CV (0 uses all training rows)")
    parser.add_argument("--jobs", type=int, default=1, help="Parallel CV workers")
    parser.add_argument("--local-data", action="store_true", help="Use cached or manually downloaded CSVs")
    parser.add_argument("--validation-only", action="store_true", help="Skip test evaluation and model persistence")
    args = parser.parse_args(argv)
    if (args.tune_rows != 0 and args.tune_rows < len(CLASSES) * FOLDS) or args.jobs < 1:
        parser.error("--tune-rows must be 0 or at least 15 and --jobs must be positive")
    if args.output_dir is None:
        args.output_dir = ROOT / "results" / datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    if args.output_dir.exists():
        parser.error(f"Output directory already exists: {args.output_dir}")
    datasets = DATASETS if args.dataset == "all" else (args.dataset,)
    if not args.local_data:
        for dataset in datasets:
            fetch_data(dataset, args.data_dir)
    args.output_dir.mkdir(parents=True)
    all_rows = []
    for dataset in datasets:
        all_rows.extend(_run_dataset(dataset, args))
    results = args.output_dir / "results.csv"
    pd.DataFrame(all_rows).to_csv(results, index=False)
    print(f"\nResults: {results}", flush=True)
    return results


if __name__ == "__main__":
    main()
