import type { ChartConfig, ChartType, ColumnTypes, RawDataRow } from '@/store/useAppStore';

const ID_KEYWORDS = ['id', '编号', '序号', '准考证', '学号', 'uuid', 'index', '编码'];
const RANK_KEYWORDS = ['校次', '名次', '班次', '排名', 'rank', '排位'];
const TIME_KEYWORDS = ['月', '年', '季', 'date', '日期', '时间', 'Q1', 'Q2', 'Q3', 'Q4'];

export function isIdOrRankCol(name: string): boolean {
  const lower = name.toLowerCase();
  if (ID_KEYWORDS.some((k) => name.includes(k) || lower.includes(k.toLowerCase()))) return true;
  return RANK_KEYWORDS.some((k) => name.includes(k));
}

function uniqueCount(data: RawDataRow[], col: string): number {
  return new Set(data.map((r) => String(r[col] ?? ''))).size;
}

function pickLowCardinalityCol(
  columns: string[],
  columnTypes: ColumnTypes,
  data: RawDataRow[] | undefined,
  min: number,
  max: number,
): string {
  if (!data?.length) return '';
  const candidates = columns
    .filter((c) => columnTypes[c] === 'category' || columnTypes[c] === 'text')
    .map((c) => ({ col: c, unique: uniqueCount(data, c) }))
    .filter((x) => x.unique >= min && x.unique <= max)
    .sort((a, b) => a.unique - b.unique);
  return candidates[0]?.col ?? '';
}

/** 选择适合作为 X 轴的分组列 */
export function pickCategoryCol(
  columns: string[],
  columnTypes: ColumnTypes,
  data?: RawDataRow[],
): string {
  const fromData = pickLowCardinalityCol(columns, columnTypes, data, 2, 50);
  if (fromData) return fromData;

  const catCols = columns.filter((c) => columnTypes[c] === 'category');
  if (catCols.length > 0) return catCols[0];

  const textCols = columns.filter((c) => columnTypes[c] === 'text');
  return textCols[0] || columns[0] || '';
}

/** 选择数值列，排除 ID/排名类 */
export function pickNumericCols(
  columns: string[],
  columnTypes: ColumnTypes,
  limit = 3,
): string[] {
  const filtered = columns.filter(
    (c) => columnTypes[c] === 'numeric' && !isIdOrRankCol(c),
  );
  if (filtered.length > 0) return filtered.slice(0, limit);
  return columns.filter((c) => columnTypes[c] === 'numeric').slice(0, limit);
}

/** 检测时间/周期类列 */
export function pickTimeCol(
  columns: string[],
  columnTypes: ColumnTypes,
  data?: RawDataRow[],
): string {
  if (!data?.length) return '';
  for (const c of columns) {
    if (columnTypes[c] !== 'category' && columnTypes[c] !== 'text') continue;
    const sample = data.slice(0, 8).map((r) => String(r[c] ?? ''));
    if (sample.some((v) => TIME_KEYWORDS.some((kw) => v.includes(kw)))) return c;
  }
  return '';
}

export interface QuickPreset {
  label: string;
  type: ChartType;
  x: string;
  y: string[];
  aggfunc?: ChartConfig['aggfunc'];
}

/** 根据列类型动态生成快捷分析预设 */
export function buildQuickPresets(
  columns: string[],
  columnTypes: ColumnTypes,
  data: RawDataRow[],
): QuickPreset[] {
  const numCols = pickNumericCols(columns, columnTypes, 10);
  if (numCols.length === 0) return [];

  const catCol = pickCategoryCol(columns, columnTypes, data);
  const primary = numCols[0];
  const secondary = numCols[1];
  const presets: QuickPreset[] = [];

  if (catCol && primary) {
    presets.push({
      label: `${catCol} × ${primary}`,
      type: 'bar',
      x: catCol,
      y: [primary],
      aggfunc: 'mean',
    });
  }

  if (catCol && numCols.length >= 2) {
    presets.push({
      label: `${catCol} 多指标`,
      type: 'bar',
      x: catCol,
      y: numCols.slice(0, Math.min(4, numCols.length)),
      aggfunc: 'mean',
    });
  }

  presets.push({
    label: `${primary} 分布`,
    type: 'histogram',
    x: '',
    y: [primary],
  });

  if (numCols.length >= 2) {
    presets.push({
      label: '数值相关性',
      type: 'heatmap',
      x: '',
      y: numCols.slice(0, Math.min(9, numCols.length)),
    });
  }

  if (catCol && primary) {
    presets.push({
      label: `${primary} 箱线图`,
      type: 'boxplot',
      x: catCol,
      y: [primary],
    });
  }

  if (primary && secondary) {
    presets.push({
      label: `${primary} vs ${secondary}`,
      type: 'scatter',
      x: primary,
      y: [secondary],
    });
  }

  const timeCol = pickTimeCol(columns, columnTypes, data);
  if (timeCol && primary) {
    presets.push({
      label: `${timeCol} 趋势`,
      type: 'line',
      x: timeCol,
      y: [primary],
      aggfunc: 'sum',
    });
  }

  return presets.filter((p) => p.y.length > 0).slice(0, 6);
}

export function buildDefaultChartAxes(
  columns: string[],
  columnTypes: ColumnTypes,
  data?: RawDataRow[],
): { x_col: string; y_cols: string[] } {
  return {
    x_col: pickCategoryCol(columns, columnTypes, data),
    y_cols: pickNumericCols(columns, columnTypes, 3),
  };
}