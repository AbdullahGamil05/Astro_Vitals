from __future__ import annotations

import json
import warnings
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np

MODEL_DIR = Path(__file__).resolve().parent


@lru_cache(maxsize=1)
def _load_models():
    # These artifacts are checked into this repository; only load the bundled files.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        scaler = joblib.load(MODEL_DIR / "scaler.joblib")
        pca = joblib.load(MODEL_DIR / "pca.joblib")
        classifier = joblib.load(MODEL_DIR / "classifier.joblib")
    return scaler, pca, classifier


def predict_features(features: Any) -> dict[str, Any]:
    if not isinstance(features, dict):
        raise ValueError("features must be an object of model input values")

    scaler, pca, classifier = _load_models()
    feature_names = [str(name) for name in scaler.feature_names_in_]
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
            values.append(float(scaler.mean_[index]))
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not np.isfinite(value):
            raise ValueError(f"{name} must be a finite number")
        values.append(float(value))

    row = np.asarray([values], dtype=np.float64)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        scaled = scaler.transform(row)
        projected = pca.transform(scaled)
        prediction = int(classifier.predict(projected)[0])
        probabilities = classifier.predict_proba(projected)[0]

    return {
        "prediction": prediction,
        "probabilities": {str(int(label)): float(probability) for label, probability in zip(classifier.classes_, probabilities)},
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
