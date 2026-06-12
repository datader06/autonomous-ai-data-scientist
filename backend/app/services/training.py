from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, mean_squared_error, r2_score
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from xgboost import XGBClassifier, XGBRegressor

from app.models.schemas import EDASummary
from app.services.storage import storage_service


COMMON_TARGET_NAMES = {
    "target",
    "label",
    "class",
    "outcome",
    "y",
    "response",
    "survived",
    "churn",
    "default",
    "diagnosis",
}


@dataclass
class TrainedArtifacts:
    selected_model_name: str
    task_type: str
    target_column: str
    feature_names: list[str]
    excluded_columns: list[str]
    metric_name: str
    primary_metric: float
    metrics_by_model: dict[str, float]
    cv_metrics_by_model: dict[str, float]
    eda: EDASummary


class TrainingService:
    IDENTIFIER_NAME_HINTS = (
        "id",
        "patient",
        "record",
        "sample",
        "member",
        "customer",
        "user",
        "account",
        "visit",
        "row",
        "index",
    )

    def infer_identifier_columns(self, dataframe: pd.DataFrame) -> list[str]:
        row_count = max(len(dataframe), 1)
        identifier_columns: list[str] = []
        for column in dataframe.columns:
            lowered = column.lower()
            series = dataframe[column]
            unique_ratio = series.nunique(dropna=False) / row_count
            if unique_ratio < 0.9:
                continue

            has_identifier_name = (
                lowered == "id"
                or lowered.endswith("_id")
                or lowered.endswith("id")
                or any(hint in lowered for hint in self.IDENTIFIER_NAME_HINTS)
            )
            is_text_identifier = pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series)
            is_numeric_identifier = pd.api.types.is_numeric_dtype(series) and series.dropna().is_unique

            if has_identifier_name or is_text_identifier or is_numeric_identifier:
                identifier_columns.append(column)
        return identifier_columns

    def infer_target(self, dataframe: pd.DataFrame) -> str:
        lowered = {column.lower(): column for column in dataframe.columns}
        for candidate in COMMON_TARGET_NAMES:
            if candidate in lowered:
                return lowered[candidate]
        return dataframe.columns[-1]

    def infer_task_type(self, target: pd.Series) -> str:
        non_null_target = target.dropna()
        if non_null_target.empty:
            return "classification"
        if non_null_target.dtype == object or str(non_null_target.dtype).startswith("category"):
            return "classification"
        unique_count = non_null_target.nunique()
        if unique_count <= min(20, max(2, math.ceil(len(non_null_target) * 0.1))):
            return "classification"
        return "regression"

    def build_cv_strategy(self, task_type: str, y_train: Any) -> tuple[Any, str]:
        if task_type == "classification":
            _, counts = np.unique(y_train, return_counts=True)
            min_class_count = int(counts.min()) if len(counts) else 0
            if min_class_count >= 2:
                n_splits = min(5, min_class_count)
                return StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42), "accuracy"
            return KFold(n_splits=2, shuffle=True, random_state=42), "accuracy"

        n_splits = max(2, min(5, len(y_train)))
        return KFold(n_splits=n_splits, shuffle=True, random_state=42), "r2"

    def build_eda_summary(self, dataframe: pd.DataFrame, target_column: str) -> EDASummary:
        numeric_columns = dataframe.select_dtypes(include=[np.number]).columns.tolist()
        categorical_columns = [column for column in dataframe.columns if column not in numeric_columns]
        missing_values = {
            column: int(value)
            for column, value in dataframe.isna().sum().sort_values(ascending=False).items()
            if int(value) > 0
        }
        numeric_summary: dict[str, dict[str, float | None]] = {}
        if numeric_columns:
            summary_df = dataframe[numeric_columns].describe().transpose().round(3).replace({np.nan: None})
            for column, stats in summary_df.iterrows():
                numeric_summary[column] = {key: (float(val) if val is not None else None) for key, val in stats.items()}

        target_distribution = None
        if target_column in dataframe.columns:
            value_counts = dataframe[target_column].fillna("<missing>").astype(str).value_counts().head(10)
            target_distribution = {label: int(count) for label, count in value_counts.items()}

        return EDASummary(
            row_count=int(dataframe.shape[0]),
            column_count=int(dataframe.shape[1]),
            numeric_columns=numeric_columns,
            categorical_columns=categorical_columns,
            missing_values=missing_values,
            target_distribution=target_distribution,
            numeric_summary=numeric_summary,
        )

    def train(self, dataset_id: str, target_column: str | None = None) -> TrainedArtifacts:
        dataframe = storage_service.load_dataframe(dataset_id)
        selected_target = target_column or self.infer_target(dataframe)
        if selected_target not in dataframe.columns:
            raise ValueError(f"Target column '{selected_target}' does not exist in dataset")

        dataframe = dataframe.copy()
        dataframe = dataframe.dropna(how="all")
        dataframe.columns = [column.strip() for column in dataframe.columns]
        selected_target = selected_target.strip()

        feature_frame = dataframe.drop(columns=[selected_target])
        identifier_columns = self.infer_identifier_columns(feature_frame)
        if identifier_columns:
            feature_frame = feature_frame.drop(columns=identifier_columns)
        target_series = dataframe[selected_target]
        if feature_frame.empty:
            raise ValueError("Dataset must include at least one feature column besides the target")

        task_type = self.infer_task_type(target_series)
        eda_summary = self.build_eda_summary(dataframe, selected_target)

        numeric_features = feature_frame.select_dtypes(include=[np.number]).columns.tolist()
        categorical_features = [column for column in feature_frame.columns if column not in numeric_features]

        transformers: list[tuple[str, Pipeline, list[str]]] = []
        if numeric_features:
            transformers.append(
                (
                    "numeric",
                    Pipeline(
                        steps=[
                            ("imputer", SimpleImputer(strategy="median")),
                        ]
                    ),
                    numeric_features,
                )
            )
        if categorical_features:
            transformers.append(
                (
                    "categorical",
                    Pipeline(
                        steps=[
                            ("imputer", SimpleImputer(strategy="most_frequent")),
                            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                        ]
                    ),
                    categorical_features,
                )
            )

        preprocessor = ColumnTransformer(
            transformers=transformers,
            remainder="drop",
            sparse_threshold=0.0,
        )

        label_encoder: LabelEncoder | None = None
        y = target_series
        stratify = None
        if task_type == "classification":
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(target_series.fillna("<missing>").astype(str))
            if len(np.unique(y)) > 1:
                stratify = y
        else:
            y = target_series.fillna(target_series.median())

        test_size = 0.2 if len(feature_frame) >= 20 else max(1, int(round(len(feature_frame) * 0.2)))
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                feature_frame,
                y,
                test_size=test_size,
                random_state=42,
                stratify=stratify,
            )
        except ValueError:
            X_train, X_test, y_train, y_test = train_test_split(
                feature_frame,
                y,
                test_size=test_size,
                random_state=42,
                stratify=None,
            )

        X_train_processed = preprocessor.fit_transform(X_train)
        X_test_processed = preprocessor.transform(X_test)
        feature_names = preprocessor.get_feature_names_out().tolist()

        if task_type == "classification":
            models: dict[str, Any] = {
                "RandomForestClassifier": RandomForestClassifier(
                    n_estimators=300,
                    random_state=42,
                    class_weight="balanced",
                ),
                "XGBClassifier": XGBClassifier(
                    n_estimators=300,
                    max_depth=6,
                    learning_rate=0.05,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    random_state=42,
                    eval_metric="mlogloss",
                ),
            }
        else:
            models = {
                "RandomForestRegressor": RandomForestRegressor(
                    n_estimators=300,
                    random_state=42,
                ),
                "XGBRegressor": XGBRegressor(
                    n_estimators=300,
                    max_depth=6,
                    learning_rate=0.05,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    random_state=42,
                ),
            }

        scores: dict[str, float] = {}
        cv_scores: dict[str, float] = {}
        best_model_name = ""
        best_model = None
        best_score = -np.inf
        metric_name = "accuracy"
        cv_strategy, scoring_name = self.build_cv_strategy(task_type, y_train)

        for model_name, model in models.items():
            cv_pipeline = Pipeline(
                steps=[
                    ("preprocessor", clone(preprocessor)),
                    ("model", clone(model)),
                ]
            )
            model_cv_scores = cross_val_score(
                cv_pipeline,
                X_train,
                y_train,
                cv=cv_strategy,
                scoring=scoring_name,
                error_score="raise",
            )
            mean_cv_score = float(np.mean(model_cv_scores))
            cv_scores[model_name] = round(mean_cv_score, 4)

            model.fit(X_train_processed, y_train)
            predictions = model.predict(X_test_processed)
            if task_type == "classification":
                score = float(accuracy_score(y_test, predictions))
            else:
                metric_name = "r2"
                score = float(r2_score(y_test, predictions))
            scores[model_name] = round(score, 4)
            if mean_cv_score > best_score or (math.isclose(mean_cv_score, best_score) and score > scores.get(best_model_name, -np.inf)):
                best_score = mean_cv_score
                best_model_name = model_name
                best_model = model

        metadata = {
            "dataset_id": dataset_id,
            "target_column": selected_target,
            "task_type": task_type,
            "selected_model": best_model_name,
            "metric_name": metric_name,
            "primary_metric": scores[best_model_name],
            "metrics_by_model": scores,
            "cv_metrics_by_model": cv_scores,
            "feature_names": feature_names,
            "excluded_identifier_columns": identifier_columns,
            "numeric_features": numeric_features,
            "categorical_features": categorical_features,
            "row_count": int(dataframe.shape[0]),
            "column_count": int(dataframe.shape[1]),
            "test_indices": [int(index) for index in X_test.index.tolist()],
        }

        if task_type == "regression":
            predictions = best_model.predict(X_test_processed)
            metadata["rmse"] = round(float(math.sqrt(mean_squared_error(y_test, predictions))), 4)

        storage_service.save_metadata(dataset_id, metadata)
        storage_service.save_joblib(dataset_id, "preprocessor", preprocessor)
        storage_service.save_joblib(dataset_id, "model", best_model)
        storage_service.save_joblib(dataset_id, "label_encoder", label_encoder)

        return TrainedArtifacts(
            selected_model_name=best_model_name,
            task_type=task_type,
            target_column=selected_target,
            feature_names=feature_names,
            excluded_columns=identifier_columns,
            metric_name=metric_name,
            primary_metric=scores[best_model_name],
            metrics_by_model=scores,
            cv_metrics_by_model=cv_scores,
            eda=eda_summary,
        )


training_service = TrainingService()
