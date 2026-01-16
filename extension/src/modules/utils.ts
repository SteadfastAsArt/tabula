/**
 * Tab Cleanser Extension - Utility Functions
 */

import { TabData, StoredState } from "./types";

export function now(): number {
  return Date.now();
}

export function createTabData(tab: chrome.tabs.Tab): TabData {
  const timestamp = now();
  return {
    id: tab.id ?? -1,
    windowId: tab.windowId,
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    createdAt: timestamp,
    lastActiveAt: timestamp, // Initialize to creation time
    totalActiveMs: 0,
    isActive: false,
    discarded: tab.discarded,
  };
}

export function updateTabFromChrome(
  existing: TabData,
  chromeTab: chrome.tabs.Tab
): TabData {
  return {
    ...existing,
    url: chromeTab.url,
    title: chromeTab.title,
    favIconUrl: chromeTab.favIconUrl,
    windowId: chromeTab.windowId,
    discarded: chromeTab.discarded,
    // Preserve lastActiveAt from existing data
    lastActiveAt: existing.lastActiveAt,
  };
}

export function getAccumulatedActiveMs(
  tab: TabData,
  state: StoredState
): number {
  if (state.activeTabId === tab.id && state.activeSince !== null) {
    return tab.totalActiveMs + (now() - state.activeSince);
  }
  return tab.totalActiveMs;
}
