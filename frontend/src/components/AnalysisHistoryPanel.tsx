import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, History, RotateCcw, Trash2, X } from 'lucide-react';
import {
  clearAnalysisRecords,
  listAnalysisRecords,
  removeAnalysisRecord,
  type AnalysisRecord,
} from '@/lib/analysisHistory';
import { fetchActions } from '@/lib/api';
import { saveActiveSession } from '@/lib/sessionStorage';
import { useAppStore } from '@/store/useAppStore';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AnalysisHistoryPanel() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const refresh = useCallback(() => {
    setRecords(listAnalysisRecords());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes('analysis_history')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  useEffect(() => {
    if (!showClearConfirm) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowClearConfirm(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showClearConfirm]);

  const handleRestore = async (record: AnalysisRecord) => {
    setRestoringId(record.id);
    const { session } = record;
    const {
      setFileInfo,
      setCharts,
      setChartsMeta,
      setInsights,
      setAiAnalysis,
      setActions,
      setError,
    } = useAppStore.getState();

    setFileInfo(session.fileInfo);
    setCharts(session.charts);
    setChartsMeta(session.chartsMeta);
    setInsights(session.insights);
    setAiAnalysis(session.aiAnalysis);
    saveActiveSession(session);

    try {
      const res = await fetchActions(record.fileId);
      if (res.success && res.actions) {
        setActions(res.actions);
      } else {
        setActions(session.aiAnalysis?.action_plans ?? []);
      }
    } catch {
      setActions(session.aiAnalysis?.action_plans ?? []);
    }

    setError(null);
    setRestoringId(null);
    navigate('/dashboard');
  };

  const handleDelete = (id: string) => {
    removeAnalysisRecord(id);
    refresh();
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    clearAnalysisRecords();
    refresh();
    setShowClearConfirm(false);
  };

  return (
    <div className="mt-12 animate-fade-in-up stagger-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-accent" />
          <span className="label-section">本地分析记录</span>
          {records.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent-subtle text-accent text-xs font-body">
              {records.length}
            </span>
          )}
        </div>
        {records.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-tertiary hover:text-error font-body flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> 清空全部
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="data-card px-4 py-8 text-center">
          <History className="w-8 h-8 text-quaternary mx-auto mb-2" />
          <p className="text-sm text-tertiary font-body">
            暂无分析记录，完成一次洞察分析后将显示在这里
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(record => (
            <div
              key={record.id}
              className="data-card px-4 py-3 flex items-start gap-3 hover:border-accent/25 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-sm text-primary font-medium truncate">
                    {record.fileName}
                  </span>
                  <span className="text-xs text-tertiary font-mono">
                    {record.rowCount} × {record.colCount}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-tertiary font-body">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(record.createdAt)}
                  </span>
                  {record.findingCount > 0 && (
                    <span>{record.findingCount} 条发现</span>
                  )}
                  {record.actionCount > 0 && (
                    <span>{record.actionCount} 项行动</span>
                  )}
                </div>
                {record.summary && (
                  <p className="mt-1.5 text-xs text-secondary font-body line-clamp-2">
                    {record.summary}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleRestore(record)}
                  disabled={restoringId === record.id}
                  className="btn-secondary text-xs py-1.5 px-2.5"
                >
                  {restoringId === record.id ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  恢复
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="p-1.5 rounded-lg hover:bg-error-subtle text-tertiary hover:text-error transition-colors"
                  aria-label="删除记录"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <div className="absolute inset-0 bg-canvas/80" />
          <div
            className="relative glass-elevated rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in border border-line"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-history-title"
          >
            <div className="px-6 py-5">
              <h3 id="clear-history-title" className="label-section mb-2">
                清空全部记录
              </h3>
              <p className="text-sm text-tertiary font-body">
                确定清空全部本地分析记录？此操作不可恢复。
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-subtle">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmClearAll}
                className="text-sm px-4 py-2 rounded-lg font-body font-medium bg-error-subtle text-error border border-error/25 hover:bg-error/20 transition-colors"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
