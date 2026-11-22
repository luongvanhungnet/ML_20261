import os
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score
from sklearn.pipeline import Pipeline
from preprocess import (
    build_preprocessing_pipeline, load_and_clean_data,
    PREDICTIVE_NUMERIC_FEATURES, PREDICTIVE_CATEGORICAL_FEATURES, TARGET_COLUMN
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_PATH = BASE_DIR / "dataset" / "cybersecurity_attacks.csv"
REPORTS_DIR = BASE_DIR / "ml" / "reports"
ARTIFACTS_DIR = BASE_DIR / "ml" / "artifacts"

def run_experiment():
    print(f"Loading data from {DATASET_PATH}...")
    if not DATASET_PATH.exists():
        print("Dataset not found!")
        return

    df = load_and_clean_data(str(DATASET_PATH))
    feature_cols = PREDICTIVE_NUMERIC_FEATURES + PREDICTIVE_CATEGORICAL_FEATURES
    X = df[feature_cols]
    y = df[TARGET_COLUMN]

    # 70% Train, 15% Validation, 15% Test split (stratified)
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.17647, random_state=42, stratify=y_train_val
    )

    print(f"Train size: {len(X_train)}, Val size: {len(X_val)}, Test size: {len(X_test)}")

    preprocessor = build_preprocessing_pipeline()

    candidates = {
        "Dummy": DummyClassifier(strategy="most_frequent"),
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    }

    results = {}
    for name, model in candidates.items():
        print(f"Training {name}...")
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("classifier", model)
        ])
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        macro_f1 = f1_score(y_test, y_pred, average="macro")
        report = classification_report(y_test, y_pred, output_dict=True)
        cm = confusion_matrix(y_test, y_pred).tolist()

        results[name] = {
            "accuracy": round(acc, 4),
            "macro_f1": round(macro_f1, 4),
            "confusion_matrix": cm,
            "report": report
        }
        print(f"  {name} -> Accuracy: {acc:.4f}, Macro-F1: {macro_f1:.4f}")

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORTS_DIR / "evaluation_report.json"
    with open(report_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Evaluation report saved to {report_file}")

if __name__ == "__main__":
    run_experiment()
