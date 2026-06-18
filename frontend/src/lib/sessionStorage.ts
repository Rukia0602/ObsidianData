import { STORAGE_KEYS } from '@/lib/brand';
import type {
  AiAnalysis,
  ChartData,
  ChartsMeta,
  FileInfo,
  Insights,
} from '@/store/useAppStore';

export interface ActiveSession {
  fileInfo: FileInfo;
  charts: ChartData;
  chartsMeta: ChartsMeta | null;
  aiAnalysis: AiAnalysis | null;
  insights: Insights | null;
}

export function saveActiveSession(session: ActiveSession) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(session));
    sessionStorage.removeItem(STORAGE_KEYS.activeSessionLegacy);
  } catch {
    // quota exceeded or private mode
  }
}

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEYS.activeSession)
      ?? sessionStorage.getItem(STORAGE_KEYS.activeSessionLegacy);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

export function clearActiveSession() {
  sessionStorage.removeItem(STORAGE_KEYS.activeSession);
  sessionStorage.removeItem(STORAGE_KEYS.activeSessionLegacy);
}