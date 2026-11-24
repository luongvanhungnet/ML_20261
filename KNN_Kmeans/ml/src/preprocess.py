import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

PREDICTIVE_NUMERIC_FEATURES = [
    "Packet Length",
    "Source Port",
    "Destination Port"
]

PREDICTIVE_CATEGORICAL_FEATURES = [
    "Protocol",
    "Packet Type",
    "Traffic Type",
    "Network Segment"
]

TARGET_COLUMN = "Attack Type"

# Columns deliberately excluded from baseline feature set to prevent target leakage
EXCLUDED_LEAKAGE_COLUMNS = [
    "Attack Signature",
    "Action Taken",
    "Severity Level",
    "Alerts/Warnings",
    "IDS/IPS Alerts",
    "Firewall Logs",
    "Payload Data",
    "Malware Indicators",
    "Anomaly Scores"
]

def build_preprocessing_pipeline() -> ColumnTransformer:
    numeric_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, PREDICTIVE_NUMERIC_FEATURES),
            ("cat", categorical_transformer, PREDICTIVE_CATEGORICAL_FEATURES)
        ],
        remainder="drop"
    )

    return preprocessor

def load_and_clean_data(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    # Filter only rows with valid attack type
    df = df.dropna(subset=[TARGET_COLUMN])
    return df
