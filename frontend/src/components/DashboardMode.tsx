/**
 * 交互看板 — 响应式网格 + 右侧配置抽屉
 */
import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Plus, Settings2, Trash2, X } from 'lucide-react';
import type { ChartConfig, ChartType, ColumnTypes, RawDataRow } from '@/store/useAppStore';
import ChartConfigPanel from './ChartConfigPanel';
import EChartRenderer from './EChartRenderer';
import { useChartSeries } from '@/hooks/useChartSeries';
import { STORAGE_KEYS } from '@/lib/brand';
import { buildDefaultChartAxes, buildQuickPresets, type QuickPreset } from '@/lib/columnInference';
import { cn } from '@/lib/utils';

const CHART_HEIGHT = 260;
const AUTO_PRESET_COUNT = 3;
const LAYOUT_VERSION = 2;

interface DashboardChartItem {
  id: string;
  config: ChartConfig;
}

interface DashboardLayoutV2 {
  version: number;
  charts: DashboardChartItem[];
}

interface Props {
  fileId: string;
  data: RawDataRow[];
  columns: string[];
  columnTypes: ColumnTypes;
  apiFilters: Record<string, Record<string, unknown>>;
}

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: '柱状图',
  line: '折线图',
  area: '面积图',
  pie: '饼图',
  scatter: '散点图',
  histogram: '直方图',
  heatmap: '热力图',
  boxplot: '箱线图',
  radar: '雷达图',
  funnel: '漏斗图',
};

function presetToConfig(preset: QuickPreset): ChartConfig {
  return {
    type: preset.type,
    x_col: preset.x,
    y_cols: preset.y,
    aggfunc: preset.aggfunc ?? 'mean',
    title: preset.label,
    palette: [],
    show_legend: true,
    show_tooltip: true,
    stacked: false,
    smooth: preset.type === 'line' || preset.type === 'area',
    show_x_labels: true,
    sort_by: preset.type === 'bar' ? 'value_desc' : 'none',
  };
}

function defaultConfig(columns: string[], columnTypes: ColumnTypes, data: RawDataRow[]): ChartConfig {
  const { x_col, y_cols } = buildDefaultChartAxes(columns, columnTypes, data);
  return {
    type: 'bar',
    x_col,
    y_cols: y_cols.slice(0, 1),
    aggfunc: 'mean',
    title: x_col && y_cols[0] ? `${x_col} × ${y_cols[0]}` : '新图表',
    palette: [],
    show_legend: true,
    show_tooltip: true,
    stacked: false,
    smooth: false,
    show_x_labels: true,
    sort_by: 'value_desc',
  };
}

function buildAutoCharts(columns: string[], columnTypes: ColumnTypes, data: RawDataRow[]): DashboardChartItem[] {
  const presets = buildQuickPresets(columns, columnTypes, data).slice(0, AUTO_PRESET_COUNT);
  if (presets.length === 0) return [];
  return presets.map(preset => ({
    id: `chart-${crypto.randomUUID()}`,
    config: presetToConfig(preset),
  }));
}

function loadLayout(
  fileId: string,
  columns: string[],
  columnTypes: ColumnTypes,
  data: RawDataRow[],
): DashboardChartItem[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.dashboardLayout(fileId))
      ?? localStorage.getItem(STORAGE_KEYS.dashboardLayoutLegacy(fileId));
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardLayoutV2 | DashboardChartItem[];
      if (!Array.isArray(parsed) && parsed.version === LAYOUT_VERSION && Array.isArray(parsed.charts)) {
        if (parsed.charts.length > 0) return parsed.charts;
      }
    }
  } catch {
    // fall through to auto init
  }
  return buildAutoCharts(columns, columnTypes, data);
}

function saveLayout(fileId: string, charts: DashboardChartItem[]) {
  try {
    const payload: DashboardLayoutV2 = { version: LAYOUT_VERSION, charts };
    localStorage.setItem(STORAGE_KEYS.dashboardLayout(fileId), JSON.stringify(payload));
  } catch {
    // quota exceeded
  }
}

function chartTitle(config: ChartConfig): string {
  if (config.title?.trim()) return config.title;
  return CHART_TYPE_LABELS[config.type] ?? config.type;
}

