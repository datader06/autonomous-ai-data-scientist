from io import BytesIO

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.models.schemas import ChatRequest, ChatResponse, ExplainResponse, TrainRequest, TrainResponse, UploadResponse
from app.services.chat import chat_service
from app.services.explanations import explanation_service
from app.services.storage import storage_service
from app.services.training import training_service

router = APIRouter()


def parse_uploaded_csv(payload: bytes) -> pd.DataFrame:
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
    parsing_errors: list[str] = []

    for encoding in encodings:
        try:
            return pd.read_csv(BytesIO(payload), encoding=encoding, sep=None, engine="python")
        except Exception as exc:
            parsing_errors.append(f"{encoding}: {exc}")

    raise ValueError(" ; ".join(parsing_errors))


@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV uploads are supported")

    payload = await file.read()
    try:
        dataframe = parse_uploaded_csv(payload)
    except Exception as exc:  # pragma: no cover - defensive error handling
        raise HTTPException(status_code=400, detail=f"Unable to read CSV: {exc}") from exc

    if dataframe.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty")

    dataset_id = storage_service.create_dataset_id()
    storage_service.save_upload(dataset_id, dataframe)

    return UploadResponse(
        dataset_id=dataset_id,
        filename=file.filename,
        rows=int(dataframe.shape[0]),
        columns=dataframe.columns.tolist(),
        preview=dataframe.head(5).fillna("<missing>").to_dict(orient="records"),
    )


@router.post("/train", response_model=TrainResponse)
def train_model(request: TrainRequest) -> TrainResponse:
    try:
        result = training_service.train(request.dataset_id, request.target_column)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return TrainResponse(
        dataset_id=request.dataset_id,
        target_column=result.target_column,
        task_type=result.task_type,
        selected_model=result.selected_model_name,
        accuracy=result.primary_metric,
        metric_name=result.metric_name,
        metrics_by_model=result.metrics_by_model,
        cv_metrics_by_model=result.cv_metrics_by_model,
        feature_names=result.feature_names,
        excluded_columns=result.excluded_columns,
        eda=result.eda,
    )


@router.get("/explain", response_model=ExplainResponse)
def explain_prediction(dataset_id: str = Query(...), row_index: int = Query(0, ge=0)) -> ExplainResponse:
    try:
        result = explanation_service.explain(dataset_id, row_index)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ExplainResponse(**result)


@router.post("/chat", response_model=ChatResponse)
def chat_with_dataset(request: ChatRequest) -> ChatResponse:
    try:
        result = chat_service.answer(request.dataset_id, request.question)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - protects API surface from provider errors
        raise HTTPException(status_code=500, detail=f"Dataset chat failed: {exc}") from exc

    return ChatResponse(**result)
