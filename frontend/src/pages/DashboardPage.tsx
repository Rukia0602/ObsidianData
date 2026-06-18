import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, type ChartConfig, type ChartType, type RawDataRow } from '@/store/useAppStore';
import EChartRenderer, { type EChartRendererHandle } from '@/components/EChartRenderer';
import ChartConfigPanel from '@/components/ChartConfigPanel';
import DataFilterPanel, { type DataFilterState } from '@/components/DataFilterPanel';
import DataPreviewTable from '@/components/DataPreviewTable';
import DataTransformPanel from '@/components/DataTransformPanel';
import { useChartSeries } from '@/hooks/useChartSeries';
import StaticChartGallery from '@/components/StaticChartGallery';
import MultiDatasetCompare from '@/components/MultiDatasetCompare';
import InsightPanel from '@/components/InsightPanel';
import AIInsightCard from '@/components/AIInsightCard';
import ActionTracker from '@/components/ActionTracker';
import PrintReport from '@/components/PrintReport';
import {
  LayoutDashboard, SlidersHorizontal, Grid3x3, GitCompare,
  Brain, ListChecks, Download, FileText, BarChart3, AlertCircle,
} from 'lucide-react';
import type { FilterMetaColumn } from '@/lib/api';
import { fetchActions, fetchFilterMeta, fetchRawData, filterData } from '@/lib/api';
import { buildApiFilters } from '@/lib/dataFilters';

const DashboardMode = lazy(() => import('@/components/DashboardMode'));
import { buildDefaultChartAxes, buildQuickPresets } from '@/lib/columnInference';
import { loadActiveSession } from '@/lib/sessionStorage';
import { cn } from '@/lib/utils';

type TabKey = 'explore' | 'dashboard' | 'compare' | 'ai' | 'actions';

