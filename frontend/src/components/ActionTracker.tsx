import { useState } from 'react';
import { ListChecks, Calendar, User, Target, Check, Plus, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { toggleActionStep } from '@/lib/api';
import { useAppStore, type ActionPlan } from '@/store/useAppStore';

const categoryConfig: Record<string, { border: string; badge: string; iconBg: string; label: string }> = {
  risk: { border: 'border-l-ruby', badge: 'bg-ruby-subtle text-ruby-light border-ruby/20', iconBg: 'bg-ruby-subtle', label: '风险应对' },
  growth: { border: 'border-l-emerald', badge: 'bg-emerald-subtle text-emerald border-emerald/20', iconBg: 'bg-emerald-subtle', label: '增长计划' },
  monitoring: { border: 'border-l-amber', badge: 'bg-amber-subtle text-amber border-amber/20', iconBg: 'bg-amber-subtle', label: '监控追踪' },
};

const statusStyles: Record<string, { bg: string; text: string; icon: JSX.Element; label: string }> = {
  pending: { bg: 'bg-midnight-700', text: 'text-frost-dim', icon: <Clock className="w-3 h-3" />, label: '待开始' },
  in_progress: { bg: 'bg-amber-subtle', text: 'text-amber', icon: <ChevronRight className="w-3 h-3" />, label: '进行中' },
  completed: { bg: 'bg-emerald-subtle', text: 'text-emerald', icon: <Check className="w-3 h-3" />, label: '已完成' },
};

function ActionCard({
  action,
  expanded,
  onToggleExpand,
}: {
  action: ActionPlan;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const { fileInfo, updateAction } = useAppStore();
  const cfg = categoryConfig[action.category] || categoryConfig.monitoring;
  const sts = statusStyles[action.status] || statusStyles.pending;

  const toggleStep = async (index: number) => {
    if (syncing) return;

    const prev = {
      steps: [...action.steps],
      progress: action.progress,
      status: action.status,
      updated_at: action.updated_at,
    };

    const steps = action.steps.map((step, i) => {
      if (i !== index) return step;
      const label = step.startsWith('✓') ? step.slice(1) : step;
      return step.startsWith('✓') ? label : `✓${label}`;
    });
    const doneCount = steps.filter((s) => s.startsWith('✓')).length;
    const progress = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
    const status: ActionPlan['status'] =
      progress === 100 ? 'completed' : doneCount > 0 ? 'in_progress' : 'pending';

    updateAction(action.id, {
      steps,
      progress,
      status,
      updated_at: new Date().toISOString(),
    });

    const sessionId = fileInfo?.file_id;
    if (!sessionId) return;

    setSyncing(true);
    try {
      const res = await toggleActionStep(action.id, sessionId, index);
      if (res.success && res.action) {
        updateAction(action.id, res.action);
      } else {
        updateAction(action.id, prev);
      }
    } catch {
      updateAction(action.id, prev);
    } finally {
      setSyncing(false);
    }
  };

  const dueDays = Math.ceil((new Date(action.deadline).getTime() - Date.now()) / 86400000);
  const isOverdue = dueDays < 0 && action.status !== 'completed';

  return (
    <div className={`data-card border-l-[3px] ${cfg.border} overflow-hidden`}>
      <div
        className="p-4 cursor-pointer hover:bg-midnight-800/30 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Target className="w-4 h-4" style={{ color: cfg.border.includes('ruby') ? '#F87171' : cfg.border.includes('emerald') ? '#34D399' : '#F59E0B' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`tag ${cfg.badge}`}>{cfg.label}</span>
              <span className="font-body text-sm text-frost font-medium truncate">{action.title}</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-body text-frost-dim">
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3" />
                {action.owner}
              </span>
              <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-ruby-light font-medium' : ''}`}>
                <Calendar className="w-3 h-3" />
                {action.deadline}
                {isOverdue && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    逾期{Math.abs(dueDays)}天
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${sts.bg}`}>
            {sts.icon}
            <span className={`font-mono text-xs ${sts.text} tabular-nums`}>{action.progress}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-midnight-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              action.status === 'completed' ? 'bg-emerald' :
              action.status === 'in_progress' ? 'bg-amber' : 'bg-midnight-500'
            }`}
            style={{ width: `${action.progress || 0}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-midnight-600/40 animate-fade-in">
          <p className="font-body text-xs text-frost-dim mb-3 mt-3 leading-relaxed">{action.description}</p>

          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-midnight-800/50 border border-midnight-600/30">
            <Target className="w-3.5 h-3.5 text-nebula flex-shrink-0" />
            <span className="font-body text-xs text-nebula font-medium">KPI: {action.measurable_kpi}</span>
          </div>

          <div className="space-y-1">
            {action.steps.map((step, i) => {
              const done = step.startsWith('✓');
              const label = done ? step.slice(1) : step;
              return (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); toggleStep(i); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                    done ? 'bg-emerald-subtle text-frost-dim' : 'hover:bg-midnight-800/50 text-frost-dim hover:text-frost'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    done ? 'bg-emerald border-emerald' : 'border-midnight-500'
                  }`}>
                    {done && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`font-body text-xs ${done ? 'line-through opacity-60' : ''}`}>{label}</span>
                </button>
              );
            })}
          </div>

          {action.updated_at && (
            <p className="font-body text-xs text-frost-dim mt-3">
              最后更新 {new Date(action.updated_at).toLocaleString('zh-CN')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActionTracker() {
  const { actions } = useAppStore();
  const [isExpandedAll, setIsExpandedAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleCardExpand = (id: string) => {
    if (isExpandedAll) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    setIsExpandedAll((prev) => !prev);
    if (isExpandedAll) {
      setExpandedIds(new Set());
    }
  };

  const isCardExpanded = (id: string) => isExpandedAll || expandedIds.has(id);
  const visibleActions = isExpandedAll ? actions : actions.slice(0, 3);

  if (actions.length === 0) {
    return (
      <div className="data-card p-8 text-center">
        <ListChecks className="w-8 h-8 text-midnight-500 mx-auto mb-3" />
        <p className="font-body text-sm text-frost-dim">暂无行动计划</p>
        <p className="font-body text-xs text-frost-dim mt-1">上传数据并完成洞察分析后自动创建</p>
      </div>
    );
  }

  const completed = actions.filter(a => a.status === 'completed').length;
  const inProgress = actions.filter(a => a.status === 'in_progress' || a.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListChecks className="w-4 h-4 text-nebula" />
          <span className="label-section">行动计划追踪</span>
        </div>
        <button
          onClick={toggleExpandAll}
          className="font-body text-xs text-frost-dim hover:text-frost transition-colors"
        >
          {isExpandedAll ? '收起全部' : '展开全部'}
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: '总计', value: actions.length, color: 'text-frost' },
          { label: '进行中', value: inProgress, color: 'text-amber' },
          { label: '已完成', value: completed, color: 'text-emerald' },
        ].map((stat) => (
          <div key={stat.label} className="data-card p-3 text-center">
            <p className={`data-value text-xl font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="font-body text-xs text-frost-dim mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="space-y-2.5">
        {visibleActions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            expanded={isCardExpanded(action.id)}
            onToggleExpand={() => toggleCardExpand(action.id)}
          />
        ))}
      </div>

      {actions.length > 3 && !isExpandedAll && (
        <button
          onClick={() => setIsExpandedAll(true)}
          className="w-full py-2.5 rounded-lg border border-midnight-600/60 text-frost-dim font-body text-xs hover:border-nebula/30 hover:text-frost transition-all"
        >
          <Plus className="w-3.5 h-3.5 inline mr-1" />
          查看全部 {actions.length} 项计划
        </button>
      )}
    </div>
  );
}
