/**
 * 图表配置面板
 * 类型切换(9种) + X/Y轴选择 + 聚合方式 + 标题/颜色/图例/堆叠/平滑
 */
import { useState, useEffect } from 'react';
import { BarChart3, LineChart, PieChart, ScatterChart, Grid3x3, Box, Radar, AreaChart, Filter, Settings2 } from 'lucide-react';
import type { ChartConfig, ChartType, ColumnTypes } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'bar', label: '柱状图', icon: <BarChart3 className="w-4 h-4" />, desc: '分组对比' },
  { type: 'line', label: '折线图', icon: <LineChart className="w-4 h-4" />, desc: '趋势变化' },
  { type: 'area', label: '面积图', icon: <AreaChart className="w-4 h-4" />, desc: '累计趋势' },
  { type: 'pie', label: '饼图', icon: <PieChart className="w-4 h-4" />, desc: '占比分布' },
  { type: 'scatter', label: '散点图', icon: <ScatterChart className="w-4 h-4" />, desc: '相关性' },
  { type: 'histogram', label: '直方图', icon: <BarChart3 className="w-4 h-4" />, desc: '数值分布' },
  { type: 'heatmap', label: '热力图', icon: <Grid3x3 className="w-4 h-4" />, desc: '相关矩阵' },
  { type: 'boxplot', label: '箱线图', icon: <Box className="w-4 h-4" />, desc: '统计分布' },
  { type: 'radar', label: '雷达图', icon: <Radar className="w-4 h-4" />, desc: '多维对比' },
  { type: 'funnel', label: '漏斗图', icon: <Filter className="w-4 h-4" />, desc: '转化流程' },
];

const PALETTES: { name: string; colors: string[] }[] = [
  { name: '棱镜科技', colors: ['#6C8CFF', '#34D399', '#F59E0B', '#EF4444', '#A78BFA', '#22D3EE'] },
  { name: '学术经典', colors: ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#3B1F2B', '#5C8001'] },
  { name: '暖色教学', colors: ['#E63946', '#F4A261', '#E9C46A', '#2A9D8F', '#264653', '#A8DADC'] },
  { name: '冷色科研', colors: ['#073B4C', '#118AB2', '#06D6A0', '#06AED5', '#086788', '#F0F3BD'] },
];

interface Props {
  columns: string[];
  columnTypes: ColumnTypes;
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
}

export default function ChartConfigPanel({ columns, columnTypes, config, onChange }: Props) {
  const numericCols = columns.filter(c => columnTypes[c] === 'numeric');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (patch: Partial<ChartConfig>) => onChange({ ...config, ...patch });

  const toggleYCol = (col: string) => {
    const y_cols = config.y_cols.includes(col)
      ? config.y_cols.filter(c => c !== col)
      : [...config.y_cols, col];
    update({ y_cols });
  };

  return (
    <div className="space-y-4">
      {/* 图表类型选择 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="w-3.5 h-3.5 text-nebula" />
          <span className="label-section">图表类型</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {CHART_TYPES.map(ct => (
            <button
              key={ct.type}
              onClick={() => update({ type: ct.type })}
              title={ct.desc}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all',
                config.type === ct.type
                  ? 'bg-nebula-subtle border-nebula/40 text-nebula'
                  : 'border-midnight-600/40 text-frost-dim hover:border-midnight-500 hover:text-frost-muted'
              )}
            >
              {ct.icon}
              <span className="text-xs font-body">{ct.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 轴选择 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-section block mb-1.5">X 轴 / 分组</label>
          <select
            value={config.x_col}
            onChange={e => update({ x_col: e.target.value })}
            className="w-full bg-midnight-800 border border-midnight-600/40 rounded-lg px-3 py-2 text-sm text-frost"
          >
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label-section block mb-1.5">聚合方式</label>
          <select
            value={config.aggfunc}
            onChange={e => update({ aggfunc: e.target.value as any })}
            className="w-full bg-midnight-800 border border-midnight-600/40 rounded-lg px-3 py-2 text-sm text-frost"
          >
            <option value="sum">求和</option>
            <option value="mean">平均值</option>
            <option value="count">计数</option>
            <option value="min">最小值</option>
            <option value="max">最大值</option>
          </select>
        </div>
      </div>

      {/* Y轴多选 */}
      <div>
        <label className="label-section block mb-1.5">Y 轴 / 数值列（可多选）</label>
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {numericCols.map(c => (
            <button
              key={c}
              onClick={() => toggleYCol(c)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-body transition-all',
                config.y_cols.includes(c)
                  ? 'bg-nebula text-white'
                  : 'bg-midnight-700 text-frost-dim hover:text-frost'
              )}
            >
              {c}
            </button>
          ))}
          {numericCols.length === 0 && <span className="text-xs text-frost-dim">无数值列</span>}
        </div>
      </div>

      {/* 排序 */}
      <div>
        <label className="label-section block mb-1.5">排序方式</label>
        <div className="flex gap-1">
          {([
            { val: 'none', label: '默认' },
            { val: 'value_desc', label: '值↓' },
            { val: 'value_asc', label: '值↑' },
            { val: 'name_asc', label: '名↑' },
            { val: 'name_desc', label: '名↓' },
          ] as const).map(opt => (
            <button
              key={opt.val}
              onClick={() => update({ sort_by: opt.val })}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-body transition-all',
                config.sort_by === opt.val
                  ? 'bg-nebula-subtle text-nebula border border-nebula/30'
                  : 'bg-midnight-700 text-frost-dim hover:text-frost border border-transparent'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 高级设置 */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-frost-dim hover:text-frost font-body transition-colors"
      >
        {showAdvanced ? '▼' : '▶'} 高级设置
      </button>

      {showAdvanced && (
        <div className="space-y-3 p-3 rounded-lg bg-midnight-800/50 border border-midnight-600/30">
          {/* 标题 */}
          <div>
            <label className="label-section block mb-1">图表标题</label>
            <input
              value={config.title}
              onChange={e => update({ title: e.target.value })}
              placeholder="输入标题…"
              className="w-full bg-midnight-800 border border-midnight-600/40 rounded-lg px-3 py-1.5 text-sm text-frost"
            />
          </div>

          {/* 配色 */}
          <div>
            <label className="label-section block mb-1.5">配色方案</label>
            <div className="space-y-1.5">
              {PALETTES.map(p => (
                <button
                  key={p.name}
                  onClick={() => update({ palette: p.colors })}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all',
                    config.palette.join() === p.colors.join() ? 'bg-midnight-600/40' : 'hover:bg-midnight-700'
                  )}
                >
                  <span className="text-xs text-frost-muted flex-1 text-left">{p.name}</span>
                  <div className="flex gap-0.5">
                    {p.colors.slice(0, 5).map((c, i) => (
                      <span key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 开关 */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'show_legend', label: '图例' },
              { key: 'show_tooltip', label: '悬浮提示' },
              { key: 'show_x_labels', label: 'X轴标签' },
              { key: 'stacked', label: '堆叠' },
              { key: 'smooth', label: '平滑曲线' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => update({ [opt.key]: !config[opt.key] } as any)}
                className={cn(
                  'flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-all',
                  config[opt.key] ? 'bg-emerald-subtle text-emerald border border-emerald/20' : 'bg-midnight-700 text-frost-dim'
                )}
              >
                {opt.label}
                <span className={cn('w-3.5 h-3.5 rounded-full', config[opt.key] ? 'bg-emerald' : 'bg-midnight-500')} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
