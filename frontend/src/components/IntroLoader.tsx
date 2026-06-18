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
    const duration = 1800;
    const tick = (time: number) => {
      const elapsed = time - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setPhase('exit'), 400);
        setTimeout(onComplete, 1100);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-midnight-900 ${
        phase === 'exit' ? 'animate-intro-fade-out' : 'animate-fade-in'
      }`}
      aria-hidden="true"
    >
      {/* Animated aurora backdrop */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[800px] h-[800px] rounded-full blur-[100px] opacity-40"
          style={{
            top: '10%',
            left: '20%',
            background: 'radial-gradient(circle, rgba(108,140,255,0.4) 0%, transparent 70%)',
            animation: 'aurora 12s ease infinite',
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-30"
          style={{
            bottom: '5%',
            right: '15%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.4) 0%, transparent 70%)',
            animation: 'aurora 14s ease infinite reverse',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-25"
          style={{
            top: '40%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%)',
            animation: 'aurora 16s ease infinite',
          }}
        />
      </div>

      {/* Perspective grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[45%] opacity-50 animate-intro-grid"
        style={{
          backgroundImage:
            'linear-gradient(rgba(108,140,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.2) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          transform: 'perspective(400px) rotateX(60deg)',
          transformOrigin: 'bottom',
          maskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 90%)',
        }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-7 px-6">
        {/* Logo mark */}
        <div className="relative animate-intro-logo">
          <div className="absolute inset-0 rounded-2xl blur-2xl opacity-60 bg-gradient-to-br from-nebula via-violet to-cyan" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-nebula via-violet to-cyan flex items-center justify-center shadow-2xl shadow-nebula/30">
            <BarChart3 className="w-9 h-9 text-white" />
          </div>
        </div>

        {/* Wordmark */}
        <div className="text-center overflow-hidden">
          <h1
            className="animate-intro-text"
            style={{ animationDelay: '0.4s', opacity: 0 }}
          >
            <BrandWordmark />
          </h1>
          <p
            className="font-body text-xs text-frost-dim mt-2 animate-intro-text"
            style={{ animationDelay: '0.7s', opacity: 0 }}
          >
            {BRAND_TAGLINE}
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="w-56 flex flex-col gap-2 animate-intro-text"
          style={{ animationDelay: '1s', opacity: 0 }}
        >
          <div className="h-1 rounded-full bg-midnight-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-nebula via-violet to-cyan transition-[width] duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-frost-dim">
            <span className="font-body">初始化分析引擎</span>
            <span className="data-value text-nebula tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Corner brackets - terminal aesthetic */}
      <div className="absolute top-8 left-8 w-8 h-8 border-l-2 border-t-2 border-nebula/40" />
      <div className="absolute top-8 right-8 w-8 h-8 border-r-2 border-t-2 border-cyan/40" />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-l-2 border-b-2 border-violet/40" />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-r-2 border-b-2 border-emerald/40" />
    </div>
  );
}
