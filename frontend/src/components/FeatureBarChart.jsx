import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const POSITIVE_COLOR = '#63d2b5';
const NEGATIVE_COLOR = '#f27d72';
const GLOBAL_COLOR = '#f2c165';

function formatMetric(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }
  return Number(value).toFixed(Math.abs(value) >= 1 ? 3 : 4);
}

function ImpactLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: POSITIVE_COLOR }} />
        <span>+ Increases prediction</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: NEGATIVE_COLOR }} />
        <span>- Decreases prediction</span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, variant }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;
  const metricLabel = variant === 'local' ? 'SHAP value' : 'Importance';
  const metricValue = variant === 'local' ? point.shap_value : point.importance;
  const impactDirection = point.shap_value >= 0 ? 'Increases prediction' : 'Decreases prediction';

  return (
    <div className="max-w-xs rounded-2xl border border-white/10 bg-ink-900/95 p-4 text-sm text-slate-100 shadow-panel backdrop-blur">
      <p className="font-medium text-white">{point.feature}</p>
      <div className="mt-2 space-y-1 text-slate-300">
        <p>{metricLabel}: <span className="text-white">{formatMetric(metricValue)}</span></p>
        {'feature_value' in point ? (
          <p>Feature value: <span className="text-white">{point.feature_value_display ?? point.feature_value}</span></p>
        ) : null}
        {variant === 'local' ? (
          <p>
            Impact direction:{' '}
            <span style={{ color: point.shap_value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR }}>
              {impactDirection}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function FeatureBarChart({
  title,
  subtitle,
  data,
  variant = 'global',
}) {
  const metricKey = variant === 'local' ? 'shap_value' : 'importance';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 motion-safe:animate-floatUp">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {variant === 'local' ? <ImpactLegend /> : null}
      </div>

      <div className="h-[22rem] sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
            {/* A zero reference line makes positive vs. negative SHAP pushes instantly readable. */}
            {variant === 'local' ? <ReferenceLine x={0} stroke="rgba(255,255,255,0.18)" /> : null}
            <XAxis
              type="number"
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="label"
              type="category"
              tick={{ fill: '#cbd5e1', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={220}
            />
            <Tooltip content={<ChartTooltip variant={variant} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey={metricKey} radius={variant === 'local' ? 8 : [0, 10, 10, 0]}>
              {data.map((entry) => (
                <Cell
                  key={`${variant}-${entry.feature}`}
                  /* Local explanations use signed colors; global importance keeps a neutral highlight. */
                  fill={variant === 'local' ? entry.fill : GLOBAL_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export { NEGATIVE_COLOR, POSITIVE_COLOR };
