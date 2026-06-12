import json
import uuid
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.core.config import ARTIFACT_DIR, UPLOAD_DIR


class StorageService:
    """Persists datasets and model artifacts on disk by dataset ID."""

    def create_dataset_id(self) -> str:
        return uuid.uuid4().hex

    def dataset_path(self, dataset_id: str) -> Path:
        return UPLOAD_DIR / f"{dataset_id}.csv"

    def artifact_path(self, dataset_id: str) -> Path:
        path = ARTIFACT_DIR / dataset_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def save_upload(self, dataset_id: str, dataframe: pd.DataFrame) -> Path:
        path = self.dataset_path(dataset_id)
        dataframe.to_csv(path, index=False)
        return path

    def load_dataframe(self, dataset_id: str) -> pd.DataFrame:
        path = self.dataset_path(dataset_id)
        if not path.exists():
            raise FileNotFoundError(f"Dataset '{dataset_id}' not found")
        return pd.read_csv(path)

    def save_metadata(self, dataset_id: str, payload: dict[str, Any]) -> Path:
        metadata_path = self.artifact_path(dataset_id) / "metadata.json"
        metadata_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return metadata_path

    def load_metadata(self, dataset_id: str) -> dict[str, Any]:
        metadata_path = self.artifact_path(dataset_id) / "metadata.json"
        if not metadata_path.exists():
            raise FileNotFoundError(f"No training metadata found for dataset '{dataset_id}'")
        return json.loads(metadata_path.read_text(encoding="utf-8"))

    def save_joblib(self, dataset_id: str, name: str, payload: Any) -> Path:
        output_path = self.artifact_path(dataset_id) / f"{name}.joblib"
        joblib.dump(payload, output_path)
        return output_path

    def load_joblib(self, dataset_id: str, name: str) -> Any:
        artifact_file = self.artifact_path(dataset_id) / f"{name}.joblib"
        if not artifact_file.exists():
            raise FileNotFoundError(f"Artifact '{name}' missing for dataset '{dataset_id}'")
        return joblib.load(artifact_file)


storage_service = StorageService()
