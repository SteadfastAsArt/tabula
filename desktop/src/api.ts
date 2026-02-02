/**
 * Tabula Desktop - Tauri API Wrapper
 */

import { invoke } from "@tauri-apps/api/core";
import type { TabRecord, Settings, DailyReport } from "./types";

export async function getTabs(): Promise<TabRecord[]> {
  return invoke("get_tabs");
}

export async function getClosedTabs(): Promise<TabRecord[]> {
  return invoke("get_closed_tabs");
}

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export async function getReport(): Promise<DailyReport | null> {
  return invoke("get_report");
}

export async function saveSettings(settings: Settings): Promise<void> {
  return invoke("save_settings", { settings });
}

export async function analyzeBatch(
  limit: number
): Promise<[TabRecord[], number]> {
  return invoke("analyze_batch", { limit });
}

export async function analyzeWithRules(): Promise<[TabRecord[], number]> {
  return invoke("analyze_with_rules");
}

export async function generateReport(): Promise<DailyReport> {
  return invoke("generate_report");
}

export async function closeTab(tabId: number): Promise<void> {
  return invoke("close_tab", { tabId });
}

export async function closeTabsBatch(tabIds: number[]): Promise<number> {
  return invoke("close_tabs_batch", { tabIds });
}

export async function markKeep(tabId: number): Promise<void> {
  return invoke("mark_keep", { tabId });
}

export async function clearSuggestions(): Promise<void> {
  return invoke("clear_suggestions");
}

export async function clearData(): Promise<void> {
  return invoke("clear_data");
}

export async function triggerRefresh(): Promise<void> {
  return invoke("trigger_refresh");
}

export async function cleanupOldTabs(days?: number): Promise<number> {
  return invoke("cleanup_old_tabs", { days });
}

export async function getStorageStats(): Promise<[number, number, number]> {
  return invoke("get_storage_stats");
}

export async function syncTabs(chromeTabIds: number[]): Promise<number> {
  return invoke("sync_tabs", { chromeTabIds });
}

export async function getRecentlyClosedTabs(
  limit?: number
): Promise<TabRecord[]> {
  return invoke("get_recently_closed_tabs", { limit });
}

export async function restoreTab(tabId: number): Promise<void> {
  return invoke("restore_tab", { tabId });
}

export interface DecisionPatterns {
  total_decisions: number;
  ai_agreement_rate: number;
  preferred_domains: string[];
  avoided_domains: string[];
  avg_kept_active_time_ms: number;
  avg_closed_active_time_ms: number;
}

export async function getDecisionPatterns(): Promise<DecisionPatterns> {
  return invoke("get_decision_patterns");
}

export async function markDisagree(
  tabId: number,
  currentDecision: string
): Promise<void> {
  return invoke("mark_disagree", { tabId, currentDecision });
}

export async function confirmAllSuggestions(): Promise<number> {
  return invoke("confirm_all_suggestions");
}

export async function exportToNotion(): Promise<string> {
  return invoke("export_to_notion");
}
