function formatConfidence(confidence) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return null;
  }
  return `Confidence: ${Math.round(confidence * 100)}%`;
}

function SummaryCard({ label, value, accent = 'text-white', helper, badge }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 motion-safe:animate-floatUp">
      <p className="text-sm text-slate-400">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p className={`font-display text-2xl ${accent}`}>{value}</p>
        {badge ? (
          <span className="rounded-full border border-sun-300/20 bg-sun-300/10 px-3 py-1 text-xs font-medium text-sun-300">
            {badge}
          </span>
        ) : null}
      </div>
      {helper ? <p className="mt-2 text-sm text-slate-400">{helper}</p> : null}
    </div>
  );
}

export function PredictionSummary({ explanation }) {
  const confidenceText = formatConfidence(explanation.prediction_confidence);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard
        label="Model"
        value={explanation.selected_model}
        helper={`Target: ${explanation.target_column}`}
      />
      <SummaryCard
        label="Predicted outcome"
        value={String(explanation.predicted_label)}
        accent="text-sun-300"
        badge={confidenceText}
        helper={confidenceText ? null : 'Confidence unavailable for this model output'}
      />
      <SummaryCard
        label="Actual outcome"
        value={String(explanation.actual_label ?? 'N/A')}
        accent="text-sea-300"
        helper={`Explained row: ${explanation.row_index}`}
      />
    </div>
  );
}
