/**
 * Tabula Desktop - Type Definitions
 */

export interface TabSnapshot {
  text?: string;
  screenshot_path?: string;
  captured_at: number;
}

export interface TabSuggestion {
  decision: string;
  reason: string;
  category?: string;
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

export type ViewType = "tabs" | "history" | "report" | "settings";
