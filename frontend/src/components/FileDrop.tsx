import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Table, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { useAppStore } from '@/store/useAppStore';
import { uploadFile } from '@/lib/api';
import { formatBytes, formatNumber } from '@/lib/utils';

export default function FileDrop() {
  const [dragging, setDragging] = useState(false);
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: string[][] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadIdRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { file, fileInfo, setFile, setFileInfo, setError, error } = useAppStore();

  useEffect(() => () => { uploadIdRef.current += 1; }, []);

  const handleFile = useCallback(async (f: File) => {
    const ext = f.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      setError('仅支持 CSV、xlsx、xls 文件格式');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }
    setError(null);
    setFile(f);
    setUploading(true);
    setPreviewData(null);
    const currentUploadId = ++uploadIdRef.current;

    try {
      const data = await uploadFile(f);
      if (uploadIdRef.current !== currentUploadId) return;
      if (data.success) {
        setFileInfo(data);
        // xlsx/xls: 用后端返回的 preview_rows 生成预览
        if (!f.name.toLowerCase().endsWith('.csv') && data.preview_rows) {
          setPreviewData({ columns: data.columns, rows: data.preview_rows as unknown as string[][] });
        }
      } else {
        setError(data.error || '上传失败');
        setFile(null);
      }
    } catch {
      if (uploadIdRef.current === currentUploadId) {
        setError('网络请求失败');
        setFile(null);
      }
    } finally {
      if (uploadIdRef.current === currentUploadId) {
        setUploading(false);
      }
    }

    // CSV 文件前端解析预览（独立于上传，避免竞态）
    if (f.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(f, {
        header: false,
        preview: 10,
        complete: (results) => {
          if (uploadIdRef.current === currentUploadId && results.data.length > 0) {
            const columns = results.data[0] as string[];
            const rows = results.data.slice(1) as string[][];
            setPreviewData({ columns, rows });
          }
        },
      });
    }
  }, [setFile, setFileInfo, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-xl p-10 text-center transition-all duration-300 group ${
          uploading
            ? 'border border-subtle bg-surface-1/50 pointer-events-none'
            : dragging
            ? 'border-2 border-accent bg-accent-subtle scale-[1.01]'
            : 'border border-dashed border-subtle hover:border-accent/25 hover:bg-surface-1/30'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            uploading ? 'bg-surface-2/50' : dragging ? 'bg-accent-subtle' : 'bg-surface-2/50'
          }`}>
            {uploading ? (
              <div className="w-7 h-7 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
            ) : (
              <Upload className={`w-7 h-7 transition-colors ${
                dragging ? 'text-accent' : 'text-tertiary group-hover:text-primary'
              }`} />
            )}
          </div>
          <div>
            <p className="font-body text-base text-primary font-medium">
              {uploading ? '正在解析文件…' : dragging ? '释放文件以上传' : '拖拽 CSV/XLSX 文件到此处'}
            </p>
            <p className="text-tertiary text-sm mt-1.5 font-body flex items-center justify-center gap-1.5">
              <span>或点击选择文件</span>
              <span className="w-1 h-1 rounded-full bg-quaternary" />
              <span>.csv / .xlsx</span>
              <span className="w-1 h-1 rounded-full bg-quaternary" />
              <span>最大 10MB</span>
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-error-subtle border border-error/25 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
          <span className="font-body text-xs text-error">{error}</span>
        </div>
      )}

      {/* File info card */}
      {file && fileInfo && (
        <div className="data-card p-5 space-y-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/25 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-primary truncate font-medium">{file.name}</p>
              <p className="text-tertiary text-xs font-mono mt-0.5">{formatBytes(file.size)}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-subtle border border-success/25">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span className="text-success text-xs font-body font-medium">已就绪</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '列数', value: fileInfo.col_count },
              { label: '行数', value: formatNumber(fileInfo.row_count) },
              { label: '大小', value: formatBytes(fileInfo.file_size) },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-1/50 rounded-lg p-3 text-center border border-subtle">
                <p className="data-value text-primary text-xl font-semibold">{stat.value}</p>
                <p className="font-body text-xs text-tertiary mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data preview */}
      {previewData && (
        <div className="data-card overflow-hidden animate-fade-in-up">
          <div className="flex items-center justify-between px-5 py-3 border-b border-subtle">
            <div className="flex items-center gap-2.5">
              <Table className="w-3.5 h-3.5 text-tertiary" />
              <span className="label-section">数据预览</span>
            </div>
            <span className="font-body text-xs text-tertiary">显示前 {previewData.rows.length} 行</span>
          </div>
          <div className="overflow-auto max-h-64">
            <table className="data-table">
              <thead>
                <tr>
                  {previewData.columns.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
