import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import BrandWordmark from '@/components/BrandWordmark';
import { BRAND_TAGLINE } from '@/lib/brand';

interface IntroLoaderProps {
  onComplete: () => void;
}

export default function IntroLoader({ onComplete }: IntroLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'show' | 'exit'>('show');

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1400;
    const tick = (time: number) => {
      const elapsed = time - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setPhase('exit'), 300);
        setTimeout(onComplete, 800);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-canvas ${
        phase === 'exit' ? 'animate-intro-fade-out' : 'animate-fade-in'
      }`}
      aria-hidden="true"
    >
      {/* Center content — clean, single accent, no ambient effects */}
      <div className="relative flex flex-col items-center gap-6 px-6">
        {/* Logo mark — electric purple, the Obsidian accent */}
        <div className="animate-scale-in">
          <div className="w-16 h-16 rounded-panel bg-accent flex items-center justify-center shadow-[0_8px_32px_rgba(168,85,247,0.35)]">
            <BarChart3 className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <h1 className="leading-tight">
            <BrandWordmark />
          </h1>
          <p className="font-body text-xs text-tertiary mt-2 tracking-wide">
            {BRAND_TAGLINE}
          </p>
        </div>

        {/* Progress bar — solid accent, no gradient */}
        <div
          className="w-52 flex flex-col gap-2 animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="h-[3px] rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-100 ease-out"
              style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(168,85,247,0.4)' }}
            />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-body text-tertiary">初始化分析引擎</span>
            <span className="data-value text-secondary tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
