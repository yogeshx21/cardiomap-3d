# backend/data.py
from pathlib import Path
import json
import numpy as np
import pandas as pd

# Excel file ka path
DATA_PATH = Path("data/dataset.xlsx")

# Dataset ke target columns (lowercase, bina space ke)
TARGET_KEYS = {"CAD": "cath", "LAD": "lad", "LCX": "lcx", "RCA": "rca"}


def read_raw(path: Path = DATA_PATH) -> pd.DataFrame:
    if path.suffix.lower() in (".xlsx", ".xls"):
        df = pd.read_excel(path)
    else:
        df = pd.read_csv(path)
    df.columns = [str(c).strip() for c in df.columns]
    return df


def _norm(name: str) -> str:
    return name.lower().replace(" ", "")


def _binarize_target(s: pd.Series) -> pd.Series:
    """Target ko 0/1 banata hai. 1 = disease/stenosis present."""
    if pd.api.types.is_numeric_dtype(s):
        return (s > 0).astype(int)
    negatives = {"normal", "n", "no", "0", "none", "false"}
    return (~s.astype(str).str.strip().str.lower().isin(negatives)).astype(int)


def _encode_binary(s: pd.Series) -> pd.Series:
    """2-value text column ko 0/1 mein (Y/N, Male/Fmale etc)."""
    low = s.astype(str).str.strip().str.lower().where(s.notna())
    uniq = sorted(low.dropna().unique())
    positive_words = ["y", "yes", "male", "cad", "stenotic", "present", "abnormal"]
    pos = next((u for u in uniq if u in positive_words), uniq[-1])
    return (low == pos).astype(float).where(low.notna())


def prepare(path: Path = DATA_PATH):
    """
    Returns:
        X       : features (leakage-free, numeric)
        targets : dict {"CAD": y, "LAD": y, "LCX": y, "RCA": y}
        leak    : list of columns jo X se hataye gaye
    """
    df = read_raw(path)

    # 1) Targets nikalo
    targets = {}
    for label, key in TARGET_KEYS.items():
        col = next((c for c in df.columns if _norm(c) == key), None)
        if col is None:
            print(f"[WARN] '{label}' ka column nahi mila (dhoondha: {key})")
            continue
        targets[label] = _binarize_target(df[col])

    # 2) LEAKAGE: target columns ko features se hata do
    leak = [c for c in df.columns if _norm(c) in TARGET_KEYS.values()]
    X = df.drop(columns=leak).copy()

    # 3) Text columns encode karo
    obj_cols = X.select_dtypes(include="object").columns.tolist()
    multi_cols = []
    for c in obj_cols:
        X[c] = X[c].astype(str).str.strip().where(X[c].notna())
        if X[c].dropna().nunique() <= 2:
            X[c] = _encode_binary(X[c])
        else:
            multi_cols.append(c)  # jaise VHD, BBB: one-hot honge

    if multi_cols:
        X = pd.get_dummies(X, columns=multi_cols, dtype=int)

    X = X.apply(pd.to_numeric, errors="coerce").astype(float)

    # 4) Constant columns hata do (koi info nahi dete)
    const = [c for c in X.columns if X[c].nunique(dropna=True) <= 1]
    X = X.drop(columns=const)

    # Safety check: leakage nahi hona chahiye
    assert not any(_norm(c) in TARGET_KEYS.values() for c in X.columns), "LEAKAGE!"

    return X, targets, leak


def save_feature_list(X: pd.DataFrame, out="backend/models/feature_columns.json"):
    """Day 2/3 ke liye feature order save karo."""
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        json.dump(list(X.columns), f, indent=2)