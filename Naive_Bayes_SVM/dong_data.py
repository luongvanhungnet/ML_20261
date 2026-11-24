"""Download, prepare, and split tabular network records for D.O.N.G."""

import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.request import Request, urlopen

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split


LABEL = "label"
CLASSES = ("DDoS", "Malware", "Intrusion")
DATASETS = ("incribo", "cicids2017")
SPLIT_RATIOS = {"train": 0.7, "validation": 0.1, "test": 0.2}
SYNTHETIC_URL = (
    "https://raw.githubusercontent.com/incribo-inc/cybersecurity_attacks/"
    "37f147e47d8772ae7fdd6713b25ea33395e0ddc3/cybersecurity_attacks.csv"
)
CIC_URL = (
    "https://huggingface.co/datasets/c01dsnap/CIC-IDS2017/resolve/"
    "4e9edfa727f800b6f595bc2ee7420527156562b2/"
)
CIC_FILES = (
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
    "Friday-WorkingHours-Morning.pcap_ISCX.csv",
    "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv",
    "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv",
)
CIC_NUMERIC = (
    "Flow Duration", "Total Fwd Packets", "Total Backward Packets",
    "Total Length of Fwd Packets", "Total Length of Bwd Packets",
    "Fwd Packet Length Mean", "Bwd Packet Length Mean", "Flow IAT Mean",
)
SYNTHETIC_NUMERIC = ("Packet Length", "Hour", "Day of Week")
SYNTHETIC_CATEGORICAL = (
    "Protocol", "Packet Type", "Traffic Type", "Network Segment",
    "Source Port Group", "Destination Port Group", "OS", "Browser",
)


def _download(path, url):
    if path.is_file():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {path.name}", flush=True)
    temporary = None
    try:
        request = Request(url, headers={"User-Agent": "DONG-network-classifier/1.0"})
        with urlopen(request, timeout=90) as response, NamedTemporaryFile(
            dir=path.parent, suffix=".part", delete=False
        ) as output:
            temporary = Path(output.name)
            shutil.copyfileobj(response, output)
            length = response.headers.get("Content-Length")
            if length and output.tell() != int(length):
                raise OSError(f"Incomplete download of {path.name}")
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def fetch_data(dataset, data_dir):
    if dataset == "incribo":
        _download(data_dir / "incribo" / "cybersecurity_attacks.csv", SYNTHETIC_URL)
    elif dataset == "cicids2017":
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [
                pool.submit(_download, data_dir / "cicids2017" / name, CIC_URL + name)
                for name in CIC_FILES
            ]
            for future in futures:
                future.result()


def _port_group(port):
    port = pd.to_numeric(port, errors="coerce")
    return pd.cut(
        port, bins=[-1, 1023, 49151, 65535], labels=["well-known", "registered", "dynamic"]
    )


def _read_incribo(data_dir):
    required = {
        "Attack Type", "Timestamp", "Device Information", "Source Port", "Destination Port",
        "Packet Length", "Protocol", "Packet Type", "Traffic Type", "Network Segment",
    }
    path = data_dir / "incribo" / "cybersecurity_attacks.csv"
    frame = pd.read_csv(path, usecols=lambda column: column.strip() in required)
    frame.columns = frame.columns.str.strip()
    time = pd.to_datetime(frame.pop("Timestamp"), errors="coerce")
    device = frame.pop("Device Information")
    frame["Hour"] = time.dt.hour
    frame["Day of Week"] = time.dt.dayofweek
    for direction in ("Source", "Destination"):
        frame[f"{direction} Port Group"] = _port_group(frame.pop(f"{direction} Port"))
    frame["OS"] = device.str.extract(r"(Windows|Android|iPhone|iPad|Mac OS X|Linux|CrOS)", expand=False)
    frame["Browser"] = device.str.extract(r"(Edg|Edge|OPR|Opera|Chrome|CriOS|Firefox|FxiOS|MSIE|Trident|Safari)", expand=False)
    # Chromium user agents also contain Safari. Browser precedence matters for Edge/Opera.
    for token, browser in ((r"\b(?:Edg|Edge)/", "Edge"), (r"\b(?:OPR|Opera)/", "Opera")):
        frame.loc[device.str.contains(token, na=False), "Browser"] = browser
    frame[LABEL] = frame.pop("Attack Type").astype("string").str.strip()
    return frame, SYNTHETIC_NUMERIC, SYNTHETIC_CATEGORICAL


