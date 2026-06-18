import { Brain, AlertTriangle, TrendingUp, Shield, Lightbulb, ChevronRight, Sparkles, GraduationCap, ShoppingCart, Car, Database } from 'lucide-react';
import { useMemo } from 'react';

interface AiFinding {
  type: string;
  title: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  content: string;
}

interface AiRecommendation {
  id: number;
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  impact: string;
  effort: string;
}

interface AiAnalysis {
  summary: string;
  findings: AiFinding[];
  recommendations: AiRecommendation[];
  action_plans: unknown[];
  generated_at: string;
}

const severityConfig = {
  error: { border: 'border-l-error', badge: 'tag-error', iconBg: 'bg-error-subtle', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: '风险', color: 'text-error' },
  warning: { border: 'border-l-warning', badge: 'tag-warning', iconBg: 'bg-warning-subtle', icon: <Lightbulb className="w-3.5 h-3.5" />, label: '关注', color: 'text-warning' },
  success: { border: 'border-l-success', badge: 'tag-success', iconBg: 'bg-success-subtle', icon: <Shield className="w-3.5 h-3.5" />, label: '优势', color: 'text-success' },
  info: { border: 'border-l-info', badge: 'tag-info', iconBg: 'bg-info-subtle', icon: <TrendingUp className="w-3.5 h-3.5" />, label: '洞察', color: 'text-info' },
};

// 场景识别
function detectScenario(summary: string, findings: AiFinding[]): { icon: React.ReactNode; label: string; bgClass: string } {
  const text = summary + ' ' + findings.map(f => f.title + f.content).join(' ');
  if (text.includes('成绩单') || text.includes('偏科') || text.includes('科目')) {
    return { icon: <GraduationCap className="w-5 h-5" />, label: '学生成绩单分析', bgClass: 'bg-accent' };
  }
  if (text.includes('销售') || text.includes('利润率') || text.includes('产品排名')) {
    return { icon: <ShoppingCart className="w-5 h-5" />, label: '销售数据分析', bgClass: 'bg-accent' };
  }
  if (text.includes('汽车') || text.includes('品牌销量') || text.includes('售价')) {
    return { icon: <Car className="w-5 h-5" />, label: '汽车数据分析', bgClass: 'bg-accent' };
  }
  return { icon: <Database className="w-5 h-5" />, label: '通用数据分析', bgClass: 'bg-accent' };
}

// 按类型分组 findings
function groupFindings(findings: AiFinding[]): { group: string; items: AiFinding[] }[] {
  const groups: Record<string, AiFinding[]> = {};
  for (const f of findings) {
    const t = f.type || 'other';
    if (!groups[t]) groups[t] = [];
    groups[t].push(f);
  }
  // 分组中文名映射
  const groupLabels: Record<string, string> = {
    overview: '数据概览', champion: '领先者分析', opportunity: '机会点', correlation: '相关性分析',
    risk: '风险预警', trend: '趋势分析', concentration: '集中度分析', ranking_shake: '排名异动',
    imbalance: '偏科预警', difficulty: '科目难度', ranking: '成绩梯队', class_compare: '班级对比',
    profit_rate: '利润率', category_rank: '产品排名', region_compare: '地区对比',
    ad_correlation: '广告分析', brand_rank: '品牌排名', price_analysis: '价格分析',
    price_sales: '价格与销量', top_rank: '排名分布',
    missing_data: '缺失值分析', distribution_anomaly: '分布异常', top_share: '集中度分析',
    generic_correlation: '相关性摘要', other: '其他发现',
  };
  return Object.entries(groups).map(([key, items]) => ({
    group: groupLabels[key] || key,
    items,
  }));
}

const priorityStyles: Record<string, string> = {
  high: 'tag-error',
  medium: 'tag-warning',
  low: 'tag-success',
};
const priorityLabels: Record<string, string> = { high: '高优先', medium: '中优先', low: '低优先' };

