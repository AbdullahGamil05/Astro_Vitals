"""Convert the scikit-learn sleep model artifacts into a numpy-only archive.

Run with scikit-learn installed:  python scripts/export_sleep_model.py
The serverless function only needs numpy to load and evaluate the archive.
"""
from __future__ import annotations

import warnings
from pathlib import Path

import joblib
import numpy as np

MODEL_DIR = Path(__file__).resolve().parents[1] / "src" / "model"


def main() -> None:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        scaler = joblib.load(MODEL_DIR / "scaler.joblib")
        pca = joblib.load(MODEL_DIR / "pca.joblib")
        forest = joblib.load(MODEL_DIR / "classifier.joblib")

    if pca.whiten:
        raise SystemExit("Whitened PCA is not supported by the numpy runtime")

    lefts, rights, features, thresholds, values, roots = [], [], [], [], [], []
    offset = 0
    for estimator in forest.estimators_:
        tree = estimator.tree_
        count = tree.node_count
        index = np.arange(count, dtype=np.int32)
        is_leaf = tree.children_left == -1
        left = np.where(is_leaf, index, tree.children_left) + offset
        right = np.where(is_leaf, index, tree.children_right) + offset
        value = tree.value[:, 0, :]
        value = value / value.sum(axis=1, keepdims=True)
        lefts.append(left.astype(np.int32))
        rights.append(right.astype(np.int32))
        features.append(np.where(is_leaf, 0, tree.feature).astype(np.int32))
        thresholds.append(tree.threshold.astype(np.float64))
        values.append(value.astype(np.float32))
        roots.append(offset)
        offset += count

    np.savez_compressed(
        MODEL_DIR / "sleep_model.npz",
        feature_names=np.asarray(scaler.feature_names_in_, dtype=str),
        scaler_mean=scaler.mean_.astype(np.float64),
        scaler_scale=scaler.scale_.astype(np.float64),
        pca_mean=pca.mean_.astype(np.float64),
        pca_components=pca.components_.astype(np.float64),
        classes=np.asarray(forest.classes_, dtype=np.int64),
        left=np.concatenate(lefts),
        right=np.concatenate(rights),
        feature=np.concatenate(features),
        threshold=np.concatenate(thresholds),
        value=np.concatenate(values),
        roots=np.asarray(roots, dtype=np.int32),
    )


if __name__ == "__main__":
    main()
