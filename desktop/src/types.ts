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

export interface RuleConfig {
  enabled: boolean;
  inactive_days_threshold: number;
  min_active_seconds: number;
  duplicate_domain_threshold: number;
  whitelist_domains: string[];
  blacklist_domains: string[];
}

export interface ReminderConfig {
  enabled: boolean;
  lunch_reminder: boolean;
  lunch_time: string;           // HH:MM format
  evening_reminder: boolean;
  evening_time: string;         // HH:MM format
  tab_threshold_reminder: boolean;
  tab_threshold: number;
  interval_reminder: boolean;
  interval_hours: number;
}

export interface Settings {
  openai_api_key?: string;
  base_url?: string;
  model?: string;
  user_context?: string;
  analyze_batch_size?: number;
  rules?: RuleConfig;
  reminders?: ReminderConfig;
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
