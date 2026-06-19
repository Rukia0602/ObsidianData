import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface ChartModalProps {
  title: string;
  imageUrl: string;
  onClose: () => void;
}

export default function ChartModal({ title, imageUrl, onClose }: ChartModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${title}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--overlay)' }} />

      {/* Modal */}
      <div
        className="relative glass-elevated rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col animate-scale-in border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-[3px] bg-accent h-4" />
            <span className="label-section">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-surface-3 text-tertiary hover:text-primary transition-all"
              title="下载"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-error-subtle text-tertiary hover:text-error transition-all"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-surface-1 rounded-b-2xl p-6">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[75vh] object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
