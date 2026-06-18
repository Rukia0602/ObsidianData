/**
 * ECharts 交互式图表渲染器
 * 支持10种图表：柱状图、折线图、面积图、饼图、散点图、直方图、热力图、箱线图、雷达图、漏斗图
 * 暗色主题、tooltip悬浮、图例可点击切换、数据缩放
 */
import { useMemo, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import echarts from '@/lib/echartsCore';
import type { ChartSeriesPayload } from '@/lib/api';
import type { ChartConfig, RawDataRow } from '@/store/useAppStore';

// ECharts 类型过于严格，用 any 简化
type EChartsOption = any;

// 默认棱镜配色
const DEFAULT_PALETTE = [
  '#6C8CFF', '#34D399', '#F59E0B', '#EF4444',
  '#A78BFA', '#22D3EE', '#FBBF24', '#F87171',
];

export interface EChartRendererHandle {
  exportImage: (filename?: string) => boolean;
}

interface Props {
  data: RawDataRow[];
  config: ChartConfig;
  height?: number;
  onEvents?: Record<string, (params: any) => void>;
  serverSeries?: ChartSeriesPayload | null;
  serverLoading?: boolean;
}

/** 按x列聚合数据，支持排序 */
function aggregate(data: RawDataRow[], xCol: string, yCol: string, aggfunc: string,
                   sortBy: string = 'none'): { x: string[]; y: number[] } {
  const groups = new Map<string, number[]>();
  for (const row of data) {
    const x = String(row[xCol] ?? '');
    const y = Number(row[yCol]);
    if (!groups.has(x)) groups.set(x, []);
    if (!isNaN(y)) groups.get(x)!.push(y);
  }
  let entries: [string, number][] = [];
  for (const [key, vals] of groups) {
    let val: number;
    switch (aggfunc) {
      case 'mean': val = vals.reduce((a, b) => a + b, 0) / vals.length; break;
      case 'count': val = vals.length; break;
      case 'min': val = Math.min(...vals); break;
      case 'max': val = Math.max(...vals); break;
      default: val = vals.reduce((a, b) => a + b, 0); // sum
    }
    entries.push([key, Math.round(val * 100) / 100]);
  }

  // 排序
  switch (sortBy) {
    case 'value_desc': entries.sort((a, b) => b[1] - a[1]); break;
    case 'value_asc': entries.sort((a, b) => a[1] - b[1]); break;
    case 'name_asc': entries.sort((a, b) => a[0].localeCompare(b[0], 'zh-CN')); break;
    case 'name_desc': entries.sort((a, b) => b[0].localeCompare(a[0], 'zh-CN')); break;
  }

  return { x: entries.map(e => e[0]), y: entries.map(e => e[1]) };
}

/** 按行配对计算 Pearson 相关系数，避免分列过滤导致错位 */
function pearsonCorrelation(data: RawDataRow[], col1: string, col2: string): number {
  const pairs: [number, number][] = [];
  for (const row of data) {
    const v1 = Number(row[col1]);
    const v2 = Number(row[col2]);
    if (!isNaN(v1) && !isNaN(v2)) pairs.push([v1, v2]);
  }
  const n = pairs.length;
  if (n < 2) return 0;
  const m1 = pairs.reduce((a, p) => a + p[0], 0) / n;
  const m2 = pairs.reduce((a, p) => a + p[1], 0) / n;
  let cov = 0, s1 = 0, s2 = 0;
  for (const [v1, v2] of pairs) {
    cov += (v1 - m1) * (v2 - m2);
    s1 += (v1 - m1) ** 2;
    s2 += (v2 - m2) ** 2;
  }
  return s1 && s2 ? cov / Math.sqrt(s1 * s2) : 0;
}

const EChartRenderer = forwardRef<EChartRendererHandle, Props>(function EChartRenderer(
  { data, config, height = 380, onEvents, serverSeries, serverLoading },
  ref,
) {
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { option, emptyReason } = useMemo(() => {
    if (serverSeries?.ready) return buildOptionFromServer(serverSeries, config);
    return buildOption(data, config);
  }, [data, config, serverSeries]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => {
      chartRef.current?.getEchartsInstance()?.resize();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    exportImage(filename = 'chart') {
      const instance = chartRef.current?.getEchartsInstance();
      if (!instance) return false;
      const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#151821' });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = url;
      link.click();
      return true;
    },
  }), []);

  if (serverLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-midnight-600/40"
        style={{ height: `${height}px` }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-nebula/30 border-t-nebula animate-spin" />
        <p className="text-sm text-frost-muted">图表数据加载中…</p>
      </div>
    );
  }

  if (emptyReason) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-midnight-600/40"
        style={{ height: `${height}px` }}
      >
        <span className="text-3xl">📊</span>
        <p className="text-sm text-frost-muted">{emptyReason}</p>
        <p className="text-xs text-frost-dim font-body">请在左侧面板选择数据列</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <ReactECharts
        ref={chartRef}
        echarts={echarts}
        option={option}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
        onEvents={onEvents}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
});

