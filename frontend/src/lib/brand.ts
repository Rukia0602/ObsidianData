/** ObsidianData 品牌命名（全局统一引用） */
export const BRAND_NAME = 'ObsidianData';
export const BRAND_NAME_CN = '黑曜数据';
export const BRAND_TAGLINE = '数据分析引擎';
export const BRAND_PAGE_TITLE = `${BRAND_NAME} · ${BRAND_TAGLINE}`;
export const BRAND_DESCRIPTION =
  '上传 CSV/Excel，自动生成图表、规则引擎洞察与可执行行动计划';

export const BRAND_STORAGE_PREFIX = 'obsidian';

export const STORAGE_KEYS = {
  activeSession: `${BRAND_STORAGE_PREFIX}:active_session`,
  activeSessionLegacy: 'active_session',
  dashboardLayout: (fileId: string) => `${BRAND_STORAGE_PREFIX}:dashboard_layout:${fileId}`,
  dashboardLayoutLegacy: (fileId: string) => `dashboard_layout:${fileId}`,
  introSeen: `${BRAND_STORAGE_PREFIX}:intro_seen`,
  introSeenLegacy: 'intro_seen',
  analysisHistory: `${BRAND_STORAGE_PREFIX}:analysis_history`,
} as const;