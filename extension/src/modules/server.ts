/**
 * Tabula Extension - Server Communication
 */

import { SERVER_URL } from "./config";

export async function sendToServer(
  endpoint: string,
  data: unknown
): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (e) {
    console.log(`[Tabula] Failed to send to ${endpoint}:`, e);
    return false;
  }
}

export async function checkServerConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/health`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

export interface TabInfo {
  found: boolean;
  suggestion: string | null;
  reason: string | null;
  category: string | null;
}

export interface Stats {
  total_tabs: number;
  close_suggested: number;
  keep_suggested: number;
  unanalyzed: number;
}

export async function getTabInfo(tabId: number): Promise<TabInfo | null> {
  try {
    const response = await fetch(`${SERVER_URL}/tab/${tabId}`, { method: "GET" });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

export async function getStats(): Promise<Stats | null> {
  try {
    const response = await fetch(`${SERVER_URL}/stats`, { method: "GET" });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}