function DashboardChartCell({
  fileId,
  config,
  apiFilters,
  data,
}: {
  fileId: string;
  config: ChartConfig;
  apiFilters: Record<string, Record<string, unknown>>;
  data: RawDataRow[];
}) {
  const { series, loading } = useChartSeries(fileId, config, apiFilters);
  return (
    <EChartRenderer
      data={data}
      config={config}
      height={CHART_HEIGHT}
      serverSeries={series}
      serverLoading={loading}
    />
  );
}

export default function DashboardMode({ fileId, data, columns, columnTypes, apiFilters }: Props) {
  const [charts, setCharts] = useState<DashboardChartItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const layoutLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fileId || layoutLoadedRef.current === fileId) return;
    layoutLoadedRef.current = fileId;
    setCharts(loadLayout(fileId, columns, columnTypes, data));
    setEditingId(null);
  }, [fileId, columns, columnTypes, data]);

  useEffect(() => {
    if (!fileId || layoutLoadedRef.current !== fileId) return;
    const timer = setTimeout(() => saveLayout(fileId, charts), 500);
    return () => clearTimeout(timer);
  }, [charts, fileId]);

  const editingChart = charts.find(c => c.id === editingId);

  const addChart = () => {
    const id = `chart-${Date.now()}`;
    const item: DashboardChartItem = { id, config: defaultConfig(columns, columnTypes, data) };
    setCharts(prev => [...prev, item]);
    setEditingId(id);
  };

  const removeChart = (id: string) => {
    setCharts(prev => prev.filter(c => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateConfig = (id: string, config: ChartConfig) => {
    setCharts(prev => prev.map(c => (c.id === id ? { ...c, config } : c)));
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="label-section">交互看板</span>
          <p className="font-body text-xs text-frost-dim mt-1">
            基于全量数据聚合，可增删图表、调整维度
          </p>
        </div>
        <button onClick={addChart} className="btn-secondary text-xs">
          <Plus className="w-3.5 h-3.5" />
          添加图表
        </button>
      </div>

      {charts.length === 0 ? (
        <div className="data-card min-h-[320px] flex flex-col items-center justify-center gap-4 p-8">
          <LayoutDashboard className="w-12 h-12 text-midnight-500" />
          <p className="text-frost-dim text-sm text-center">
            暂无图表，点击「添加图表」或等待系统根据数据自动推荐
          </p>
          <button onClick={addChart} className="btn-primary text-xs">
            <Plus className="w-4 h-4" />
            添加第一张图表
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {charts.map(chart => (
            <div
              key={chart.id}
              className={cn(
                'data-card rounded-xl overflow-hidden border transition-shadow min-h-[320px] flex flex-col',
                editingId === chart.id
                  ? 'border-nebula/50 shadow-lg shadow-nebula/10'
                  : 'border-midnight-600/30',
              )}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-midnight-600/30 flex-shrink-0">
                <span className="text-xs text-frost-muted font-body truncate flex-1 mr-2">
                  {chartTitle(chart.config)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingId(editingId === chart.id ? null : chart.id)}
                    className="p-1 rounded hover:bg-midnight-600/40 text-frost-dim hover:text-nebula transition-colors"
                    title="配置图表"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeChart(chart.id)}
                    className="p-1 rounded hover:bg-ruby-subtle text-frost-dim hover:text-ruby transition-colors"
                    title="删除图表"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-2 flex-1">
                <DashboardChartCell
                  fileId={fileId}
                  config={chart.config}
                  apiFilters={apiFilters}
                  data={data}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId && editingChart && (
        <>
          <div
            className="fixed inset-x-0 top-16 bottom-0 bg-black/50 z-40"
            onClick={() => setEditingId(null)}
            aria-hidden
          />
          <div className="fixed right-0 top-16 bottom-0 w-full max-w-sm z-[60] data-card border-l border-midnight-600/40 shadow-2xl overflow-y-auto p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-midnight-900/95 backdrop-blur py-2 -mt-2">
              <span className="label-section">图表配置</span>
              <button
                onClick={() => setEditingId(null)}
                className="p-1 rounded hover:bg-midnight-600/40 text-frost-dim hover:text-frost"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-frost-dim font-body mb-3 truncate">
              {chartTitle(editingChart.config)}
            </p>
            <ChartConfigPanel
              columns={columns}
              columnTypes={columnTypes}
              config={editingChart.config}
              onChange={(config) => updateConfig(editingId, config)}
            />
          </div>
        </>
      )}
    </div>
  );
}