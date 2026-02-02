/**
 * Tabula Desktop - Type Definitions
 */

export interface ActiveSession {
  started_at: number;
  ended_at?: number;
  duration_ms: number;
}

export interface UrlHistoryEntry {
  url: string;
  title?: string;
  visited_at: number;
}

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
  /** Session history - each time the tab was actively viewed */
  sessions?: ActiveSession[];
  /** URL history - URLs visited in this tab */
  url_history?: UrlHistoryEntry[];
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
  auto_report: boolean;         // Auto-generate daily report at evening time
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

export interface CategoryTimeData {
  category: string;
  time_ms: number;
  tab_count: number;
}

export interface HourlyActivity {
  hour: number;        // 0-23
  time_ms: number;
  tab_switches: number;
}

export interface DomainTimeData {
  domain: string;
  time_ms: number;
  tab_count: number;
}

export interface TrendData {
  total_time_today: number;
  total_time_yesterday: number;
  tabs_opened_today: number;
  tabs_opened_yesterday: number;
  tabs_closed_today: number;
  tabs_closed_yesterday: number;
  top_category_today?: string;
  top_category_yesterday?: string;
}

export interface ActionItem {
  priority: string;      // high, medium, low
  action: string;
  reason: string;
  related_tabs: number[];
}

export interface DailyReport {
  date: string;
  content: string;
  generated_at: number;
  category_time?: CategoryTimeData[];
  hourly_activity?: HourlyActivity[];
  domain_time?: DomainTimeData[];
  trends?: TrendData;
  action_items?: ActionItem[];
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