const tabItems: { key: TabKey; icon: React.ReactNode; label: string; accent: string }[] = [
  { key: 'explore', icon: <SlidersHorizontal className="w-4 h-4" />, label: '交互探索', accent: 'from-cyan to-nebula' },
  { key: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: '仪表盘看板', accent: 'from-nebula to-violet' },
  { key: 'compare', icon: <GitCompare className="w-4 h-4" />, label: '多数据集对比', accent: 'from-emerald to-cyan' },
  { key: 'ai', icon: <Brain className="w-4 h-4" />, label: '洞察分析', accent: 'from-violet to-nebula' },
  { key: 'actions', icon: <ListChecks className="w-4 h-4" />, label: '行动计划', accent: 'from-amber to-ruby' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    fileInfo, charts, insights, aiAnalysis, actions, loading, error,
    rawData, columnTypes, rowCount, filteredRowCount,
    setFileInfo, setCharts, setChartsMeta, setInsights, setAiAnalysis, setActions,
    setRawData, setColumnTypes, setFilteredData, setError,
  } = useAppStore();

  const exploreChartRef = useRef<EChartRendererHandle>(null);

  const [tab, setTab] = useState<TabKey>('explore');
  const [filteredData, setLocalFiltered] = useState<RawDataRow[]>([]);
  const [showFilter, setShowFilter] = useState(true);
  const [showTransform, setShowTransform] = useState(false);

  // 图表配置
  const columns = Object.keys(columnTypes);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar' as ChartType,
    x_col: '',
    y_cols: [],
    aggfunc: 'sum',
    title: '',
    palette: [],
    show_legend: true,
    show_tooltip: true,
    stacked: false,
    smooth: false,
    show_x_labels: true,
    sort_by: 'none',
  });
  const [sessionReady, setSessionReady] = useState(false);
  const [filterMeta, setFilterMeta] = useState<Record<string, FilterMetaColumn>>({});
  const [activeFilters, setActiveFilters] = useState<DataFilterState>({});
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiFilters = useMemo(() => buildApiFilters(activeFilters), [activeFilters]);
  const { series: chartSeries, loading: chartLoading } = useChartSeries(
    fileInfo?.file_id ?? '',
    chartConfig,
    apiFilters,
  );

  // 刷新后从 sessionStorage 恢复上下文
  useEffect(() => {
    const state = useAppStore.getState();
    if (!state.fileInfo && !state.charts) {
      const saved = loadActiveSession();
      if (saved) {
        setFileInfo(saved.fileInfo);
        setCharts(saved.charts);
        setChartsMeta(saved.chartsMeta);
        setAiAnalysis(saved.aiAnalysis);
        setInsights(saved.insights);
      }
    }
    setSessionReady(true);
  }, [setFileInfo, setCharts, setChartsMeta, setAiAnalysis, setInsights]);

  // 加载持久化的行动计划
  useEffect(() => {
    if (!fileInfo?.file_id) return;
    let cancelled = false;

    fetchActions(fileInfo.file_id)
      .then(res => {
        if (cancelled) return;
        if (res.success && res.actions) {
          setActions(res.actions);
        }
      })
      .catch(() => { /* 静默失败，保留 store 中已有 actions */ });

    return () => { cancelled = true; };
  }, [fileInfo?.file_id, setActions]);

  // 分页加载预览数据 + 筛选元数据
  useEffect(() => {
    if (!fileInfo) return;
    let cancelled = false;

    Promise.all([
      fetchRawData(fileInfo.file_id, { offset: 0, limit: 100 }),
      fetchFilterMeta(fileInfo.file_id),
    ])
      .then(([data, meta]) => {
        if (cancelled) return;
        if (!data.success) {
          setError(data.error || '数据加载失败');
          return;
        }
        setError(null);
        if (data.data) setRawData(data.data, data.row_count);
        if (data.column_types) setColumnTypes(data.column_types);
        if (meta.success && meta.filter_meta) setFilterMeta(meta.filter_meta);
        const cols = data.columns as string[];
        const types = data.column_types ?? {};
        const rows = data.data ?? [];
        const { x_col, y_cols } = buildDefaultChartAxes(cols, types, rows);

        setChartConfig(prev => ({
          ...prev,
          x_col,
          y_cols,
          title: '',
        }));
      })
      .catch(() => {
        if (!cancelled) setError('网络请求失败，请检查后端服务');
      });

    return () => { cancelled = true; };
  }, [fileInfo, setRawData, setColumnTypes, setError]);

  // 服务端筛选（防抖）
  const handleFiltersChange = useCallback((filters: DataFilterState) => {
    setActiveFilters(filters);
    if (!fileInfo) return;
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(async () => {
      try {
        const res = await filterData(fileInfo.file_id, { filters: buildApiFilters(filters), offset: 0, limit: 100 });
        if (res.success && res.data) {
          setLocalFiltered(res.data);
          setFilteredData(res.data, res.row_count);
        }
      } catch {
        setError('筛选请求失败');
      }
    }, 300);
  }, [fileInfo, setFilteredData, setError]);

  useEffect(() => {
    setLocalFiltered(rawData);
    setFilteredData(rawData, rowCount);
  }, [rawData, rowCount, setFilteredData]);

  const quickPresets = useMemo(
    () => (rawData.length > 0 ? buildQuickPresets(columns, columnTypes, rawData) : []),
    [rawData, columns, columnTypes],
  );

  if (!sessionReady) {
    return null;
  }

  if (!charts && !loading && rawData.length === 0 && !fileInfo) {
    navigate('/');
    return null;
  }

  const exportPDF = () => {
    if (!aiAnalysis && !charts && actions.length === 0) {
      setError('暂无报告内容，请先完成数据分析');
      return;
    }
    window.print();
  };

  // 图表导出为图片（仅导出交互探索区当前图表）
  const exportChartImage = () => {
    const ok = exploreChartRef.current?.exportImage(chartConfig.title || 'chart');
    if (!ok) setError('图表导出失败，请确认图表已渲染');
  };

  return (
    <>
      <PrintReport />
      <div className="no-print min-h-screen pt-24 pb-16 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nebula to-nebula-dark flex items-center justify-center shadow-lg shadow-nebula/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-body text-xs text-nebula font-medium block">
                {fileInfo?.file_name || 'DASHBOARD'}
              </span>
              <h2 className="font-display text-2xl text-frost tracking-tight mt-0.5">
                数据探索
              </h2>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportChartImage} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" /> 导出图表
            </button>
            <button onClick={exportPDF} className="btn-secondary text-xs">
              <FileText className="w-3.5 h-3.5" /> 导出报告
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-ruby-subtle border border-ruby/20 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-ruby flex-shrink-0" />
            <span className="font-body text-xs text-ruby-light">{error}</span>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 border-b border-midnight-600/40 animate-fade-in-down overflow-x-auto">
          {tabItems.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 font-body text-sm transition-all relative whitespace-nowrap',
                tab === t.key ? 'text-frost font-medium' : 'text-frost-dim hover:text-frost-muted'
              )}
            >
              {t.icon}
              {t.label}
              {tab === t.key && <div className={cn('absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r', t.accent)} />}
            </button>
          ))}
        </div>

        {/* 交互探索 */}
        {tab === 'explore' && (
          <div className="flex gap-4 animate-fade-in">
            {/* 左侧控制区 */}
            <div className="w-72 flex-shrink-0 space-y-4">
              {showFilter && (
                <div className="data-card p-4">
                  <DataFilterPanel
                    columns={columns}
                    columnTypes={columnTypes}
                    filterMeta={filterMeta}
                    onFiltersChange={handleFiltersChange}
                  />
                </div>
              )}

              <div className="data-card p-4">
                <ChartConfigPanel
                  columns={columns}
                  columnTypes={columnTypes}
                  config={chartConfig}
                  onChange={setChartConfig}
                />
              </div>

              {/* 数据转换面板 */}
              <div className="data-card p-4">
                <button
                  onClick={() => setShowTransform(!showTransform)}
                  className="flex items-center gap-2 w-full"
                >
                  <Grid3x3 className="w-3.5 h-3.5 text-emerald" />
                  <span className="label-section">数据透视 / 计算列</span>
                </button>
                {showTransform && (
                  <div className="mt-3">
                    <DataTransformPanel />
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowFilter(!showFilter)}
                className="text-xs text-frost-dim hover:text-frost font-body"
              >
                {showFilter ? '隐藏' : '显示'}筛选面板
              </button>
            </div>

            {/* 右侧图表区 */}
            <div className="flex-1 space-y-4">
              {quickPresets.length > 0 && (
                <div className="data-card p-3">
                  <span className="label-section block mb-2 text-nebula">快捷分析</span>
                  <div className="flex flex-wrap gap-2">
                    {quickPresets.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setChartConfig(prev => ({
                          ...prev,
                          type: p.type,
                          x_col: p.x || prev.x_col,
                          y_cols: p.y,
                          aggfunc: p.aggfunc || prev.aggfunc,
                          sort_by: 'value_desc' as const,
                          title: p.label,
                        }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-body bg-midnight-700/50 border border-midnight-600/30 text-frost-muted hover:text-nebula hover:border-nebula/40 hover:bg-nebula-subtle/20 transition-all"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="data-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="label-section">
                    {filteredRowCount} 行{filteredRowCount > filteredData.length ? `（预览 ${filteredData.length} 行）` : ''}
                  </span>
                  <span className="text-xs text-frost-dim font-mono">{chartConfig.type.toUpperCase()}</span>
                </div>
                <EChartRenderer
                  ref={exploreChartRef}
                  data={filteredData}
                  config={chartConfig}
                  height={420}
                  serverSeries={chartSeries}
                  serverLoading={chartLoading}
                />
              </div>

              {fileInfo && (
                <DataPreviewTable
                  fileId={fileInfo.file_id}
                  columns={columns}
                  columnTypes={columnTypes}
                  totalRows={filteredRowCount}
                  activeFilters={activeFilters}
                />
              )}
            </div>
          </div>
        )}

        {/* 仪表盘看板 */}
        {tab === 'dashboard' && (
          <div className="animate-fade-in space-y-8">
            <section>
              <div className="mb-4">
                <span className="label-section">自动分析图表</span>
                <p className="font-body text-xs text-frost-dim mt-1">
                  规则引擎一次性生成，matplotlib 静态图
                </p>
              </div>
              <StaticChartGallery />
            </section>

            <section className="border-t border-midnight-600/40 pt-8">
              <Suspense fallback={
                <div className="flex items-center justify-center py-16 text-frost-muted text-sm">交互看板加载中…</div>
              }>
                <DashboardMode
                  fileId={fileInfo?.file_id ?? ''}
                  data={filteredData}
                  columns={columns}
                  columnTypes={columnTypes}
                  apiFilters={apiFilters}
                />
              </Suspense>
            </section>
          </div>
        )}

        {/* 多数据集对比 */}
        {tab === 'compare' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <MultiDatasetCompare />
          </div>
        )}

        {/* 洞察分析 */}
        {tab === 'ai' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <AIInsightCard analysis={aiAnalysis} />
            <div className="mt-6">
              <InsightPanel insights={insights} />
            </div>
          </div>
        )}

        {/* 行动计划 */}
        {tab === 'actions' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <ActionTracker />
          </div>
        )}
      </div>
    </div>
    </>
  );
}
