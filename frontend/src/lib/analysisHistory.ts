import { STORAGE_KEYS } from '@/lib/brand';
import type { ActiveSession } from '@/lib/sessionStorage';
import type { AiAnalysis, FileInfo } from '@/store/useAppStore';

const MAX_RECORDS = 30;
const SUMMARY_MAX_LEN = 120;

export interface AnalysisRecord {
  id: string;
  createdAt: string;
  fileId: string;
  fileName: string;
  rowCount: number;
  colCount: number;
  summary: string;
  findingCount: number;
  actionCount: number;
  session: ActiveSession;
}

function readRecords(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.analysisHistory);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalysisRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: AnalysisRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.analysisHistory, JSON.stringify(records));
  } catch {
    // quota exceeded or private mode
  }
}

function truncateSummary(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= SUMMARY_MAX_LEN) return trimmed;
  return `${trimmed.slice(0, SUMMARY_MAX_LEN)}…`;
}

export function listAnalysisRecords(): AnalysisRecord[] {
  return readRecords().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function addAnalysisRecord(
  session: ActiveSession,
  fileInfo: FileInfo,
  analysis: AiAnalysis | null,
): AnalysisRecord | null {
  const record: AnalysisRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    fileId: fileInfo.file_id,
    fileName: fileInfo.file_name,
    rowCount: fileInfo.row_count,
    colCount: fileInfo.col_count,
    summary: truncateSummary(analysis?.summary ?? ''),
    findingCount: analysis?.findings?.length ?? 0,
    actionCount: analysis?.action_plans?.length ?? 0,
    session,
  };

  const records = [record, ...readRecords()].slice(0, MAX_RECORDS);
  writeRecords(records);
  return record;
}

export function removeAnalysisRecord(id: string) {
  writeRecords(readRecords().filter(r => r.id !== id));
}

export function clearAnalysisRecords() {
  localStorage.removeItem(STORAGE_KEYS.analysisHistory);
}