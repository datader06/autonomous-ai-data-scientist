# Autonomous AI Data Scientist

A production-style full-stack application that enables users to upload CSV datasets and perform autonomous machine learning analysis. The system automatically handles exploratory data analysis (EDA), model selection and training, SHAP-based explainability, and provides an interactive chat interface for dataset queries.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Sample Dataset](#sample-dataset)
- [Contributing](#contributing)
- [License](#license)

## Features

### 🔄 Autonomous ML Pipeline
- **Data Upload**: Secure CSV file upload with automatic validation
- **Exploratory Data Analysis**: Automated data profiling and statistical summaries
- **Model Selection**: Intelligent choice between Random Forest and XGBoost based on dataset characteristics
- **Auto-Preprocessing**: Missing value imputation, categorical encoding, and feature engineering
- **Model Training & Evaluation**: Cross-validation and performance metrics
- **SHAP Explainability**: Global and local feature importance explanations

### 💬 Interactive Data Chat
- **Vector Search**: FAISS-powered semantic search over dataset content
- **LLM Integration**: OpenAI-powered conversational interface for dataset queries
- **Context-Aware Responses**: Answers based on actual data patterns and insights

### 🎨 Modern Web Interface
- **Responsive Design**: Built with React and Tailwind CSS
- **Interactive Visualizations**: Charts and graphs using Recharts
- **Real-time Updates**: Live progress tracking during analysis

## Technology Stack

### Backend
- **Framework**: FastAPI (Python async web framework)
- **Machine Learning**: scikit-learn, XGBoost, SHAP
- **Vector Search**: FAISS for efficient similarity search
- **LLM Integration**: LangChain + OpenAI API
- **Data Processing**: Pandas, NumPy
- **Serialization**: Pydantic for data validation

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with PostCSS
- **Charts**: Recharts for data visualization
- **HTTP Client**: Axios for API communication

### Infrastructure
- **API Server**: Uvicorn ASGI server
- **CORS**: Configurable Cross-Origin Resource Sharing
- **Environment**: Python dotenv for configuration management

## Project Structure

```
AI-Data-Scientist-Agent/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py          # API endpoint definitions
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py          # Application configuration
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py         # Pydantic data models
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py            # Chat service with LangChain
│   │   │   ├── explanations.py    # SHAP explanations
│   │   │   ├── storage.py         # File storage utilities
│   │   │   └── training.py        # ML training pipeline
│   │   ├── __init__.py
│   │   └── main.py                # FastAPI application entry point
│   ├── data/
│   │   ├── artifacts/             # Model artifacts and cache
│   │   └── uploads/               # Uploaded dataset files
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalysisDashboard.jsx    # Main analysis interface
│   │   │   ├── ChatPanel.jsx            # Chat interface
│   │   │   ├── ExplanationPanel.jsx     # SHAP visualizations
│   │   │   ├── FeatureBarChart.jsx      # Feature importance charts
│   │   │   ├── PredictionSummary.jsx    # Model performance summary
│   │   │   ├── SHAPPanel.jsx            # SHAP explanations
│   │   │   └── UploadSection.jsx        # File upload component
│   │   ├── lib/
│   │   │   └── api.js                   # API client utilities
│   │   ├── App.jsx                      # Main React component
│   │   ├── index.css                    # Global styles
│   │   └── main.jsx                     # React entry point
│   ├── .env.example                     # Environment variables template
│   ├── index.html                       # HTML template
│   ├── package.json                     # Node.js dependencies
│   ├── postcss.config.js                # PostCSS configuration
│   ├── tailwind.config.js               # Tailwind CSS configuration
│   └── vite.config.js                   # Vite build configuration
├── sample_data/
│   └── customer_churn.csv               # Sample dataset for testing
├── hi.py                                # OpenAI API test script
└── README.md                            # This file
```

## Prerequisites

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **OpenAI API Key** (for chat functionality)
- **Git** for version control

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AI-Data-Scientist-Agent/ai-data-scientist-agent-main
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment variables
cp ../frontend/.env.example .env
# Edit .env and add your OPENAI_API_KEY
```

**Environment Variables:**
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Configure API endpoint (optional, defaults to localhost:8000)
cp .env.example .env
# Edit .env if needed
```

## Usage

### Starting the Application

1. **Start Backend Server:**
   ```bash
   cd backend
   ../venv/bin/uvicorn app.main:app --reload --port 8000
   ```

2. **Start Frontend Development Server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs (Swagger UI)

### Workflow

1. **Upload Dataset**: Use the web interface to upload a CSV file
2. **Configure Analysis**: Optionally specify target column for supervised learning
3. **Run Analysis**: The system performs EDA, model training, and evaluation
4. **Explore Results**: View SHAP explanations and feature importance
5. **Chat with Data**: Ask questions about your dataset using natural language

## API Reference

### Health Check
- **GET** `/health`
- Returns server status

### Upload Dataset
- **POST** `/upload`
- **Body**: Multipart form data with CSV file
- **Response**: Dataset preview and metadata

### Train Model
- **POST** `/train`
- **Body**: JSON with dataset ID and optional target column
- **Response**: Model results, performance metrics, and EDA summary

### Get Explanations
- **GET** `/explain/{dataset_id}`
- **Response**: SHAP feature importance and explanations

### Chat with Dataset
- **POST** `/chat`
- **Body**: JSON with dataset ID and user query
- **Response**: AI-generated response based on dataset content

For detailed API documentation, visit `/docs` when the backend is running.

## Sample Dataset

The repository includes a sample customer churn dataset (`sample_data/customer_churn.csv`) with the following features:

- `customer_id`: Unique customer identifier
- `age`: Customer age
- `tenure_months`: Account tenure in months
- `monthly_charges`: Monthly billing amount
- `contract_type`: Contract type (Month-to-month, One year, Two year)
- `support_tickets`: Number of support tickets
- `region`: Geographic region
- `addon_plan`: Additional service plan
- `last_login_days`: Days since last login
- `satisfaction_score`: Customer satisfaction rating
- `churn`: Target variable (Yes/No)

Use this dataset to test the application functionality.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint for JavaScript/React code
- Write tests for new features
- Update documentation for API changes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for democratizing data science**
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
