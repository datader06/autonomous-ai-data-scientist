import { useMemo, useState } from 'react';
import { api } from './lib/api';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ChatPanel } from './components/ChatPanel';
import { ExplanationPanel } from './components/ExplanationPanel';
import { UploadSection } from './components/UploadSection';

const initialStatus = { type: 'idle', message: 'Upload a CSV to begin.' };

function splitCsvLine(line, delimiter) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, ''));
}

function detectDelimiter(headerLine) {
  const candidates = [',', ';', '\t', '|'];
  let bestDelimiter = ',';
  let bestScore = -1;

  candidates.forEach((delimiter) => {
    const score = splitCsvLine(headerLine, delimiter).length;
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  });

  return bestDelimiter;
}

async function extractColumnsFromFile(file) {
  const content = await file.text();
  const firstLine = content.split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) {
    return [];
  }

  const delimiter = detectDelimiter(firstLine);
  return splitCsvLine(firstLine, delimiter).filter(Boolean);
}

function App() {
  const [uploadFile, setUploadFile] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [targetColumn, setTargetColumn] = useState('');
  const [training, setTraining] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [rowIndex, setRowIndex] = useState(0);
  const [status, setStatus] = useState(initialStatus);
  const [uploading, setUploading] = useState(false);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const canTrain = Boolean(dataset?.dataset_id);

  const statusTone = useMemo(() => {
    if (status.type === 'error') return 'border-coral/40 bg-coral/10 text-rose-100';
    if (status.type === 'success') return 'border-sea-300/30 bg-sea-300/10 text-sea-100';
    return 'border-white/10 bg-white/5 text-slate-200';
  }, [status.type]);

  const handleApiError = (error, fallbackMessage) => {
    const detail = error?.response?.data?.detail;
    const isNetworkError = !error?.response;
    const normalizedDetail =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((item) => item?.msg || item?.message || JSON.stringify(item))
              .join(' ')
          : null;
    setStatus({
      type: 'error',
      message:
        normalizedDetail
          ? normalizedDetail
          : isNetworkError
            ? `Backend unreachable at ${api.defaults.baseURL}. Start FastAPI or set VITE_API_BASE_URL in frontend/.env.`
            : fallbackMessage,
    });
  };

  const handleFileSelect = async (file) => {
    setUploadFile(file);
    setDataset(null);
    setTraining(null);
    setExplanation(null);
    setMessages([]);

    if (!file) {
      setAvailableColumns([]);
      setTargetColumn('');
      setStatus(initialStatus);
      return;
    }

    try {
      const columns = await extractColumnsFromFile(file);
      setAvailableColumns(columns);
      setTargetColumn((current) => (columns.includes(current) ? current : ''));
      setStatus({
        type: 'idle',
        message: columns.length
          ? `Detected ${columns.length} columns from ${file.name}. Select a target or upload directly.`
          : `Selected ${file.name}. Upload to inspect the dataset.`,
      });
    } catch {
      setAvailableColumns([]);
      setTargetColumn('');
      setStatus({
        type: 'idle',
        message: `Selected ${file.name}. Header preview was unavailable, but you can still upload the dataset.`,
      });
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);

    setUploading(true);
    setStatus({ type: 'idle', message: 'Uploading dataset...' });

    try {
      const response = await api.post('/upload', formData);
      setDataset(response.data);
      setAvailableColumns(response.data.columns || []);
      setTraining(null);
      setExplanation(null);
      setMessages([]);
      setStatus({ type: 'success', message: 'Dataset uploaded successfully. Ready for analysis.' });
    } catch (error) {
      handleApiError(error, 'Upload failed. Please verify the CSV and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTrain = async () => {
    if (!dataset?.dataset_id) return;

    setTrainingLoading(true);
    setStatus({ type: 'idle', message: 'Running EDA and training candidate models...' });

    try {
      const response = await api.post('/train', {
        dataset_id: dataset.dataset_id,
        target_column: targetColumn || null,
      });
      setTraining(response.data);
      setExplanation(null);
      setStatus({
        type: 'success',
        message: `${response.data.selected_model} selected with ${response.data.metric_name} ${response.data.accuracy}.`,
      });
    } catch (error) {
      handleApiError(error, 'Training failed.');
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!dataset?.dataset_id) return;

    setExplainLoading(true);
    setStatus({ type: 'idle', message: 'Computing SHAP explanations...' });

    try {
      const response = await api.get('/explain', {
        params: { dataset_id: dataset.dataset_id, row_index: Number(rowIndex) || 0 },
      });
      setExplanation(response.data);
      setStatus({ type: 'success', message: `Explanation generated for row ${response.data.row_index}.` });
    } catch (error) {
      handleApiError(error, 'Explanation failed. Train the model first.');
    } finally {
      setExplainLoading(false);
    }
  };

  const handleSend = async () => {
    if (!dataset?.dataset_id || !question.trim()) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
    };

    setMessages((current) => [...current, userMessage]);
    setChatLoading(true);
    setStatus({ type: 'idle', message: 'Querying the dataset knowledge base...' });

    try {
      const response = await api.post('/chat', {
        dataset_id: dataset.dataset_id,
        question: question.trim(),
      });
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.data.answer,
          sources: response.data.sources,
        },
      ]);
      setQuestion('');
      setStatus({ type: 'success', message: 'Dataset answer ready.' });
    } catch (error) {
      handleApiError(error, 'Chat request failed.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-haze px-4 py-8 text-white md:px-8 xl:px-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="grid gap-6 rounded-[2rem] border border-white/10 bg-black/10 p-6 shadow-panel backdrop-blur-xl lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-sea-300/90">Autonomous AI Data Scientist</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-white md:text-6xl">
              Train, explain, and interrogate tabular data from one focused workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
              This app runs end-to-end EDA, model selection, SHAP explainability, and RAG-powered dataset chat over a CSV upload.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-ink-950/60 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-sun-300/80">Pipeline</p>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              {['Upload CSV', 'EDA + preprocessing', 'RandomForest vs XGBoost', 'SHAP explanations', 'FAISS + OpenAI chat'].map((step) => (
                <div key={step} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-sea-300" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className={`rounded-2xl border px-5 py-4 text-sm ${statusTone}`}>
          {status.message}
        </div>

        <div className="grid gap-6">
          <UploadSection
            uploadFile={uploadFile}
            onFileSelect={handleFileSelect}
            onUpload={handleUpload}
            uploading={uploading}
            dataset={dataset}
            availableColumns={availableColumns}
            targetColumn={targetColumn}
            setTargetColumn={setTargetColumn}
          />

          <AnalysisDashboard
            dataset={dataset}
            training={training}
            loading={trainingLoading}
            onTrain={handleTrain}
          />

          <ExplanationPanel
            explanation={explanation}
            rowIndex={rowIndex}
            setRowIndex={setRowIndex}
            onExplain={handleExplain}
            loading={explainLoading}
            disabled={!canTrain}
            maxRowIndex={Math.max(0, (dataset?.rows || 1) - 1)}
          />

          <ChatPanel
            messages={messages}
            question={question}
            setQuestion={setQuestion}
            onSend={handleSend}
            loading={chatLoading}
            disabled={!dataset}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