def _read_cic(data_dir):
    columns = {*CIC_NUMERIC, "Destination Port", "Label"}
    parts = []
    for filename in CIC_FILES:
        frame = pd.read_csv(
            data_dir / "cicids2017" / filename,
            usecols=lambda column: column.strip() in columns,
            encoding="latin-1",
        )
        frame.columns = frame.columns.str.strip()
        original = frame.pop("Label").astype("string").str.strip().str.casefold()
        frame[LABEL] = original.map({"ddos": "DDoS", "bot": "Malware", "infiltration": "Intrusion"})
        frame.loc[original.str.startswith("web attack", na=False), LABEL] = "Intrusion"
        frame = frame.dropna(subset=[LABEL])
        frame["Destination Port Group"] = _port_group(frame.pop("Destination Port"))
        parts.append(frame)
    return pd.concat(parts, ignore_index=True), CIC_NUMERIC, ("Destination Port Group",)


def prepare_data(dataset, data_dir, seed=42, *, full_data=False):
    reader = {"incribo": _read_incribo, "cicids2017": _read_cic}[dataset]
    raw, numeric, categorical = reader(Path(data_dir))
    features = [*numeric, *categorical]
    frame = raw.loc[raw[LABEL].isin(CLASSES), [*features, LABEL]].copy()
    for column in numeric:
        frame[column] = pd.to_numeric(frame[column], errors="coerce").replace([np.inf, -np.inf], np.nan)
    for column in categorical:
        frame[column] = frame[column].astype("string").str.strip().fillna("Unknown").replace("", "Unknown")
    counts_before = frame[LABEL].value_counts().reindex(CLASSES, fill_value=0)
    # Identical model inputs cannot land in different splits, even with conflicting labels.
    deduplicated = frame.drop_duplicates([*features, LABEL])
    frame = deduplicated.loc[~deduplicated.duplicated(features, keep=False)]
    counts_clean = frame[LABEL].value_counts().reindex(CLASSES, fill_value=0)
    cleaned_rows = len(frame)
    if counts_clean.min() < 15:
        raise ValueError(f"{dataset}: need at least 15 distinct rows per class after cleaning: {counts_clean.to_dict()}")
    if dataset == "cicids2017" and not full_data:
        frame = frame.groupby(LABEL).sample(n=min(50_000 // len(CLASSES), int(counts_clean.min())), random_state=seed)
    audit = {
        "mapped_class_counts": counts_before.to_dict(),
        "exact_duplicate_rows_removed": int(counts_before.sum()) - len(deduplicated),
        "conflicting_rows_removed_after_deduplication": len(deduplicated) - cleaned_rows,
        "class_counts_after_cleaning": counts_clean.to_dict(),
        "selected_class_counts": frame[LABEL].value_counts().reindex(CLASSES, fill_value=0).to_dict(),
        "numeric_features": list(numeric),
        "categorical_features": list(categorical),
    }
    return frame.reset_index(drop=True), numeric, categorical, audit


def load_splits(frame, seed=42):
    """Return a shared stratified 70/10/20 split of the prepared dataset."""
    test_fraction = SPLIT_RATIOS["test"]
    development, test = train_test_split(frame, test_size=test_fraction, stratify=frame[LABEL], random_state=seed)
    train, validation = train_test_split(
        development, test_size=SPLIT_RATIOS["validation"] / (1 - test_fraction),
        stratify=development[LABEL], random_state=seed,
    )
    return train, validation, test
