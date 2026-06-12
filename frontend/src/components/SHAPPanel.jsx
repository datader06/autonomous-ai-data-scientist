import { FeatureBarChart, NEGATIVE_COLOR, POSITIVE_COLOR } from './FeatureBarChart';
import { PredictionSummary } from './PredictionSummary';

function cleanFeatureName(featureName) {
  return featureName.replace(/^categorical__|^numeric__/, '');
}

function formatFeatureValue(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return String(value);
  }
  if (Math.abs(value) >= 100) {
    return value.toFixed(0);
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(1);
  }
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function buildGlobalData(explanation) {
  return (explanation?.feature_importance || []).map((item) => ({
    ...item,
    feature: cleanFeatureName(item.feature),
    label: cleanFeatureName(item.feature),
  }));
}

function buildLocalData(explanation) {
  return (explanation?.prediction_explanation || []).map((item) => {
    const feature = cleanFeatureName(item.feature);
    const featureValueDisplay = formatFeatureValue(item.feature_value);

    return {
      ...item,
      feature,
      feature_value_display: featureValueDisplay,
      // Pairing the feature name with its actual value gives the chart immediate context.
      label: `${feature} (${featureValueDisplay})`,
      fill: item.shap_value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
    };
  });
}

export function SHAPPanel({ explanation, rowIndex, setRowIndex, onExplain, loading, disabled, maxRowIndex }) {
  const featureImportanceData = buildGlobalData(explanation);
  const localExplanationData = buildLocalData(explanation);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur-xl motion-safe:animate-floatUp [animation-delay:220ms]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-coral/90">Step 3</p>
          <h2 className="font-display text-2xl text-white">Explainable AI Insights (SHAP)</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            See which features push this prediction upward or downward, and how strongly each signal contributes.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm text-slate-300">
            Row to explain
            <input
              type="number"
              min="0"
              max={Math.max(0, maxRowIndex)}
              value={rowIndex}
              onChange={(event) => setRowIndex(event.target.value)}
              className="mt-2 w-36 rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2 text-white outline-none focus:border-sea-300"
            />
            <span className="mt-2 block text-xs text-slate-500">Enter a row index between 0 and {Math.max(0, maxRowIndex)}.</span>
          </label>
          <button
            type="button"
            onClick={onExplain}
            disabled={disabled || loading}
            className="inline-flex min-w-56 items-center justify-center gap-3 rounded-xl bg-coral px-5 py-3 font-medium text-ink-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
                <span>Generating explanation...</span>
              </>
            ) : (
              'Generate Explanation'
            )}
          </button>
        </div>
      </div>

      {!explanation ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-6 text-sm text-slate-300">
          Train the model first, then inspect global importance and per-row SHAP contributions.
        </div>
      ) : (
        <div className="space-y-5">
          <PredictionSummary explanation={explanation} />

          <div className="grid gap-4 xl:grid-cols-2">
            <FeatureBarChart
              title="Global Feature Importance"
              subtitle="Average absolute SHAP impact across the dataset. Taller bars indicate stronger overall influence."
              data={featureImportanceData}
              variant="global"
            />
            <FeatureBarChart
              title="Per-Prediction Explanation"
              subtitle="Bars to the right increase the prediction. Bars to the left pull it downward for this specific row."
              data={localExplanationData}
              variant="local"
            />
          </div>
        </div>
      )}
    </section>
  );
}
