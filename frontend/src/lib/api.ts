import type {
  ActionPlan,
  AiAnalysis,
  ChartData,
  ChartsMeta,
  ColumnTypes,
  Dataset,
  FileInfo,
  Insights,
  RawDataRow,
} from '@/store/useAppStore';

interface ApiResponse {
  success: boolean;
  error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  return res.json() as Promise<T>;
}

export type UploadResponse = ApiResponse & FileInfo;

export type ChartResponse = ApiResponse & {
  charts?: ChartData;
  charts_meta?: ChartsMeta;
  insights?: Insights;
};

export type AnalyzeResponse = ApiResponse & {
  analysis?: AiAnalysis;
};

export type ProcessResponse = ApiResponse & {
  file_info?: FileInfo;
  charts?: ChartData;
  charts_meta?: ChartsMeta;
  insights?: Insights;
  analysis?: AiAnalysis;
};

export type SampleResponse = ApiResponse & Partial<FileInfo> & {
  charts?: ChartData;
  charts_meta?: ChartsMeta;
  insights?: Insights;
};

export type RawDataResponse = ApiResponse & {
  columns?: string[];
  column_types?: ColumnTypes;
  row_count?: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
  sort_col?: string;
  sort_dir?: string;
  data?: RawDataRow[];
};

export type FilterMetaColumn = {
  type: 'category' | 'numeric' | 'text';
  values?: string[];
  min?: number;
  max?: number;
};

export type FilterMetaResponse = ApiResponse & {
  column_types?: ColumnTypes;
  filter_meta?: Record<string, FilterMetaColumn>;
};

export type FilterDataResponse = ApiResponse & {
  row_count?: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
  sort_col?: string;
  sort_dir?: string;
  data?: RawDataRow[];
};

export interface ChartSeriesPayload {
  ready: boolean;
  reason?: string;
  x?: string[];
  series?: { name: string; data: number[] }[];
  pie_data?: { name: string; value: number }[];
  points?: [number, number][];
  x_name?: string;
  y_name?: string;
  bins?: number[];
  labels?: string[];
  corr_data?: [number, number, number][];
  box_data?: number[][];
}

export type ChartSeriesResponse = ApiResponse & {
  series?: ChartSeriesPayload;
  filtered_row_count?: number;
};

export type PivotResponse = ApiResponse & {
  columns?: string[];
  row_count?: number;
  truncated?: boolean;
  data?: RawDataRow[];
};

export type CalculateResponse = ApiResponse & {
  columns?: string[];
  column_types?: ColumnTypes;
  row_count?: number;
  truncated?: boolean;
  data?: RawDataRow[];
};

export type MultiUploadResponse = ApiResponse & {
  datasets?: Dataset[];
};

export type StepToggleResponse = ApiResponse & {
  action?: ActionPlan;
};

export type ActionsResponse = ApiResponse & {
  actions?: ActionPlan[];
};

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<UploadResponse>('/api/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function generateChart(fileId: string) {
  return request<ChartResponse>('/api/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
}

export async function analyzeData(fileId: string) {
  return request<AnalyzeResponse>('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
}

export async function processData(fileId: string) {
  return request<ProcessResponse>('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });
}

export async function loadSample() {
  return request<SampleResponse>('/api/sample');
}

export async function fetchRawData(
  fileId: string,
  opts?: { offset?: number; limit?: number; sort_col?: string; sort_dir?: string },
) {
  const params = new URLSearchParams();
  if (opts?.offset != null) params.set('offset', String(opts.offset));
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.sort_col) params.set('sort_col', opts.sort_col);
  if (opts?.sort_dir) params.set('sort_dir', opts.sort_dir);
  const qs = params.toString();
  return request<RawDataResponse>(`/api/data/${fileId}${qs ? `?${qs}` : ''}`);
}

export async function fetchFilterMeta(fileId: string) {
  return request<FilterMetaResponse>(`/api/data/${fileId}/filter-meta`);
}

export async function filterData(
  fileId: string,
  body: {
    filters: Record<string, unknown>;
    offset?: number;
    limit?: number;
    sort_col?: string;
    sort_dir?: string;
  },
) {
  return request<FilterDataResponse>(`/api/data/${fileId}/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchChartSeries(
  fileId: string,
  body: Record<string, unknown>,
) {
  return request<ChartSeriesResponse>(`/api/data/${fileId}/chart-series`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function pivotData(fileId: string, config: Record<string, string>) {
  return request<PivotResponse>(`/api/data/${fileId}/pivot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export async function calculateColumn(fileId: string, config: { name: string; formula: string }) {
  return request<CalculateResponse>(`/api/data/${fileId}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export async function multiUpload(files: FileList) {
  const formData = new FormData();
  Array.from(files).forEach(f => formData.append('files', f));
  return request<MultiUploadResponse>('/api/multi-upload', {
    method: 'POST',
    body: formData,
  });
}

export async function syncActionPlans(fileId: string, plans: ActionPlan[]) {
  return request<ActionsResponse>('/api/actions/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: fileId, actions: plans }),
  });
}

export async function fetchActions(fileId: string) {
  return request<ActionsResponse>(`/api/actions?session_id=${encodeURIComponent(fileId)}`);
}

export async function toggleActionStep(actionId: string, sessionId: string, stepIndex: number) {
  return request<StepToggleResponse>(`/api/actions/${actionId}/step`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, step_index: stepIndex }),
  });
}