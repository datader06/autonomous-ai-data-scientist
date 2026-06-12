import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function SummaryCard({ label, value, accent = 'text-sea-300' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 font-display text-2xl ${accent}`}>{value}</p>
    </div>
  );
}

export function AnalysisDashboard({ dataset, training, loading, onTrain }) {
  const chartData = training?.feature_names?.slice(0, 12).map((feature, index) => ({
    feature: feature.replace(/^categorical__|^numeric__/, ''),
    index: index + 1,
  }));
  const modelComparisonData = training
    ? Object.entries(training.metrics_by_model).map(([name, score]) => ({
        name,
        holdout: score,
        cv: training.cv_metrics_by_model?.[name],
      }))
    : [];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur-xl animate-floatUp [animation-delay:120ms]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sun-300/90">Step 2</p>
          <h2 className="font-display text-2xl text-white">Analysis dashboard</h2>
        </div>
        <button
          type="button"
          onClick={onTrain}
          disabled={!dataset || loading}
          className="rounded-xl bg-sea-400 px-5 py-3 font-medium text-ink-950 transition hover:bg-sea-300 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {loading ? 'Training models...' : 'Run AI Analysis'}
        </button>
      </div>

      {!training ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-6 text-sm text-slate-300">
          Upload a dataset first, then run the analysis to compare Random Forest and XGBoost automatically.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Selected model" value={training.selected_model} />
            <SummaryCard label={training.metric_name.toUpperCase()} value={training.accuracy} accent="text-sun-300" />
            <SummaryCard label="Task type" value={training.task_type} accent="text-coral" />
            <SummaryCard label="Target column" value={training.target_column} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl text-white">Model comparison</h3>
                  <p className="text-sm text-slate-400">The winner is selected from cross-validation, then reported on the holdout split.</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelComparisonData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#102633', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                    <Bar dataKey="holdout" name="Holdout" fill="#77d5d4" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="cv" name="Cross-val" fill="#f2c165" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {training.metric_name === 'r2' && training.accuracy < 0 ? (
                <p className="mt-3 text-sm text-coral">
                  Negative R2 means the current features predict worse than a simple mean baseline on the holdout split.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <h3 className="font-display text-xl text-white">EDA summary</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm text-slate-400">Rows</p>
                  <p className="mt-1 text-lg text-white">{training.eda.row_count}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm text-slate-400">Columns</p>
                  <p className="mt-1 text-lg text-white">{training.eda.column_count}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm text-slate-400">Numeric columns</p>
                  <p className="mt-1 text-lg text-white">{training.eda.numeric_columns.length}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-sm text-slate-400">Categorical columns</p>
                  <p className="mt-1 text-lg text-white">{training.eda.categorical_columns.length}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Missing values</p>
                {Object.keys(training.eda.missing_values).length === 0 ? (
                  <p className="mt-2 text-sm text-white">No missing values detected.</p>
                ) : (
                  <div className="mt-2 space-y-2 text-sm text-slate-200">
                    {Object.entries(training.eda.missing_values).map(([column, count]) => (
                      <div key={column} className="flex items-center justify-between rounded-lg bg-black/10 px-3 py-2">
                        <span>{column}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <h3 className="font-display text-xl text-white">Encoded feature map</h3>
            <p className="mt-1 text-sm text-slate-400">These are the transformed features the model sees after imputation and one-hot encoding.</p>
            {training.excluded_columns?.length ? (
              <p className="mt-2 text-sm text-coral">
                Excluded identifier columns: {training.excluded_columns.join(', ')}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {chartData?.map((item) => (
                <span key={item.index} className="rounded-full border border-sea-300/20 bg-sea-300/10 px-3 py-1 text-xs text-sea-300">
                  {item.feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
