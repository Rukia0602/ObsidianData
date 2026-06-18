import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import { useAppStore, type ChartData } from '@/store/useAppStore';

const CHART_LABELS: Record<keyof ChartData, string> = {
  dashboard: '综合看板',
  pie: '饼图',
  line: '折线图',
  bar: '柱状图',
  scatter: '散点图',
};

const priorityLabels: Record<string, string> = {
  high: '高优先',
  medium: '中优先',
  low: '低优先',
};

const statusLabels: Record<string, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
};

export default function PrintReport() {
  const { fileInfo, aiAnalysis, insights, charts, actions } = useAppStore();

  const chartEntries = charts
    ? (Object.entries(charts) as [keyof ChartData, string | undefined][])
        .filter((entry): entry is [keyof ChartData, string] => Boolean(entry[1]))
    : [];

  const topInsights = insights
    ? Object.entries(insights).slice(0, 6)
    : [];

  const topFindings = aiAnalysis?.findings.slice(0, 6) ?? [];

  return (
    <div className="print-report">
      <header className="print-report__header">
        <h1 className="print-report__title">数据分析报告</h1>
        <p className="print-report__meta">
          文件：{fileInfo?.file_name ?? '未知'}
        </p>
        {fileInfo && (
          <p className="print-report__meta">
            数据规模：{fileInfo.row_count} 行 × {fileInfo.col_count} 列
          </p>
        )}
        <p className="print-report__meta">
          报告生成：{new Date().toLocaleString('zh-CN')}
          {aiAnalysis?.generated_at && (
            <> · 分析时间：{new Date(aiAnalysis.generated_at).toLocaleString('zh-CN')}</>
          )}
        </p>
      </header>

      {aiAnalysis && (
        <section className="print-report__section">
          <h2 className="print-report__section-title">分析摘要</h2>
          <p className="print-report__summary">{aiAnalysis.summary}</p>
        </section>
      )}

      {topInsights.length > 0 && (
        <section className="print-report__section">
          <h2 className="print-report__section-title">关键指标</h2>
          <div className="print-report__metrics">
            {topInsights.map(([key, value]) => (
              <div key={key} className="print-report__metric">
                <div className="print-report__metric-value">{String(value)}</div>
                <div className="print-report__metric-label">{key}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {topFindings.length > 0 && (
        <section className="print-report__section">
          <h2 className="print-report__section-title">核心发现</h2>
          {topFindings.map((f, i) => (
            <div key={i} className="print-report__finding">
              <div className="print-report__finding-title">{f.title}</div>
              <p className="print-report__finding-content">{f.content}</p>
            </div>
          ))}
        </section>
      )}

      {chartEntries.length > 0 && (
        <section className="print-report__section">
          <h2 className="print-report__section-title">图表</h2>
          <div className="print-report__charts">
            {chartEntries.map(([key, url]) => (
              <div key={key} className="print-report__chart-item">
                <img src={url} alt={CHART_LABELS[key]} />
                <p className="print-report__chart-caption">{CHART_LABELS[key]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {actions.length > 0 && (
        <section className="print-report__section">
          <h2 className="print-report__section-title">行动计划</h2>
          {actions.map((action) => (
            <div key={action.id} className="print-report__action">
              <div className="print-report__action-header">
                <span>{action.title}</span>
                <span>{action.progress}% · {statusLabels[action.status] ?? action.status}</span>
              </div>
              <p className="print-report__action-meta">
                负责人：{action.owner} · 截止：{action.deadline} · {priorityLabels[action.priority] ?? action.priority}
              </p>
              <p className="print-report__finding-content">{action.description}</p>
              <p className="print-report__action-meta">KPI：{action.measurable_kpi}</p>
              <ol className="print-report__steps">
                {action.steps.map((step, i) => (
                  <li key={i}>{step.startsWith('✓') ? step.slice(1) : step}</li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      <footer className="print-report__footer">
        {BRAND_NAME} · {BRAND_TAGLINE} · 规则引擎报告
      </footer>
    </div>
  );
}