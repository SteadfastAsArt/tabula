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

export async function saveSettings(settings: Settings): Promise<void> {
  return invoke("save_settings", { settings });
}

export async function analyzeBatch(
  limit: number
): Promise<[TabRecord[], number]> {
  return invoke("analyze_batch", { limit });
}

export async function generateReport(): Promise<DailyReport> {
  return invoke("generate_report");
}

export async function closeTab(tabId: number): Promise<void> {
  return invoke("close_tab", { tabId });
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
