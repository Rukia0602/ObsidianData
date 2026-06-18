import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChartSeriesPayload } from '@/lib/api';
import { fetchChartSeries } from '@/lib/api';
import type { ChartConfig } from '@/store/useAppStore';

export function useChartSeries(
  fileId: string,
  config: ChartConfig,
  filters: Record<string, Record<string, unknown>>,
  debounceMs = 200,
) {
  const [series, setSeries] = useState<ChartSeriesPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  const configKey = useMemo(() => JSON.stringify(config), [config]);
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    if (!fileId) return;
    const requestId = ++requestRef.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetchChartSeries(fileId, {
          ...config,
          filters,
        });
        if (requestId !== requestRef.current) return;
        setSeries(res.success && res.series ? res.series : null);
      } catch {
        if (requestId === requestRef.current) setSeries(null);
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [fileId, configKey, filtersKey, debounceMs]);

  return { series, loading };
}