export default function AIInsightCard({ analysis }: { analysis: AiAnalysis | null }) {
  const scenario = useMemo(() => analysis ? detectScenario(analysis.summary, analysis.findings) : null, [analysis]);
  const groups = useMemo(() => analysis ? groupFindings(analysis.findings) : [], [analysis]);

  if (!analysis || !scenario) {
    return (
      <div className="data-card p-8 text-center">
        <Brain className="w-10 h-10 text-quaternary mx-auto mb-3" />
        <p className="font-body text-sm text-tertiary">暂无洞察分析报告</p>
        <p className="font-body text-xs text-tertiary mt-1">
          请在上传页完成「开始洞察分析」，规则引擎将自动生成发现与建议
        </p>
      </div>
    );
  }

  const errorCount = analysis.findings.filter(f => f.severity === 'error').length;
  const warnCount = analysis.findings.filter(f => f.severity === 'warning').length;
  const successCount = analysis.findings.filter(f => f.severity === 'success').length;

  return (
    <div className="space-y-5">
      {/* 场景识别卡片 */}
      <div className="data-card p-5 border-l-[3px] border-l-accent animate-fade-in-up relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3 relative">
          <div className={`w-11 h-11 rounded-xl ${scenario.bgClass} flex items-center justify-center text-canvas`}>
            {scenario.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base text-primary font-semibold">{scenario.label}</span>
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="label-section">规则引擎洞察报告</span>
          </div>
        </div>
        <p className="font-body text-sm text-secondary leading-relaxed relative">{analysis.summary}</p>

        {/* 统计条 */}
        <div className="flex gap-3 mt-4 relative">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error-subtle">
            <span className="w-2 h-2 rounded-full bg-error" />
            <span className="text-xs text-error font-body">{errorCount} 风险</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warning-subtle">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-xs text-warning font-body">{warnCount} 关注</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-subtle">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-success font-body">{successCount} 优势</span>
          </div>
        </div>
      </div>

      {/* 分组展示 findings */}
      {groups.map((g, gi) => (
        <div key={g.group} className="space-y-3 animate-fade-in-up" style={{ animationDelay: `${gi * 0.08}s` }}>
          <div className="flex items-center gap-2.5">
            <span className="label-section">{g.group}</span>
            <span className="text-xs text-tertiary font-body">({g.items.length})</span>
            <div className="flex-1 h-px bg-subtle" />
          </div>

          {g.items.map((f, i) => {
            const cfg = severityConfig[f.severity] || severityConfig.info;
            return (
              <div
                key={`${gi}-${i}`}
                className={`data-card border-l-[3px] ${cfg.border} hover:translate-x-1 transition-transform duration-200`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-7 h-7 rounded-lg ${cfg.iconBg} ${cfg.color} flex items-center justify-center`}>
                      {cfg.icon}
                    </div>
                    <span className={`tag ${cfg.badge}`}>{cfg.label}</span>
                    <span className="font-body text-sm text-primary font-medium">{f.title}</span>
                  </div>
                  <p className="font-body text-xs text-tertiary leading-relaxed pl-9">{f.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <ChevronRight className="w-4 h-4 text-accent" />
            <span className="label-section">执行建议 ({analysis.recommendations.length})</span>
            <div className="flex-1 h-px bg-subtle" />
          </div>
          {analysis.recommendations.map((r) => (
            <div key={r.id} className="data-card p-4 border-l-[3px] border-l-subtle hover:border-l-accent/50 transition-colors">
              <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                <span className="font-body text-sm text-primary font-medium">{r.title}</span>
                <div className="flex items-center gap-2">
                  <span className={`tag ${priorityStyles[r.priority] || priorityStyles.medium}`}>
                    {priorityLabels[r.priority] || r.priority}
                  </span>
                  <span className="tag bg-surface-1 text-tertiary border border-subtle">
                    影响{r.impact} · 投入{r.effort}
                  </span>
                </div>
              </div>
              <p className="font-body text-xs text-tertiary leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
