/**
 * 多数据集对比组件
 * 批量上传CSV，选择列并排比较
 */
import { useState, useRef } from 'react';
import { Files, X, AlertCircle, Loader2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import echarts from '@/lib/echartsCore';
import type { EChartsOption } from 'echarts';
import type { Dataset } from '@/store/useAppStore';
import { multiUpload } from '@/lib/api';

const PALETTE = ['#E0A84E', '#5B9BF5', '#3FB984', '#D98841', '#E55A5A', '#6B7280'];

type CompareMode = 'sum' | 'mean';
type ChartStyle = 'bar' | 'line';

export default function MultiDatasetCompare() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [compareCol, setCompareCol] = useState('');
  const [categoryCol, setCategoryCol] = useState('');
  const [compareMode, setCompareMode] = useState<CompareMode>('sum');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('bar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadIdRef = useRef(0);

  const handleUpload = async (files: FileList) => {
    const uploadId = ++uploadIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await multiUpload(files);
      if (uploadId !== uploadIdRef.current) return;

      if (!data.success) {
        setError(data.error || '上传失败');
        return;
      }

      const incoming = data.datasets ?? [];
      const failed = incoming.filter((d) => d.error);
      const succeeded = incoming.filter((d) => !d.error && d.file_id);

      if (failed.length > 0 && succeeded.length === 0) {
        setError(failed.map((d) => `${d.file_name}: ${d.error}`).join('；'));
        return;
      }

      if (failed.length > 0) {
        setError(`部分文件上传失败：${failed.map((d) => d.file_name).join('、')}`);
      }

      if (succeeded.length > 0) {
        setDatasets((prev) => [...prev, ...succeeded]);
      }
    } catch {
      if (uploadId === uploadIdRef.current) {
        setError('网络请求失败，请检查后端服务');
      }
    } finally {
      if (uploadId === uploadIdRef.current) {
        setLoading(false);
      }
    }
  };

  const removeDataset = (fileId: string) => {
    setDatasets((prev) => prev.filter((d) => d.file_id !== fileId));
  };

  const commonCols = datasets.length > 0
    ? datasets[0].columns.filter((c) => datasets.every((d) => d.columns.includes(c)))
    : [];
  const numericCols = commonCols.filter((c) =>
    datasets.some((d) => d.column_types?.[c] === 'numeric'),
  );

  const aggregate = (vals: number[]) => {
    if (vals.length === 0) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    const v = compareMode === 'mean' ? sum / vals.length : sum;
    return Math.round(v * 100) / 100;
  };

  const compareOption: EChartsOption | null = (() => {
    if (!compareCol || !categoryCol || datasets.length < 2) return null;

    const allCategories = new Set<string>();
    datasets.forEach((d) => d.data.forEach((r) => allCategories.add(String(r[categoryCol] ?? ''))));
    const cats = Array.from(allCategories).filter(Boolean);

    const series = datasets.map((d, i) => ({
      name: d.file_name,
      type: chartStyle,
      data: cats.map((cat) => {
        const subset = d.data.filter((r) => String(r[categoryCol]) === cat);
        const vals = subset.map((r) => Number(r[compareCol])).filter((v) => !isNaN(v));
        return aggregate(vals);
      }),
      itemStyle: { color: PALETTE[i % PALETTE.length] },
      smooth: chartStyle === 'line',
    }));

    const yName = compareMode === 'mean' ? `${compareCol}（均值）` : `${compareCol}（合计）`;

    return {
      backgroundColor: 'transparent',
      color: PALETTE,
      title: {
        text: `${compareCol} 对比`,
        left: 'center',
        textStyle: { color: '#EDEEF1', fontSize: 14 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(28,32,38,0.95)',
        borderColor: 'rgba(255,255,255,0.09)',
        textStyle: { color: '#EDEEF1' },
      },
      legend: { bottom: 0, textStyle: { color: '#A4AAB4' } },
      grid: { left: '8%', right: '5%', top: '15%', bottom: '15%' },
      xAxis: {
        type: 'category',
        data: cats,
        axisLabel: { color: '#A4AAB4' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      },
      yAxis: {
        type: 'value',
        name: yName,
        axisLabel: { color: '#A4AAB4' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
      },
      series,
    };
  })();

  const hasTruncated = datasets.some((d) => d.truncated);

  return (
    <div className="space-y-5">
      <div
        onClick={() => !loading && fileRef.current?.click()}
        className={`border-2 border-dashed border-subtle hover:border-accent/25 rounded-xl p-8 text-center transition-all ${
          loading ? 'opacity-60 cursor-wait' : 'cursor-pointer'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleUpload(e.target.files);
            e.target.value = '';
          }}
        />
        {loading ? (
          <Loader2 className="w-10 h-10 text-accent mx-auto mb-2 animate-spin" />
        ) : (
          <Files className="w-10 h-10 text-tertiary mx-auto mb-2" />
        )}
        <p className="text-sm text-primary">
          {loading ? '上传处理中…' : '批量上传 CSV / Excel 文件进行对比'}
        </p>
        <p className="text-xs text-tertiary mt-1">可选择多个文件</p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-error-subtle border border-error/25">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
          <span className="font-body text-xs text-error">{error}</span>
        </div>
      )}

      {datasets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {datasets.map((d) => (
            <div
              key={d.file_id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-1/60 border border-subtle"
            >
              <span className="text-xs text-primary font-body">{d.file_name}</span>
              <span className="text-[10px] text-tertiary">
                {d.row_count}行{d.truncated ? '（已截断至1000行）' : ''}
              </span>
              <button onClick={() => removeDataset(d.file_id)} className="text-tertiary hover:text-error">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {hasTruncated && (
        <p className="text-xs text-warning font-body px-1">
          部分数据集超过 1000 行，对比仅使用前 1000 行数据。
        </p>
      )}

      {datasets.length >= 2 && commonCols.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-section block mb-1.5">分组列</label>
              <select
                value={categoryCol}
                onChange={(e) => setCategoryCol(e.target.value)}
                className="w-full bg-surface-1 border border-subtle rounded-lg px-3 py-2 text-sm text-primary"
              >
                <option value="">选择列…</option>
                {commonCols.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-section block mb-1.5">对比数值列</label>
              <select
                value={compareCol}
                onChange={(e) => setCompareCol(e.target.value)}
                className="w-full bg-surface-1 border border-subtle rounded-lg px-3 py-2 text-sm text-primary"
              >
                <option value="">选择列…</option>
                {numericCols.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 p-0.5 rounded-lg bg-surface-1/50">
              {(['sum', 'mean'] as CompareMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setCompareMode(m)}
                  className={`px-3 py-1 rounded-md text-xs transition-all ${
                    compareMode === m ? 'bg-accent-subtle text-accent' : 'text-tertiary'
                  }`}
                >
                  {m === 'sum' ? '合计' : '均值'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 p-0.5 rounded-lg bg-surface-1/50">
              {(['bar', 'line'] as ChartStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setChartStyle(s)}
                  className={`px-3 py-1 rounded-md text-xs transition-all ${
                    chartStyle === s ? 'bg-accent-subtle text-accent' : 'text-tertiary'
                  }`}
                >
                  {s === 'bar' ? '柱状图' : '折线图'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {compareOption && (
        <div className="data-card p-4">
          <ReactECharts echarts={echarts} option={compareOption} style={{ height: '400px' }} />
        </div>
      )}

      {datasets.length === 1 && (
        <p className="text-center text-xs text-tertiary">至少需要上传 2 份数据才能对比</p>
      )}
    </div>
  );
}