export default EChartRenderer;

function buildBaseOption(config: ChartConfig, catCount: number): EChartsOption {
  const palette = config.palette?.length ? config.palette : DEFAULT_PALETTE;
  const { title, show_legend, show_tooltip } = config;
  const manyCats = catCount > 8;
  const veryManyCats = catCount > 15;
  const catLabelRotation = manyCats ? (veryManyCats ? 60 : 35) : 0;
  const catLabelInterval = veryManyCats ? Math.max(1, Math.floor(catCount / 12)) : 0;
  const labelExtra = catLabelRotation > 45 ? 36 : (catLabelRotation > 0 ? 18 : 0);
  const legendH = show_legend ? 22 : 0;
  const gridBottom = 40 + labelExtra + legendH;

  return {
    backgroundColor: 'transparent',
    color: palette,
    animation: true,
    animationDuration: 800,
    animationDurationUpdate: 400,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    title: title ? {
      text: title,
      left: 'center',
      textStyle: { color: '#E8E8ED', fontSize: 14, fontWeight: 600 },
    } : undefined,
    tooltip: show_tooltip ? {
      trigger: 'axis',
      backgroundColor: 'rgba(21,24,33,0.95)',
      borderColor: 'rgba(108,140,255,0.4)',
      borderWidth: 1,
      borderRadius: 8,
      padding: [8, 12],
      textStyle: { color: '#E8E8ED', fontSize: 12 },
      axisPointer: { type: 'cross', lineStyle: { color: 'rgba(108,140,255,0.5)', type: 'dashed' }, label: { backgroundColor: '#6C8CFF' } },
    } : undefined,
    legend: show_legend ? {
      bottom: 0,
      textStyle: { color: '#9498A5' },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
    } : undefined,
    grid: { left: 60, right: 60, top: title ? 60 : 35, bottom: gridBottom, containLabel: true },
    xAxis: { type: 'category', axisLine: { lineStyle: { color: '#2A2E3E' } }, axisLabel: { color: '#9498A5', show: config.show_x_labels, rotate: catLabelRotation, interval: catLabelInterval }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#2A2E3E' } }, axisLabel: { color: '#9498A5' }, splitLine: { lineStyle: { color: '#2A2E3E', type: 'dashed' } } },
  };
}

function buildOptionFromServer(series: ChartSeriesPayload, config: ChartConfig): { option: EChartsOption; emptyReason?: string } {
  const palette = config.palette?.length ? config.palette : DEFAULT_PALETTE;
  const { type, stacked, smooth, show_tooltip } = config;

  if (type === 'pie' && series.pie_data) {
    const baseOption = buildBaseOption(config, series.pie_data.length);
    return { option: {
      ...baseOption,
      tooltip: { ...baseOption.tooltip, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '50%'],
        data: series.pie_data,
        label: { color: '#9498A5', formatter: '{b}\n{d}%' },
        labelLine: { lineStyle: { color: '#3A3F50' } },
        emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(108,140,255,0.4)' }, scaleSize: 8 },
        itemStyle: { borderColor: '#151821', borderWidth: 2 },
      }],
    } };
  }

  if (type === 'scatter' && series.points) {
    const baseOption = buildBaseOption(config, 0);
    return { option: {
      ...baseOption,
      tooltip: { ...baseOption.tooltip, trigger: 'item', formatter: (p: any) => `(${p.value[0]}, ${p.value[1]})` },
      xAxis: { ...baseOption.xAxis, type: 'value', name: series.x_name, nameTextStyle: { color: '#9498A5' } },
      yAxis: { ...baseOption.yAxis, name: series.y_name, nameTextStyle: { color: '#9498A5' } },
      series: [{
        type: 'scatter',
        data: series.points,
        symbolSize: 10,
        itemStyle: { color: palette[0], opacity: 0.8, shadowBlur: 8, shadowColor: 'rgba(108,140,255,0.3)' },
        emphasis: { itemStyle: { shadowBlur: 15 } },
      }],
    } };
  }

  if (type === 'histogram' && series.bins && series.x) {
    const baseOption = buildBaseOption(config, series.x.length);
    return { option: {
      ...baseOption,
      xAxis: { ...baseOption.xAxis, data: series.x, axisLabel: { ...baseOption.xAxis?.axisLabel, rotate: 30 } },
      series: [{
        type: 'bar',
        data: series.bins,
        itemStyle: { color: palette[0], borderRadius: [4, 4, 0, 0] },
        barCategoryGap: '0%',
      }],
    } };
  }

  if (type === 'heatmap' && series.corr_data && series.labels) {
    const baseOption = buildBaseOption(config, series.labels.length);
    return { option: {
      ...baseOption,
      tooltip: { ...baseOption.tooltip, formatter: (p: any) => `${series.labels![p.value[1]]} × ${series.labels![p.value[0]]}<br/>相关系数: <b>${p.value[2]}</b>` },
      grid: { ...baseOption.grid, bottom: '20%' },
      xAxis: { type: 'category', data: series.labels, axisLabel: { color: '#9498A5', rotate: 45 }, splitArea: { show: true } },
      yAxis: { type: 'category', data: series.labels, axisLabel: { color: '#9498A5' }, splitArea: { show: true } },
      visualMap: {
        min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: '2%',
        textStyle: { color: '#9498A5' },
        inRange: { color: ['#EF4444', '#2A2E3E', '#34D399'] },
      },
      series: [{
        type: 'heatmap', data: series.corr_data,
        label: { show: true, color: '#fff', fontSize: 10 },
        emphasis: { itemStyle: { shadowBlur: 10 } },
      }],
    } };
  }

  if (type === 'boxplot' && series.box_data && series.x) {
    const baseOption = buildBaseOption(config, series.x.length);
    return { option: {
      ...baseOption,
      xAxis: { ...baseOption.xAxis, data: series.x },
      series: [{
        name: series.y_name, type: 'boxplot', data: series.box_data,
        itemStyle: { color: 'rgba(108,140,255,0.3)', borderColor: palette[0] },
      }],
    } };
  }

  if (series.x && series.series) {
    const catCount = series.x.length;
    const baseOption = buildBaseOption(config, catCount);

    if (type === 'funnel' && series.series[0]) {
      const funnelData = series.x
        .map((name, idx) => ({ name, value: series.series![0].data[idx] ?? 0 }))
        .sort((a, b) => b.value - a.value);
      return { option: {
        ...baseOption,
        tooltip: { ...baseOption.tooltip, trigger: 'item', formatter: '{b}: {c}' },
        series: [{
          type: 'funnel',
          data: funnelData,
          sort: 'descending',
          label: { color: '#E8E8ED' },
          itemStyle: { borderColor: '#151821', borderWidth: 2 },
          emphasis: { label: { fontSize: 14 } },
        }],
      } };
    }

    if (type === 'radar') {
      const indicators = series.series.map(s => ({
        name: s.name,
        max: Math.max(...s.data, 1) * 1.1,
      }));
      const radarData = series.x.map((xVal, xi) => ({
        name: xVal,
        value: series.series!.map(s => s.data[xi] ?? 0),
      }));
      return { option: {
        ...baseOption,
        radar: { indicator: indicators, axisName: { color: '#9498A5' }, splitArea: { areaStyle: { color: ['rgba(21,24,33,0.3)', 'rgba(30,34,48,0.3)'] } } },
        series: [{ type: 'radar', data: radarData, areaStyle: { opacity: 0.1 } }],
      } };
    }

    const chartSeries = series.series.map((s, i) => {
      const baseColor = palette[i % palette.length];
      const lighterColor = baseColor + 'CC';
      if (type === 'line' || type === 'area') {
        return {
          name: s.name,
          type: 'line',
          data: s.data,
          smooth,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2.5, color: baseColor, shadowColor: baseColor + '60', shadowBlur: 4 },
          itemStyle: { color: baseColor, borderColor: '#fff', borderWidth: 1.5 },
          areaStyle: type === 'area' ? {
            opacity: 0.2,
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: baseColor + '60' },
                { offset: 1, color: baseColor + '05' },
              ],
            },
          } : undefined,
          emphasis: { focus: 'series', lineStyle: { width: 3.5 }, itemStyle: { shadowBlur: 12, shadowColor: baseColor } },
          animationDelay: (idx: number) => idx * 60,
        };
      }
      return {
        name: s.name,
        type: 'bar',
        data: s.data,
        stack: stacked ? 'total' : undefined,
        barMaxWidth: 40,
        itemStyle: {
          borderRadius: stacked ? 0 : [6, 6, 0, 0],
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: baseColor },
              { offset: 1, color: lighterColor },
            ],
          },
          shadowColor: baseColor + '40',
          shadowBlur: 0,
        },
        emphasis: {
          itemStyle: { shadowBlur: 16, shadowColor: baseColor + '80', borderColor: baseColor, borderWidth: 1 },
          scale: true,
          scaleSize: 1.05,
        },
        animationDelay: (idx: number) => idx * 50,
      };
    });

    return { option: { ...baseOption, xAxis: { ...(baseOption.xAxis as any), data: series.x }, series: chartSeries } };
  }

  return { option: {}, emptyReason: series.reason || '图表数据不可用' };
}

