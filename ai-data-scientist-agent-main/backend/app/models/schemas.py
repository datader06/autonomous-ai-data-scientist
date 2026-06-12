from typing import Any

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    dataset_id: str
    filename: str
    rows: int
    columns: list[str]
    preview: list[dict[str, Any]]


class TrainRequest(BaseModel):
    dataset_id: str
    target_column: str | None = None


class EDASummary(BaseModel):
    row_count: int
    column_count: int
    numeric_columns: list[str]
    categorical_columns: list[str]
    missing_values: dict[str, int]
    target_distribution: dict[str, int] | None = None
    numeric_summary: dict[str, dict[str, float | None]]


class TrainResponse(BaseModel):
    dataset_id: str
    target_column: str
    task_type: str
    selected_model: str
    accuracy: float
    metric_name: str
    metrics_by_model: dict[str, float]
    cv_metrics_by_model: dict[str, float]
    feature_names: list[str]
    excluded_columns: list[str] = []
    eda: EDASummary


class ExplainResponse(BaseModel):
    dataset_id: str
    selected_model: str
    target_column: str
    row_index: int
    feature_importance: list[dict[str, float | str]]
    prediction_explanation: list[dict[str, Any]]
    predicted_label: str | float | int
    prediction_confidence: float | None = None
    actual_label: str | float | int | None = None


class ChatRequest(BaseModel):
    dataset_id: str
    question: str = Field(min_length=3)


class ChatResponse(BaseModel):
    dataset_id: str
    answer: str
    sources: list[str]
