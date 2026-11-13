from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

MODEL_PATH = Path(__file__).resolve().parent / "sleep_model.npz"


class _SleepModel:
    """numpy-only evaluation of StandardScaler -> PCA -> ExtraTreesClassifier.

    Generated from the scikit-learn artifacts by scripts/export_sleep_model.py so the
    serverless function does not need scikit-learn or scipy.
    """

    def __init__(self, archive: Any) -> None:
        self.feature_names = [str(name) for name in archive["feature_names"]]
        self.scaler_mean = archive["scaler_mean"]
        self.scaler_scale = archive["scaler_scale"]
        self.pca_mean = archive["pca_mean"]
        self.pca_components = archive["pca_components"]
        self.classes = archive["classes"]
        self.left = archive["left"]
        self.right = archive["right"]
        self.feature = archive["feature"]
        self.threshold = archive["threshold"]
        self.value = archive["value"]
        self.roots = archive["roots"]

    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        scaled = (features - self.scaler_mean) / self.scaler_scale
        projected = ((scaled - self.pca_mean) @ self.pca_components.T).astype(np.float32)
        nodes = self.roots.copy()
        while True:
            go_left = projected[self.feature[nodes]] <= self.threshold[nodes]
            next_nodes = np.where(go_left, self.left[nodes], self.right[nodes])
            if np.array_equal(next_nodes, nodes):
                break
            nodes = next_nodes
        return self.value[nodes].mean(axis=0, dtype=np.float64)


@lru_cache(maxsize=1)
def _load_model() -> _SleepModel:
    with np.load(MODEL_PATH, allow_pickle=False) as archive:
        return _SleepModel(archive)


def predict_features(features: Any) -> dict[str, Any]:
    if not isinstance(features, dict):
        raise ValueError("features must be an object of model input values")

    model = _load_model()
    feature_names = model.feature_names
    expected = set(feature_names)
    supplied = set(features)
    missing = expected - supplied
    extra = supplied - expected

    resting_missing = features.get("resting_hr_missing") == 1
    allowed_missing = {"resting_hr"} if resting_missing else set()
    if extra or missing - allowed_missing:
        raise ValueError("features must contain every model field exactly once")
    if resting_missing and features.get("resting_hr") is not None:
        raise ValueError("resting_hr must be null when resting_hr_missing is 1")
    if not resting_missing and "resting_hr" not in features:
        raise ValueError("resting_hr is required unless marked missing")

    values: list[float] = []
    for index, name in enumerate(feature_names):
        value = features.get(name)
        if value is None and name == "resting_hr" and resting_missing:
            values.append(float(model.scaler_mean[index]))
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not np.isfinite(value):
            raise ValueError(f"{name} must be a finite number")
        values.append(float(value))

    probabilities = model.predict_proba(np.asarray(values, dtype=np.float64))
    prediction = int(model.classes[int(np.argmax(probabilities))])

    return {
        "prediction": prediction,
        "probabilities": {str(int(label)): float(probability) for label, probability in zip(model.classes, probabilities)},
        "feature_count": len(feature_names),
        "model": "ExtraTreesClassifier + StandardScaler + PCA",
    }


def parse_payload(raw: bytes) -> dict[str, Any]:
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ValueError("request body must be valid JSON") from error
    if not isinstance(payload, dict):
        raise ValueError("request body must be a JSON object")
    return predict_features(payload.get("features"))
