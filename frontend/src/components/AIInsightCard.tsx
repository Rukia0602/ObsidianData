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
  error: { border: 'border-l-ruby', badge: 'bg-ruby-subtle text-ruby-light border-ruby/20', iconBg: 'bg-ruby-subtle', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: '风险', color: 'text-ruby-light' },
  warning: { border: 'border-l-amber', badge: 'bg-amber-subtle text-amber border-amber/20', iconBg: 'bg-amber-subtle', icon: <Lightbulb className="w-3.5 h-3.5" />, label: '关注', color: 'text-amber' },
  success: { border: 'border-l-emerald', badge: 'bg-emerald-subtle text-emerald border-emerald/20', iconBg: 'bg-emerald-subtle', icon: <Shield className="w-3.5 h-3.5" />, label: '优势', color: 'text-emerald' },
  info: { border: 'border-l-nebula', badge: 'bg-nebula-subtle text-nebula border-nebula/20', iconBg: 'bg-nebula-subtle', icon: <TrendingUp className="w-3.5 h-3.5" />, label: '洞察', color: 'text-nebula' },
};

// 场景识别
function detectScenario(summary: string, findings: AiFinding[]): { icon: React.ReactNode; label: string; color: string } {
  const text = summary + ' ' + findings.map(f => f.title + f.content).join(' ');
  if (text.includes('成绩单') || text.includes('偏科') || text.includes('科目')) {
    return { icon: <GraduationCap className="w-5 h-5" />, label: '学生成绩单分析', color: 'from-emerald to-cyan' };
  }
  if (text.includes('销售') || text.includes('利润率') || text.includes('产品排名')) {
    return { icon: <ShoppingCart className="w-5 h-5" />, label: '销售数据分析', color: 'from-amber to-ruby' };
  }
  if (text.includes('汽车') || text.includes('品牌销量') || text.includes('售价')) {
    return { icon: <Car className="w-5 h-5" />, label: '汽车数据分析', color: 'from-nebula to-violet' };
  }
  return { icon: <Database className="w-5 h-5" />, label: '通用数据分析', color: 'from-nebula to-nebula-dark' };
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
  high: 'bg-ruby-subtle text-ruby-light border border-ruby/20',
  medium: 'bg-amber-subtle text-amber border border-amber/20',
  low: 'bg-emerald-subtle text-emerald border border-emerald/20',
};
const priorityLabels: Record<string, string> = { high: '高优先', medium: '中优先', low: '低优先' };

export default function AIInsightCard({ analysis }: { analysis: AiAnalysis | null }) {
  const scenario = useMemo(() => analysis ? detectScenario(analysis.summary, analysis.findings) : null, [analysis]);
  const groups = useMemo(() => analysis ? groupFindings(analysis.findings) : [], [analysis]);

  if (!analysis || !scenario) {
    return (
      <div className="data-card p-8 text-center">
        <Brain className="w-10 h-10 text-midnight-500 mx-auto mb-3" />
        <p className="font-body text-sm text-frost-dim">暂无洞察分析报告</p>
        <p className="font-body text-xs text-frost-dim mt-1">
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
      <div className={`data-card p-5 border-l-[3px] border-l-nebula animate-fade-in-up relative overflow-hidden`}>
        <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${scenario.color} opacity-10 blur-2xl`} />
        <div className="flex items-center gap-3 mb-3 relative">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${scenario.color} flex items-center justify-center shadow-lg text-white`}>
            {scenario.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base text-frost font-semibold">{scenario.label}</span>
              <Sparkles className="w-3.5 h-3.5 text-nebula" />
            </div>
            <span className="label-section">规则引擎洞察报告</span>
          </div>
        </div>
        <p className="font-body text-sm text-frost-muted leading-relaxed relative">{analysis.summary}</p>

        {/* 统计条 */}
        <div className="flex gap-3 mt-4 relative">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ruby-subtle/50">
            <span className="w-2 h-2 rounded-full bg-ruby" />
            <span className="text-xs text-ruby-light font-body">{errorCount} 风险</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-subtle/50">
            <span className="w-2 h-2 rounded-full bg-amber" />
            <span className="text-xs text-amber font-body">{warnCount} 关注</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-subtle/50">
            <span className="w-2 h-2 rounded-full bg-emerald" />
            <span className="text-xs text-emerald font-body">{successCount} 优势</span>
          </div>
        </div>
      </div>

      {/* 分组展示 findings */}
      {groups.map((g, gi) => (
        <div key={g.group} className="space-y-3 animate-fade-in-up" style={{ animationDelay: `${gi * 0.08}s` }}>
          <div className="flex items-center gap-2.5">
            <span className="label-section">{g.group}</span>
            <span className="text-xs text-frost-dim font-body">({g.items.length})</span>
            <div className="flex-1 h-px bg-gradient-to-r from-midnight-600/60 to-transparent" />
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
                    <span className="font-body text-sm text-frost font-medium">{f.title}</span>
                  </div>
                  <p className="font-body text-xs text-frost-dim leading-relaxed pl-9">{f.content}</p>
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
            <ChevronRight className="w-4 h-4 text-emerald" />
            <span className="label-section">执行建议 ({analysis.recommendations.length})</span>
            <div className="flex-1 h-px bg-gradient-to-r from-midnight-600/60 to-transparent" />
          </div>
          {analysis.recommendations.map((r) => (
            <div key={r.id} className="data-card p-4 border-l-[3px] border-l-midnight-500 hover:border-l-emerald/50 transition-colors">
              <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                <span className="font-body text-sm text-frost font-medium">{r.title}</span>
                <div className="flex items-center gap-2">
                  <span className={`tag ${priorityStyles[r.priority] || priorityStyles.medium}`}>
                    {priorityLabels[r.priority] || r.priority}
                  </span>
                  <span className="tag bg-midnight-700 text-frost-dim border border-midnight-600">
                    影响{r.impact} · 投入{r.effort}
                  </span>
                </div>
              </div>
              <p className="font-body text-xs text-frost-dim leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
