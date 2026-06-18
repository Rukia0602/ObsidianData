import { useEffect, useState, useRef } from 'react';
import { TrendingUp, Award, Target, Zap, BarChart3, Activity } from 'lucide-react';

interface InsightPanelProps {
  insights: Record<string, string | number> | null;
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: string | number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const target = typeof value === 'number' ? value : parseFloat(String(value));

  useEffect(() => {
    if (isNaN(target)) {
      setDisplay(0);
      return;
    }
    const duration = 1000;
    const start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);

  if (isNaN(target)) return <>{value}</>;
  return <>{prefix}{display.toLocaleString('zh-CN')}{suffix}</>;
}

const metricDefs = [
  { keyFilter: '_sum', labelSuffix: '合计', icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-nebula', bg: 'bg-nebula-subtle' },
  { keyFilter: '_max', labelSuffix: '峰值', icon: <Award className="w-3.5 h-3.5" />, color: 'text-amber', bg: 'bg-amber-subtle' },
  { keyFilter: '_mean', labelSuffix: '均值', icon: <Target className="w-3.5 h-3.5" />, color: 'text-emerald', bg: 'bg-emerald-subtle' },
];

export default function InsightPanel({ insights }: InsightPanelProps) {
  if (!insights) return null;

  const keys = Object.keys(insights);
  const skipKeys = ['total_rows', 'total_cols', 'file_size', 'row_count', 'col_count'];

  const metricCards: { label: string; value: string | number; icon: JSX.Element; color: string; bg: string }[] = [];

  for (const def of metricDefs) {
    const matchingKeys = keys.filter(k => k.endsWith(def.keyFilter) && !skipKeys.includes(k));
    if (matchingKeys.length > 0) {
      const key = matchingKeys[0];
      metricCards.push({
        label: key.replace(def.keyFilter, def.labelSuffix),
        value: insights[key],
        icon: def.icon,
        color: def.color,
        bg: def.bg,
      });
    }
  }

  const topKeys = keys.filter(k => k.startsWith('top_'));
  if (topKeys.length > 0) {
    metricCards.push({
      label: topKeys[0].replace('top_', '领先: '),
      value: insights[topKeys[0]],
      icon: <Zap className="w-3.5 h-3.5" />,
      color: 'text-nebula',
      bg: 'bg-nebula-subtle',
    });
  }

  const remainingKeys = keys.filter(k =>
    !k.endsWith('_sum') && !k.endsWith('_max') && !k.endsWith('_mean') &&
    !k.startsWith('top_') && !skipKeys.includes(k)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Activity className="w-4 h-4 text-nebula" />
        <span className="label-section">数据洞察</span>
        <div className="flex-1 h-px bg-gradient-to-r from-midnight-600/60 to-transparent" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {metricCards.map((item, i) => (
          <div
            key={item.label}
            className="data-card p-3.5 animate-fade-in-up"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center ${item.color}`}>
                {item.icon}
              </div>
              <span className="font-body text-xs text-frost-dim">{item.label}</span>
            </div>
            <p className={`data-value text-lg font-semibold ${item.color}`}>
              <AnimatedNumber value={item.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Detail stats */}
      {remainingKeys.length > 0 && (
        <div className="data-card p-4 animate-fade-in-up">
          <div className="flex items-center gap-2.5 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-frost-dim" />
            <span className="label-section">详细统计</span>
          </div>
          <div className="space-y-1.5">
            {remainingKeys.slice(0, 10).map((key) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b border-midnight-600/20 last:border-0">
                <span className="font-body text-xs text-frost-muted truncate mr-2 max-w-[60%]">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="data-value text-xs text-frost tabular-nums whitespace-nowrap font-medium">
                  {typeof insights[key] === 'number'
                    ? (insights[key] as number).toLocaleString('zh-CN')
                    : String(insights[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
