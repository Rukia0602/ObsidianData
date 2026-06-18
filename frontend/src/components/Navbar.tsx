import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, ArrowLeft } from 'lucide-react';
import BrandWordmark from '@/components/BrandWordmark';
import { BRAND_TAGLINE } from '@/lib/brand';
import { loadSample } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

export default function Navbar() {
  const location = useLocation();
  const reset = useAppStore((s) => s.reset);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSample()
      .then((res) => {
        if (!cancelled) setBackendOk(res.success);
      })
      .catch(() => {
        if (!cancelled) setBackendOk(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-1/95 backdrop-blur-sm border-b border-subtle">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" onClick={reset}>
          {/* Electric-purple logo mark — Obsidian brand accent */}
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.5)]">
            <BarChart3 className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <BrandWordmark size="sm" className="block leading-none" />
            <span className="font-body text-[11px] text-tertiary block mt-0.5 tracking-wide">
              {BRAND_TAGLINE}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {location.pathname === '/dashboard' && (
            <Link
              to="/"
              onClick={reset}
              className="btn-secondary text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">新分析</span>
            </Link>
          )}
          {/* Status indicator — semantic, not decorative */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              backendOk === false
                ? 'bg-error-subtle border-error/25'
                : backendOk === true
                  ? 'bg-success-subtle border-success/25'
                  : 'bg-surface-2 border-subtle'
            }`}
          >
            <span
              className={`status-dot ${
                backendOk === false ? 'inactive' : 'active'
              }`}
              style={
                backendOk === false
                  ? { background: 'var(--status-error)', boxShadow: '0 0 6px rgba(229,90,90,0.4)' }
                  : undefined
              }
            />
            <span
              className={`font-body text-xs font-medium leading-none ${
                backendOk === false
                  ? 'text-error'
                  : backendOk === true
                    ? 'text-success'
                    : 'text-tertiary'
              }`}
            >
              {backendOk === false ? '后端未连接' : backendOk === true ? '系统就绪' : '检测中…'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