function buildOption(data: RawDataRow[], config: ChartConfig): { option: EChartsOption; emptyReason?: string } {
  const palette = config.palette?.length ? config.palette : DEFAULT_PALETTE;
  const { type, x_col, y_cols, aggfunc, title, show_legend, show_tooltip, stacked, smooth, show_x_labels, sort_by } = config;

  if (!data || data.length === 0) {
    return { option: {}, emptyReason: '暂无数据，请先上传数据文件' };
  }

  const needsXCol = type !== 'histogram' && type !== 'heatmap';
  if (needsXCol && (!x_col || !y_cols || y_cols.length === 0)) {
    return { option: {}, emptyReason: '请选择 X 轴和 Y 轴数据列' };
  }
  if (type === 'histogram' && (!y_cols || y_cols.length === 0)) {
    return { option: {}, emptyReason: '请选择 Y 轴数据列' };
  }

  // 检查是否有至少一个 Y 列有有效数据（热力图自动检测数值列，跳过此检查）
  if (type !== 'heatmap') {
    const hasValidY = y_cols.some(ycol => data.some(r => r[ycol] != null && !isNaN(Number(r[ycol]))));
    if (!hasValidY) {
      return { option: {}, emptyReason: '所选 Y 轴列中无有效数值数据' };
    }
  }

  // ── 智能布局：分类多时旋转标签、加宽底部 ──
  const catCount = y_cols[0]
    ? (() => {
        const agg = aggregate(data, x_col, y_cols[0], aggfunc, sort_by);
        return agg.x.length;
      })()
    : 0;
  const manyCats = catCount > 8;
  const veryManyCats = catCount > 15;
  // 标签旋转：>8 个转 35°，>15 个转 60°
  const catLabelRotation = manyCats ? (veryManyCats ? 60 : 35) : 0;
  const catLabelInterval = veryManyCats ? Math.max(1, Math.floor(catCount / 12)) : 0;
  // 底部空间：基准 45px + 旋转额外空间 + 图例
  const labelExtra = catLabelRotation > 45 ? 36 : (catLabelRotation > 0 ? 18 : 0);
  const legendH = show_legend ? 22 : 0;
  const gridBottom = 40 + labelExtra + legendH;

  const baseOption: EChartsOption = {
    backgroundColor: 'transparent',
    color: palette,
    animation: true,
    animationDuration: 800,
    animationDurationUpdate: 400,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    title: title ? {
      text: title,
      left: 'center',
      textStyle: { color: '#E8E8ED', fontSize: 14, fontWeight: 600 },
    } : undefined,
    tooltip: show_tooltip ? {
      trigger: type === 'scatter' || type === 'heatmap' ? 'item' : 'axis',
      backgroundColor: 'rgba(21,24,33,0.95)',
      borderColor: 'rgba(108,140,255,0.4)',
      borderWidth: 1,
      borderRadius: 8,
      padding: [8, 12],
      textStyle: { color: '#E8E8ED', fontSize: 12 },
      axisPointer: { type: 'cross', lineStyle: { color: 'rgba(108,140,255,0.5)', type: 'dashed' }, label: { backgroundColor: '#6C8CFF' } },
    } : undefined,
    legend: show_legend ? {
      bottom: 0,
      textStyle: { color: '#9498A5' },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
    } : undefined,
    grid: { left: 60, right: 60, top: title ? 60 : 35, bottom: gridBottom, containLabel: true },
    xAxis: { type: 'category', axisLine: { lineStyle: { color: '#2A2E3E' } }, axisLabel: { color: '#9498A5', show: show_x_labels, rotate: catLabelRotation, interval: catLabelInterval }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#2A2E3E' } }, axisLabel: { color: '#9498A5' }, splitLine: { lineStyle: { color: '#2A2E3E', type: 'dashed' } } },
  };

  switch (type) {
    case 'bar': {
      const series = y_cols.map((ycol, i) => {
        const { x, y } = aggregate(data, x_col, ycol, aggfunc, sort_by);
        const baseColor = palette[i % palette.length];
        // 生成渐变色
        const lighterColor = baseColor + 'CC'; // 80%不透明度
        return {
          name: ycol,
          type: 'bar',
          data: y,
          stack: stacked ? 'total' : undefined,
          barMaxWidth: 40,
          itemStyle: {
            borderRadius: stacked ? 0 : [6, 6, 0, 0],
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: baseColor },
                { offset: 1, color: lighterColor },
              ],
            },
            shadowColor: baseColor + '40',
            shadowBlur: 0,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 16,
              shadowColor: baseColor + '80',
              borderColor: baseColor,
              borderWidth: 1,
            },
            scale: true,
            scaleSize: 1.05,
          },
          blur: {
            itemStyle: { opacity: 0.5 },
          },
          animationDelay: (idx: number) => idx * 50,
        };
      });
      const { x } = aggregate(data, x_col, y_cols[0] || '', aggfunc, sort_by);
      return { option: { ...baseOption, xAxis: { ...(baseOption.xAxis as any), data: x }, series } };
    }

    case 'line':
    case 'area': {
      const series = y_cols.map((ycol, i) => {
        const { x, y } = aggregate(data, x_col, ycol, aggfunc, sort_by);
        const color = palette[i % palette.length];
        return {
          name: ycol,
          type: 'line',
          data: y,
          smooth,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 2.5, color, shadowColor: color + '60', shadowBlur: 4 },
          itemStyle: { color, borderColor: '#fff', borderWidth: 1.5 },
          areaStyle: type === 'area' ? {
            opacity: 0.2,
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: color + '60' },
                { offset: 1, color: color + '05' },
              ],
            },
          } : undefined,
          emphasis: {
            focus: 'series',
            lineStyle: { width: 3.5 },
            itemStyle: { shadowBlur: 12, shadowColor: color },
          },
          animationDelay: (idx: number) => idx * 60,
        };
      });
      const { x } = aggregate(data, x_col, y_cols[0] || '', aggfunc, sort_by);
      return { option: { ...baseOption, xAxis: { ...(baseOption.xAxis as any), data: x }, series } };
    }

    case 'pie': {
      const ycol = y_cols[0] || '';
      const { x, y } = aggregate(data, x_col, ycol, aggfunc, sort_by);
      const pieData = x.map((name, i) => ({ name, value: y[i] }));
      // 超过8项取Top7+其他
      let finalData = pieData;
      if (pieData.length > 8) {
        const sorted = [...pieData].sort((a, b) => b.value - a.value);
        const top7 = sorted.slice(0, 7);
        const otherSum = sorted.slice(7).reduce((a, b) => a + b.value, 0);
        finalData = [...top7, { name: '其他', value: otherSum }];
      }
      return { option: {
        ...baseOption,
        tooltip: { ...baseOption.tooltip, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
          type: 'pie',
          radius: ['38%', '65%'],
          center: ['50%', '50%'],
          data: finalData,
          label: { color: '#9498A5', formatter: '{b}\n{d}%' },
          labelLine: { lineStyle: { color: '#3A3F50' } },
          emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(108,140,255,0.4)' }, scaleSize: 8 },
          itemStyle: { borderColor: '#151821', borderWidth: 2 },
        }],
      } };
    }

    case 'scatter': {
      const xcol = x_col;
      const ycol = y_cols[0] || '';
      const points = data
        .filter(r => r[xcol] != null && r[ycol] != null)
        .map(r => [Number(r[xcol]), Number(r[ycol])])
        .filter(p => !isNaN(p[0]) && !isNaN(p[1]));
      return { option: {
        ...baseOption,
        tooltip: { ...baseOption.tooltip, trigger: 'item', formatter: (p: any) => `(${p.value[0]}, ${p.value[1]})` },
        xAxis: { ...baseOption.xAxis, type: 'value', name: xcol, nameTextStyle: { color: '#9498A5' } },
        yAxis: { ...baseOption.yAxis, name: ycol, nameTextStyle: { color: '#9498A5' } },
        series: [{
          type: 'scatter',
          data: points,
          symbolSize: 10,
          itemStyle: { color: palette[0], opacity: 0.8, shadowBlur: 8, shadowColor: 'rgba(108,140,255,0.3)' },
          emphasis: { itemStyle: { shadowBlur: 15 } },
        }],
      } };
    }

    case 'histogram': {
      const ycol = y_cols[0] || '';
      const values = data.map(r => Number(r[ycol])).filter(v => !isNaN(v));
      if (values.length === 0) return { option: baseOption, emptyReason: '该列无有效数值数据' };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
      const binSize = (max - min) / binCount || 1;
      const bins = new Array(binCount).fill(0);
      const binLabels: string[] = [];
      for (let i = 0; i < binCount; i++) {
        binLabels.push(`${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`);
      }
      for (const v of values) {
        let idx = Math.floor((v - min) / binSize);
        if (idx >= binCount) idx = binCount - 1;
        bins[idx]++;
      }
      return { option: {
        ...baseOption,
        xAxis: { ...baseOption.xAxis, data: binLabels, axisLabel: { ...baseOption.xAxis?.axisLabel, rotate: 30 } },
        series: [{
          type: 'bar',
          data: bins,
          itemStyle: { color: palette[0], borderRadius: [4, 4, 0, 0] },
          barCategoryGap: '0%',
        }],
      } };
    }

    case 'heatmap': {
      // 相关性矩阵热力图
      const allNumericCols = Object.keys(data[0] || {}).filter(k =>
        data.some(r => !isNaN(Number(r[k])))
      );
      const selectedCols = (y_cols || []).filter(k => allNumericCols.includes(k));
      const labels = (selectedCols.length > 0 ? selectedCols : allNumericCols).slice(0, 10);
      if (labels.length < 2) {
        return { option: {}, emptyReason: '至少需要 2 个数值列才能生成相关性热力图' };
      }
      const corrData: [number, number, number][] = [];
      for (let i = 0; i < labels.length; i++) {
        for (let j = 0; j < labels.length; j++) {
          const r = pearsonCorrelation(data, labels[i], labels[j]);
          corrData.push([j, i, Math.round(r * 100) / 100]);
        }
      }
      return { option: {
        ...baseOption,
        tooltip: { ...baseOption.tooltip, formatter: (p: any) => `${labels[p.value[1]]} × ${labels[p.value[0]]}<br/>相关系数: <b>${p.value[2]}</b>` },
        grid: { ...baseOption.grid, bottom: '20%' },
        xAxis: { type: 'category', data: labels, axisLabel: { color: '#9498A5', rotate: 45 }, splitArea: { show: true } },
        yAxis: { type: 'category', data: labels, axisLabel: { color: '#9498A5' }, splitArea: { show: true } },
        visualMap: {
          min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: '2%',
          textStyle: { color: '#9498A5' },
          inRange: { color: ['#EF4444', '#2A2E3E', '#34D399'] },
        },
        series: [{
          type: 'heatmap', data: corrData,
          label: { show: true, color: '#fff', fontSize: 10 },
          emphasis: { itemStyle: { shadowBlur: 10 } },
        }],
      } };
    }

    case 'boxplot': {
      // 按x_col分组生成箱线图
      const ycol = y_cols[0] || '';
      const groups = new Map<string, number[]>();
      for (const row of data) {
        const x = String(row[x_col] ?? '');
        const y = Number(row[ycol]);
        if (!isNaN(y)) {
          if (!groups.has(x)) groups.set(x, []);
          groups.get(x)!.push(y);
        }
      }
      const xCats: string[] = [];
      const boxData: number[][] = [];
      for (const [key, vals] of groups) {
        vals.sort((a, b) => a - b);
        const q1 = vals[Math.floor(vals.length * 0.25)];
        const median = vals[Math.floor(vals.length * 0.5)];
        const q3 = vals[Math.floor(vals.length * 0.75)];
        const iqr = q3 - q1;
        const lower = Math.max(vals[0], q1 - 1.5 * iqr);
        const upper = Math.min(vals[vals.length - 1], q3 + 1.5 * iqr);
        xCats.push(key);
        boxData.push([lower, q1, median, q3, upper]);
      }
      return { option: {
        ...baseOption,
        xAxis: { ...baseOption.xAxis, data: xCats },
        series: [{
          name: ycol, type: 'boxplot', data: boxData,
          itemStyle: { color: 'rgba(108,140,255,0.3)', borderColor: palette[0] },
        }],
      } };
    }

    case 'radar': {
      // 按x_col分组，各y_col作为维度
      const indicators = y_cols.map(y => {
        const max = Math.max(...data.map(r => Number(r[y])).filter(v => !isNaN(v)));
        return { name: y, max: max > 0 ? max * 1.1 : 100 };
      });
      const { x } = aggregate(data, x_col, y_cols[0] || '', aggfunc, sort_by);
      const radarData = x.map(xVal => {
        const subset = data.filter(r => String(r[x_col]) === xVal);
        const values = y_cols.map(y => {
          const vals = subset.map(r => Number(r[y])).filter(v => !isNaN(v));
          const fn = aggfunc === 'mean' ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0);
          return Math.round(fn * 100) / 100;
        });
        return { name: xVal, value: values };
      });
      return { option: {
        ...baseOption,
        radar: { indicator: indicators, axisName: { color: '#9498A5' }, splitArea: { areaStyle: { color: ['rgba(21,24,33,0.3)', 'rgba(30,34,48,0.3)'] } } },
        series: [{ type: 'radar', data: radarData, areaStyle: { opacity: 0.1 } }],
      } };
    }

    case 'funnel': {
      const ycol = y_cols[0] || '';
      const { x, y } = aggregate(data, x_col, ycol, aggfunc, sort_by);
      const funnelData = x.map((name, i) => ({ name, value: y[i] })).sort((a, b) => b.value - a.value);
      return { option: {
        ...baseOption,
        tooltip: { ...baseOption.tooltip, trigger: 'item', formatter: '{b}: {c}' },
        series: [{
          type: 'funnel',
          data: funnelData,
          sort: 'descending',
          label: { color: '#E8E8ED' },
          itemStyle: { borderColor: '#151821', borderWidth: 2 },
          emphasis: { label: { fontSize: 14 } },
        }],
      } };
    }

    default:
      return { option: baseOption };
  }
}
