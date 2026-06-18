import numpy as np
import pandas as pd


def safe_val(v):
    if v is None:
        return None
    if v is pd.NA:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        if v != v or v == float("inf") or v == float("-inf"):
            return None
        return v
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        if np.isnan(v) or np.isinf(v):
            return None
        return float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, (np.ndarray,)):
        return v.tolist()
    if hasattr(v, "item") and hasattr(v, "dtype"):
        return v.item()
    if pd.isna(v):
        return None
    return str(v)


def df_to_rows(df: pd.DataFrame) -> list:
    cols = list(df.columns)
    rows = []
    for _, row in df.iterrows():
        rows.append([safe_val(row[c]) for c in cols])
    return rows


def filter_insights(insights: dict) -> dict:
    filtered = {}
    for k, v in insights.items():
        if isinstance(v, float) or isinstance(v, int):
            if abs(v) < 10000 and v == int(v):
                filtered[k] = int(v)
            else:
                filtered[k] = round(v, 2)
        else:
            filtered[k] = v
    return filtered