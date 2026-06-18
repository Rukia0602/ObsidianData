/**
 * 数据筛选面板 — 服务端筛选，分类/数值/文本
 */
import { useState, useEffect } from 'react';
import { Filter, X, Search } from 'lucide-react';
import type { ColumnTypes } from '@/store/useAppStore';
import type { FilterMetaColumn } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface DataFilterState {
  [col: string]: {
    type: 'category' | 'range' | 'search';
    values?: string[];
    min?: number;
    max?: number;
    text?: string;
    enabled: boolean;
  };
}

interface Props {
  columns: string[];
  columnTypes: ColumnTypes;
  filterMeta: Record<string, FilterMetaColumn>;
  onFiltersChange: (filters: DataFilterState) => void;
}

export default function DataFilterPanel({ columns, columnTypes, filterMeta, onFiltersChange }: Props) {
  const [filters, setFilters] = useState<DataFilterState>({});
  const [expanded, setExpanded] = useState(true);

  const toggleFilter = (col: string) => {
    setFilters(prev => {
      const next = { ...prev };
      if (next[col]?.enabled) {
        next[col] = { ...next[col], enabled: false };
      } else {
        const meta = filterMeta[col];
        const type = columnTypes[col] || meta?.type || 'text';
        if (type === 'numeric' || meta?.type === 'numeric') {
          next[col] = {
            type: 'range',
            min: meta?.min,
            max: meta?.max,
            enabled: true,
          };
        } else if (type === 'category' || meta?.type === 'category') {
          next[col] = { type: 'category', values: [], enabled: true };
        } else {
          next[col] = { type: 'search', text: '', enabled: true };
        }
      }
      return next;
    });
  };

  const updateFilter = (col: string, patch: Partial<DataFilterState[string]>) => {
    setFilters(prev => ({ ...prev, [col]: { ...prev[col], ...patch } }));
  };

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const activeCount = Object.values(filters).filter(f => f.enabled).length;

  const uniqueValues = (col: string): string[] => filterMeta[col]?.values ?? [];

  const numRange = (col: string): [number, number] => {
    const meta = filterMeta[col];
    if (meta?.min != null && meta?.max != null) return [meta.min, meta.max];
    return [0, 100];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2"
        >
          <Filter className="w-3.5 h-3.5 text-nebula" />
          <span className="label-section">数据筛选</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-nebula-subtle text-nebula text-xs font-body">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            onClick={() => setFilters({})}
            className="text-xs text-frost-dim hover:text-ruby transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> 清除
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {columns.map(col => {
            const f = filters[col];
            const isActive = f?.enabled;
            const type = columnTypes[col] || filterMeta[col]?.type || 'text';
            return (
              <div key={col} className={cn('rounded-lg border transition-all', isActive ? 'border-nebula/30 bg-midnight-800/50' : 'border-midnight-600/20')}>
                <button
                  onClick={() => toggleFilter(col)}
                  className="w-full flex items-center justify-between px-3 py-1.5"
                >
                  <span className="text-xs text-frost-muted font-body truncate">{col}</span>
                  <span className={cn('text-xs font-body px-1.5 rounded', type === 'numeric' ? 'bg-amber-subtle text-amber' : type === 'category' ? 'bg-emerald-subtle text-emerald' : 'bg-midnight-700 text-frost-dim')}>
                    {type === 'numeric' ? '数值' : type === 'category' ? '分类' : '文本'}
                  </span>
                </button>

                {isActive && f && (
                  <div className="px-3 pb-2 space-y-1.5">
                    {f.type === 'category' && (
                      <div className="flex flex-wrap gap-1">
                        {uniqueValues(col).map(v => (
                          <button
                            key={v}
                            onClick={() => {
                              const vals = f.values || [];
                              updateFilter(col, {
                                values: vals.includes(v) ? vals.filter(x => x !== v) : [...vals, v],
                              });
                            }}
                            className={cn(
                              'px-1.5 py-0.5 rounded text-xs font-body transition-all',
                              (f.values || []).includes(v)
                                ? 'bg-nebula text-white'
                                : 'bg-midnight-700 text-frost-dim hover:text-frost'
                            )}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}

                    {f.type === 'range' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={f.min ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              updateFilter(col, { min: undefined });
                            } else {
                              const n = parseFloat(val);
                              if (!isNaN(n)) updateFilter(col, { min: n });
                            }
                          }}
                          placeholder={String(numRange(col)[0])}
                          className="w-16 bg-midnight-800 border border-midnight-600/40 rounded px-1.5 py-0.5 text-xs text-frost"
                        />
                        <span className="text-xs text-frost-dim">~</span>
                        <input
                          type="number"
                          value={f.max ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              updateFilter(col, { max: undefined });
                            } else {
                              const n = parseFloat(val);
                              if (!isNaN(n)) updateFilter(col, { max: n });
                            }
                          }}
                          placeholder={String(numRange(col)[1])}
                          className="w-16 bg-midnight-800 border border-midnight-600/40 rounded px-1.5 py-0.5 text-xs text-frost"
                        />
                      </div>
                    )}

                    {f.type === 'search' && (
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-frost-dim" />
                        <input
                          value={f.text || ''}
                          onChange={e => updateFilter(col, { text: e.target.value })}
                          placeholder="搜索…"
                          className="w-full bg-midnight-800 border border-midnight-600/40 rounded pl-7 pr-2 py-0.5 text-xs text-frost"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}