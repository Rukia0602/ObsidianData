import { useState } from 'react';
import { Maximize2, Download, ImageIcon } from 'lucide-react';

type Accent = 'accent';

const accentMap: Record<Accent, { dot: string; spinner: string; glow: string }> = {
  accent: { dot: 'bg-accent', spinner: 'border-t-accent', glow: '' },
};

interface ChartCardProps {
  title: string;
  imageUrl: string | null;
  unavailableReason?: string;
  isLoading: boolean;
  onFullscreen: () => void;
  accent?: Accent;
}

export default function ChartCard({ title, imageUrl, unavailableReason, isLoading, onFullscreen, accent = 'accent' }: ChartCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const a = accentMap[accent];

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title}.png`;
    link.click();
  };

  return (
    <div className="data-card group overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
        <div className="flex items-center gap-2.5">
          <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
          <span className="label-section">{title}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {imageUrl && imgLoaded && (
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-md hover:bg-surface-3 text-tertiary hover:text-primary transition-all"
              title="下载"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onFullscreen}
            className="p-1.5 rounded-md hover:bg-surface-3 text-tertiary hover:text-primary transition-all"
            title="全屏查看"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card body - chart area */}
      <div className="relative flex-1 min-h-[220px] flex items-center justify-center p-3">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="shimmer w-full h-full absolute inset-0 rounded-md opacity-30" />
            <div className={`w-9 h-9 rounded-full border-2 border-subtle ${a.spinner} animate-spin relative z-10`} />
            <p className="font-body text-xs text-tertiary relative z-10">生成中…</p>
          </div>
        )}
        {imageUrl && !imgError && (
          <img
            src={imageUrl}
            alt={title}
            className={`max-w-full max-h-full object-contain rounded-md transition-all duration-500 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
        {!isLoading && (!imageUrl || imgError) && (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8 text-quaternary" />
            <p className="font-body text-xs text-tertiary text-center px-4">
              {unavailableReason || '图表不可用'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
