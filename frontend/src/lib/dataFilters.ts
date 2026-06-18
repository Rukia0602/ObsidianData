import type { DataFilterState } from '@/components/DataFilterPanel';

export function buildApiFilters(filters: DataFilterState): Record<string, Record<string, unknown>> {
  const payload: Record<string, Record<string, unknown>> = {};
  for (const [col, f] of Object.entries(filters)) {
    if (!f.enabled) continue;
    if (f.type === 'category') {
      if (f.values?.length) payload[col] = { type: 'category', values: f.values };
    } else if (f.type === 'range') {
      payload[col] = { type: 'range', min: f.min, max: f.max };
    } else if (f.type === 'search' && f.text) {
      payload[col] = { type: 'search', text: f.text };
    }
  }
  return payload;
}

export function hasActiveFilters(filters: DataFilterState): boolean {
  return Object.values(filters).some(f => f.enabled);
}