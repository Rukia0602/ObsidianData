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
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-midnight-600/60">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" onClick={reset}>
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-nebula via-violet to-cyan flex items-center justify-center shadow-lg shadow-nebula/20 group-hover:shadow-nebula/40 transition-shadow animate-gradient-x bg-[length:200%_auto]">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <BrandWordmark size="sm" className="block" />
            <span className="font-body text-xs text-frost-dim block -mt-0.5">
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
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border ${
            backendOk === false
              ? 'bg-ruby-subtle border-ruby/20'
              : backendOk === true
                ? 'bg-emerald-subtle border-emerald/20'
                : 'bg-midnight-800/50 border-midnight-600/40'
          }`}>
            <span className={`status-dot ${backendOk === false ? '' : 'active'}`} />
            <span className={`font-body text-sm font-medium leading-none ${
              backendOk === false
                ? 'text-ruby-light'
                : backendOk === true
                  ? 'text-emerald'
                  : 'text-frost-dim'
            }`}>
              {backendOk === false ? '后端未连接' : backendOk === true ? '系统就绪' : '检测中…'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}