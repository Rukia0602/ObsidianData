/**
 * 数据预览表 — 服务端分页 + 虚拟滚动
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { fetchRawData, filterData } from '@/lib/api';
import { buildApiFilters, hasActiveFilters } from '@/lib/dataFilters';
import type { DataFilterState } from '@/components/DataFilterPanel';
import type { ColumnTypes, RawDataRow } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 28;
const VIEWPORT_HEIGHT = 256;

interface Props {
  fileId: string;
  columns: string[];
  columnTypes: ColumnTypes;
  totalRows: number;
  activeFilters: DataFilterState;
}

export default function DataPreviewTable({
  fileId,
  columns,
  columnTypes,
  totalRows,
  activeFilters,
}: Props) {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<RawDataRow[]>([]);
  const [pageRowCount, setPageRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(pageRowCount / PAGE_SIZE));

  const loadPage = useCallback(async (
    pageIndex: number,
    sort: string | null,
    dir: 'asc' | 'desc',
    filters: DataFilterState,
  ) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    const offset = pageIndex * PAGE_SIZE;
    const sortParams = sort ? { sort_col: sort, sort_dir: dir } : {};

    try {
      const res = hasActiveFilters(filters)
        ? await filterData(fileId, {
            filters: buildApiFilters(filters),
            offset,
            limit: PAGE_SIZE,
            ...sortParams,
          })
        : await fetchRawData(fileId, { offset, limit: PAGE_SIZE, ...sortParams });

      if (requestId !== requestRef.current) return;
      if (res.success && res.data) {
        setRows(res.data);
        setPageRowCount(res.row_count ?? res.data.length);
        setPage(pageIndex);
        setScrollTop(0);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    setPage(0);
    loadPage(0, sortCol, sortDir, activeFilters);
  }, [activeFilters, fileId, loadPage, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const goPage = (next: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, next));
    if (clamped !== page) loadPage(clamped, sortCol, sortDir, activeFilters);
  };

  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 4;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const visibleRows = rows.slice(startIndex, endIndex);
  const paddingTop = startIndex * ROW_HEIGHT;
  const paddingBottom = Math.max(0, (rows.length - endIndex) * ROW_HEIGHT);

  return (
    <div className="data-card overflow-hidden">
      <div className="px-4 py-2 border-b border-midnight-600/30 flex items-center justify-between gap-2">
        <span className="label-section">
          数据预览（第 {page + 1}/{totalPages} 页，共 {pageRowCount || totalRows} 行）
        </span>
        <div className="flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 text-nebula animate-spin" />}
          {sortCol && (
            <span className="text-xs text-frost-dim font-body mr-2">
              排序: {sortCol} {sortDir === 'asc' ? '↑' : '↓'}
            </span>
          )}
          <button
            onClick={() => goPage(page - 1)}
            disabled={page <= 0 || loading}
            className="p-1 rounded hover:bg-midnight-700/50 text-frost-dim hover:text-frost disabled:opacity-30"
            aria-label="上一页"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-frost-dim font-mono min-w-[3rem] text-center">
            {page + 1}/{totalPages}
          </span>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="p-1 rounded hover:bg-midnight-700/50 text-frost-dim hover:text-frost disabled:opacity-30"
            aria-label="下一页"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ height: VIEWPORT_HEIGHT }}
        onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      >
        <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-midnight-800 z-10">
            <tr>
              {columns.map(c => (
                <th
                  key={c}
                  onClick={() => handleSort(c)}
                  className="px-3 py-2 text-left text-frost-muted font-body font-medium border-b border-midnight-600/40 cursor-pointer hover:text-nebula hover:bg-nebula-subtle/30 transition-colors select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {c}
                    <span className="text-[9px] text-frost-dim/40">
                      {columnTypes[c] === 'numeric' ? '#' : columnTypes[c] === 'category' ? 'A' : 'T'}
                    </span>
                    {sortCol === c && (
                      <span className="text-nebula text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden><td colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} /></tr>
            )}
            {visibleRows.map((row, i) => {
              const rowIndex = startIndex + i;
              return (
                <tr
                  key={`${page}-${rowIndex}`}
                  className={cn(
                    'hover:bg-nebula-subtle/30 transition-colors',
                    rowIndex % 2 === 1 && 'bg-midnight-800/20',
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  {columns.map(c => (
                    <td
                      key={c}
                      className={cn(
                        'px-3 py-1.5 font-body border-b border-midnight-600/10 truncate',
                        columnTypes[c] === 'numeric'
                          ? 'text-right tabular-nums text-frost font-mono'
                          : 'text-frost-muted',
                      )}
                      title={row[c]?.toString() ?? ''}
                    >
                      {row[c]?.toString() ?? ''}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden><td colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} /></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-frost-dim text-xs">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}