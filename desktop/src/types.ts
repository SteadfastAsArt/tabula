/**
 * Tabula Desktop - Type Definitions
 */

export interface TabSnapshot {
  screenshot_path?: string;
  captured_at: number;
}

export interface TabSuggestion {
  decision: string;
  reason: string;
  category?: string;
  digest?: string;  // AI-generated brief summary of the tab content
  scored_at: number;
}

export interface TabRecord {
  id: number;
  window_id?: number;
  url?: string;
  title?: string;
  fav_icon_url?: string;
  created_at: number;
  last_active_at?: number;
  total_active_ms: number;
  is_active: boolean;
  closed_at?: number;
  /** Rich description extracted from page meta/content (max 8000 words) */
  description?: string;
  snapshot?: TabSnapshot;
  suggestion?: TabSuggestion;
}

export interface Settings {
  openai_api_key?: string;
  base_url?: string;
  model?: string;
  user_context?: string;
  analyze_batch_size?: number;
}

export interface DailyReport {
  date: string;
  content: string;
  generated_at: number;
}

export type SortField =
  | "last_active"
  | "created"
  | "title"
  | "active_time"
  | "has_screenshot"
  | "has_analysis";

export type SortOrder = "asc" | "desc";

export type GroupMode = "none" | "category" | "domain";

export type ViewType = "tabs" | "stats" | "history" | "report" | "settings";

export type TabCategory =
  | "work"
  | "research"
  | "communication"
  | "entertainment"
  | "shopping"
  | "reference"
  | "utility"
  | "uncategorized";

export interface CategoryInfo {
  id: TabCategory;
  label: string;
  icon: string;
  color: string;
}

export interface TabStats {
  totalTabs: number;
  totalActiveTime: number;
  avgActiveTime: number;
  avgAge: number;
  oldestTab: number;
  newestTab: number;
  withScreenshots: number;
  analyzed: number;
  categoryCounts: Record<TabCategory, number>;
  suggestionCounts: { keep: number; close: number; unsure: number };
  activeTimeDistribution: { under1m: number; under5m: number; under30m: number; over30m: number };
  ageDistribution: { under1h: number; under1d: number; under7d: number; over7d: number };
}
