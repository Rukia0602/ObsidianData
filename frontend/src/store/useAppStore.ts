import { create } from 'zustand';

export interface FileInfo {
  file_id: string;
  file_name: string;
  row_count: number;
  col_count: number;
  file_size: number;
  columns: string[];
  preview_rows: string[][];
}

export interface ChartData {
  dashboard?: string;
  pie?: string;
  line?: string;
  bar?: string;
  scatter?: string;
}

export interface ChartMetaEntry {
  status: 'generated' | 'skipped';
  reason?: string;
  fallback?: boolean;
}

export type ChartsMeta = Record<string, ChartMetaEntry>;

// 原始数据（用于ECharts交互式图表）
export interface RawDataRow {
  [key: string]: string | number | null;
}

export interface ColumnTypes {
  [key: string]: 'numeric' | 'category' | 'text';
}

export interface Dataset {
  file_id: string;
  file_name: string;
  row_count: number;
  truncated?: boolean;
  columns: string[];
  column_types?: ColumnTypes;
  data: RawDataRow[];
  error?: string;
}

// 图表配置
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'heatmap' | 'boxplot' | 'radar' | 'area' | 'funnel';

export interface ChartConfig {
  type: ChartType;
  x_col: string;
  y_cols: string[];
  aggfunc: 'sum' | 'mean' | 'count' | 'min' | 'max';
  title: string;
  palette: string[];
  show_legend: boolean;
  show_tooltip: boolean;
  stacked: boolean;
  smooth: boolean;
  show_x_labels: boolean;    // 是否显示X轴标签
  sort_by: 'none' | 'value_desc' | 'value_asc' | 'name_asc' | 'name_desc';  // 排序方式
}

export interface Insights {
  [key: string]: string | number;
}

export interface AiFinding {
  type: string;
  title: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  content: string;
}

export interface AiRecommendation {
  id: number;
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  impact: string;
  effort: string;
}

export interface ActionPlan {
  id: string;
  category: string;
  title: string;
  description: string;
  owner: string;
  deadline: string;
  measurable_kpi: string;
  priority: 'high' | 'medium' | 'low';
  steps: string[];
  created_at: string;
  updated_at?: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
}

export interface AiAnalysis {
  summary: string;
  findings: AiFinding[];
  recommendations: AiRecommendation[];
  action_plans: ActionPlan[];
  generated_at: string;
}

interface AppState {
  file: File | null;
  fileInfo: FileInfo | null;
  charts: ChartData | null;
  chartsMeta: ChartsMeta | null;
  insights: Insights | null;
  aiAnalysis: AiAnalysis | null;
  actions: ActionPlan[];
  loading: boolean;
  error: string | null;
  // 交互式图表状态（rawData / filteredData 为分页预览，非全量）
  rawData: RawDataRow[];
  columnTypes: ColumnTypes;
  filteredData: RawDataRow[];
  rowCount: number;
  filteredRowCount: number;
  setFile: (file: File | null) => void;
  setFileInfo: (info: FileInfo | null) => void;
  setCharts: (charts: ChartData | null) => void;
  setChartsMeta: (meta: ChartsMeta | null) => void;
  setInsights: (insights: Insights | null) => void;
  setAiAnalysis: (analysis: AiAnalysis | null) => void;
  setActions: (actions: ActionPlan[]) => void;
  updateAction: (id: string, patch: Partial<ActionPlan>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRawData: (data: RawDataRow[], rowCount?: number) => void;
  setColumnTypes: (types: ColumnTypes) => void;
  setFilteredData: (data: RawDataRow[], filteredRowCount?: number) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  file: null,
  fileInfo: null,
  charts: null,
  chartsMeta: null,
  insights: null,
  aiAnalysis: null,
  actions: [],
  loading: false,
  error: null,
  rawData: [],
  columnTypes: {},
  filteredData: [],
  rowCount: 0,
  filteredRowCount: 0,
  setFile: (file) => set({ file, error: null }),
  setFileInfo: (info) => set({ fileInfo: info }),
  setCharts: (charts) => set({ charts }),
  setChartsMeta: (chartsMeta) => set({ chartsMeta }),
  setInsights: (insights) => set({ insights }),
  setAiAnalysis: (aiAnalysis) => set({ aiAnalysis }),
  setActions: (actions) => set({ actions }),
  updateAction: (id, patch) => set((state) => ({
    actions: state.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setRawData: (rawData, rowCount) => set({
    rawData,
    filteredData: rawData,
    rowCount: rowCount ?? rawData.length,
    filteredRowCount: rowCount ?? rawData.length,
  }),
  setColumnTypes: (columnTypes) => set({ columnTypes }),
  setFilteredData: (filteredData, filteredRowCount) => set({
    filteredData,
    filteredRowCount: filteredRowCount ?? filteredData.length,
  }),
  reset: () => set({
    file: null,
    fileInfo: null,
    charts: null,
    chartsMeta: null,
    insights: null,
    aiAnalysis: null,
    actions: [],
    loading: false,
    error: null,
    rawData: [],
    columnTypes: {},
    filteredData: [],
    rowCount: 0,
    filteredRowCount: 0,
  }),
}));
