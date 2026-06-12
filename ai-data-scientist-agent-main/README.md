# Autonomous AI Data Scientist

A production-style full-stack app that lets a user upload a CSV dataset and run an autonomous analysis flow:

- exploratory data analysis (EDA)
- model selection between Random Forest and XGBoost
- training and evaluation
- SHAP-based explainability
- dataset chat with FAISS + OpenAI via LangChain

## Stack

- Frontend: React + Vite + Tailwind CSS + Recharts
- Backend: FastAPI + Pandas + scikit-learn + XGBoost + SHAP + FAISS + LangChain
- Communication: REST API

## Project structure

```text
backend/
  app/
    api/
    core/
    models/
    services/
  data/
  requirements.txt
frontend/
  src/
sample_data/
  customer_churn.csv
```

## Features

### Backend endpoints

- `POST /upload`
  - accepts a CSV file
  - stores it under a generated dataset ID
  - returns preview rows and columns
- `POST /train`
  - auto-detects the target column if not provided
  - drops identifier-style columns like `customer_id`
  - imputes missing values and one-hot encodes categorical features
  - trains Random Forest and XGBoost
  - returns the selected model, score, transformed feature names, and EDA summary
- `GET /explain`
  - computes SHAP feature importance
  - returns global importance and a per-row explanation
- `POST /chat`
  - builds a FAISS vector index from dataset content
  - uses OpenAI embeddings + chat model through LangChain
  - answers dataset-specific questions

### Frontend workflow

- upload a CSV
- optionally choose a target column
- run AI analysis
- inspect SHAP charts
- chat with the dataset

## Local setup

### 1. Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

Set `OPENAI_API_KEY` in `backend/.env` if you want `/chat` to work.

Run the API:

```bash
cd backend
../.venv/bin/uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The Vite app runs at `http://localhost:5173` and expects the backend at `http://localhost:8000` by default.

## Sample dataset

A ready-to-use sample file is included at:

```text
sample_data/customer_churn.csv
```

It contains:

- numeric and categorical columns
- a `churn` target column
- realistic missing values for preprocessing tests

## Verified locally

I verified the following in this workspace:

- `POST /upload` succeeded with the sample dataset
- `POST /train` succeeded and selected `XGBClassifier`
- `GET /explain` returned SHAP importance and row-level explanation
- `npm run build` completed successfully for the frontend

`POST /chat` is implemented and returns a clear error until `OPENAI_API_KEY` is configured.

## Example API flow

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@sample_data/customer_churn.csv"

curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{"dataset_id":"YOUR_DATASET_ID"}'

curl "http://localhost:8000/explain?dataset_id=YOUR_DATASET_ID&row_index=3"

curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"dataset_id":"YOUR_DATASET_ID","question":"What drives churn?"}'
```
