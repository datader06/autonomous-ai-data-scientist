from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
import shap

from app.services.storage import storage_service


class ExplanationService:
    def _to_python_scalar(self, value: Any) -> Any:
        return value.item() if isinstance(value, np.generic) else value

    def _normalize_shap_values(self, shap_values: Any, predicted_class_index: int | None = None) -> np.ndarray:
        if isinstance(shap_values, list):
            if predicted_class_index is not None and predicted_class_index < len(shap_values):
                return np.asarray(shap_values[predicted_class_index])
            stacked = np.stack([np.asarray(value) for value in shap_values], axis=2)
            return np.mean(np.abs(stacked), axis=2)

        array = np.asarray(shap_values)
        if array.ndim == 3:
            if predicted_class_index is not None and predicted_class_index < array.shape[2]:
                return array[:, :, predicted_class_index]
            return np.mean(np.abs(array), axis=2)
        return array

    def explain(self, dataset_id: str, row_index: int = 0) -> dict[str, Any]:
        metadata = storage_service.load_metadata(dataset_id)
        dataframe = storage_service.load_dataframe(dataset_id)
        preprocessor = storage_service.load_joblib(dataset_id, "preprocessor")
        model = storage_service.load_joblib(dataset_id, "model")
        label_encoder = storage_service.load_joblib(dataset_id, "label_encoder")

        feature_frame = dataframe.drop(columns=[metadata["target_column"]])
        target_series = dataframe[metadata["target_column"]]
        transformed_features = preprocessor.transform(feature_frame)
        feature_names = metadata["feature_names"]

        row_index = max(0, min(int(row_index), len(dataframe) - 1))
        row_slice = transformed_features[row_index : row_index + 1]
        prediction = model.predict(row_slice)[0]
        predicted_label: str | int | float = self._to_python_scalar(prediction)
        prediction_confidence: float | None = None
        if label_encoder is not None:
            predicted_label = label_encoder.inverse_transform([int(prediction)])[0]
            if hasattr(model, "predict_proba"):
                prediction_proba = model.predict_proba(row_slice)[0]
                prediction_confidence = round(float(np.max(prediction_proba)), 4)

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(transformed_features)

        predicted_class_index = int(prediction) if label_encoder is not None else None
        normalized_shap = self._normalize_shap_values(shap_values, predicted_class_index)
        importance_scores = np.mean(np.abs(normalized_shap), axis=0)
        ranked_indices = np.argsort(importance_scores)[::-1]

        feature_importance = [
            {
                "feature": feature_names[index],
                "importance": round(float(importance_scores[index]), 6),
            }
            for index in ranked_indices[:15]
        ]

        row_shap = normalized_shap[row_index]
        row_values = transformed_features[row_index]
        if hasattr(row_values, "toarray"):
            row_values = row_values.toarray().ravel()
        row_values = np.asarray(row_values).ravel()

        explanation_rank = np.argsort(np.abs(row_shap))[::-1]
        prediction_explanation = [
            {
                "feature": feature_names[index],
                "shap_value": round(float(row_shap[index]), 6),
                "feature_value": round(float(row_values[index]), 6),
            }
            for index in explanation_rank[:12]
        ]

        actual_label: str | int | float | None = target_series.iloc[row_index]
        if pd.isna(actual_label):
            actual_label = None
        else:
            actual_label = self._to_python_scalar(actual_label)

        return {
            "dataset_id": dataset_id,
            "selected_model": metadata["selected_model"],
            "target_column": metadata["target_column"],
            "row_index": row_index,
            "feature_importance": feature_importance,
            "prediction_explanation": prediction_explanation,
            "predicted_label": predicted_label,
            "prediction_confidence": prediction_confidence,
            "actual_label": actual_label,
        }


explanation_service = ExplanationService()
