/**
 * 数据透视 & 计算列面板
 */
import { useState } from 'react';
import { Grid3x3, Calculator, Plus, X } from 'lucide-react';
import { calculateColumn, pivotData } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function DataTransformPanel() {
  const { fileInfo, columnTypes, setRawData, setColumnTypes } = useAppStore();
  const [mode, setMode] = useState<'pivot' | 'calc'>('pivot');

  // 透视配置
  const [pivIndex, setPivIndex] = useState('');
  const [pivColumns, setPivColumns] = useState('');
  const [pivValues, setPivValues] = useState('');
  const [pivAgg, setPivAgg] = useState('sum');

  // 计算列配置
  const [calcName, setCalcName] = useState('');
  const [calcFormula, setCalcFormula] = useState('');
  const [calcError, setCalcError] = useState('');
  const [pivotError, setPivotError] = useState('');

  const columns = Object.keys(columnTypes);
  const numericCols = columns.filter(c => columnTypes[c] === 'numeric');

  const runPivot = async () => {
    setPivotError('');
    if (!fileInfo || !pivIndex || !pivColumns || !pivValues) return;
    try {
      const data = await pivotData(fileInfo.file_id, {
        index: pivIndex, columns: pivColumns, values: pivValues, aggfunc: pivAgg,
      });
      if (data.success && data.data && data.columns) {
        setRawData(data.data, data.row_count);
        const newTypes: Record<string, string> = {};
        data.columns.forEach((c: string) => {
          const sample = data.data[0]?.[c];
          newTypes[c] = typeof sample === 'number' ? 'numeric' : 'category';
        });
        setColumnTypes(newTypes as any);
      } else {
        setPivotError(data.error || '透视失败');
      }
    } catch {
      setPivotError('请求失败');
    }
  };

  const runCalc = async () => {
    setCalcError('');
    if (!fileInfo || !calcName || !calcFormula) return;
    try {
      const data = await calculateColumn(fileInfo.file_id, {
        name: calcName, formula: calcFormula,
      });
      if (data.success && data.data && data.column_types) {
        setRawData(data.data, data.row_count);
        setColumnTypes(data.column_types);
        setCalcName('');
        setCalcFormula('');
      } else {
        setCalcError(data.error);
      }
    } catch (e) {
      setCalcError('请求失败');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-0.5 rounded-lg bg-surface-1/50">
        <button
          onClick={() => setMode('pivot')}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all',
            mode === 'pivot' ? 'bg-accent-subtle text-accent' : 'text-tertiary')}
        >
          <Grid3x3 className="w-3.5 h-3.5" /> 数据透视
        </button>
        <button
          onClick={() => setMode('calc')}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all',
            mode === 'calc' ? 'bg-accent-subtle text-accent' : 'text-tertiary')}
        >
          <Calculator className="w-3.5 h-3.5" /> 计算列
        </button>
      </div>

      {mode === 'pivot' ? (
        <div className="space-y-2">
          <div>
            <label className="label-section block mb-1">行分组</label>
            <select value={pivIndex} onChange={e => setPivIndex(e.target.value)} className="w-full bg-surface-1 border border-line rounded-lg px-2 py-1.5 text-xs text-primary">
              <option value="">选择列…</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-section block mb-1">列分组</label>
            <select value={pivColumns} onChange={e => setPivColumns(e.target.value)} className="w-full bg-surface-1 border border-line rounded-lg px-2 py-1.5 text-xs text-primary">
              <option value="">选择列…</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-section block mb-1">聚合值</label>
            <select value={pivValues} onChange={e => setPivValues(e.target.value)} className="w-full bg-surface-1 border border-line rounded-lg px-2 py-1.5 text-xs text-primary">
              <option value="">选择列…</option>
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-section block mb-1">聚合方式</label>
            <select value={pivAgg} onChange={e => setPivAgg(e.target.value)} className="w-full bg-surface-1 border border-line rounded-lg px-2 py-1.5 text-xs text-primary">
              <option value="sum">求和</option>
              <option value="mean">平均值</option>
              <option value="count">计数</option>
              <option value="min">最小值</option>
              <option value="max">最大值</option>
            </select>
          </div>
          {pivotError && <p className="text-xs text-error">{pivotError}</p>}
          <button onClick={runPivot} disabled={!pivIndex || !pivColumns || !pivValues} className="btn-primary w-full text-xs py-2">
            执行透视
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="label-section block mb-1">新列名</label>
            <input value={calcName} onChange={e => setCalcName(e.target.value)} placeholder="如: 利润率" className="w-full bg-surface-1 border border-line rounded-lg px-2 py-1.5 text-xs text-primary" />
          </div>
          <div>
            <label className="label-section block mb-1">公式（用列名+运算符）</label>
            <input value={calcFormula} onChange={e => setCalcFormula(e.target.value)} placeholder="如: 利润(万元) / 销售额(万元) * 100" className="w-full bg-surface-1 border border-line rounded-lg px-2 py-1.5 text-xs text-primary font-body" />
          </div>
          <div className="flex flex-wrap gap-1">
            {numericCols.map(c => (
              <button key={c} onClick={() => setCalcFormula(prev => prev + (prev ? ' ' : '') + c)} className="px-1.5 py-0.5 rounded bg-surface-2 text-xs font-body text-tertiary hover:text-primary">
                {c}
              </button>
            ))}
          </div>
          {calcError && <p className="text-xs text-error">{calcError}</p>}
          <button onClick={runCalc} disabled={!calcName || !calcFormula} className="btn-primary w-full text-xs py-2">
            <Plus className="w-3 h-3" /> 添加计算列
          </button>
        </div>
      )}
    </div>
  );
}
