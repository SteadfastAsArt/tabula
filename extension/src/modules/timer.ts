/**
 * Tab Cleanser Extension - Active Time Tracking
 */

import { TabData } from "./types";
import { getState, updateState } from "./state";
import { now } from "./utils";

/**
 * Stop the active timer for the current tab and accumulate the time
 */
export async function stopActiveTimer(): Promise<TabData | null> {
  const state = await getState();

  if (state.activeTabId === null || state.activeSince === null) {
    return null;
  }

  const tab = state.tabs[String(state.activeTabId)];
  if (!tab) return null;

  // Accumulate the time
  const sessionTime = now() - state.activeSince;
  const updatedTab: TabData = {
    ...tab,
    totalActiveMs: tab.totalActiveMs + sessionTime,
    isActive: false,
    lastActiveAt: now(),
  };

  await updateState((s) => ({
    ...s,
    tabs: { ...s.tabs, [String(tab.id)]: updatedTab },
    activeSince: null,
  }));

  return updatedTab;
}

/**
 * Start the active timer for a tab
 */
export async function startActiveTimer(tabId: number): Promise<void> {
  await updateState((state) => {
    const tab = state.tabs[String(tabId)];
    if (!tab) return state;

    return {
      ...state,
      activeTabId: tabId,
      activeWindowId: tab.windowId ?? null,
      activeSince: now(),
      tabs: {
        ...state.tabs,
        [String(tabId)]: {
          ...tab,
          isActive: true,
          lastActiveAt: now(),
        },
      },
    };
  });
}

/**
 * Periodically sync active time to storage (in case service worker dies)
 */
export async function syncActiveTime(): Promise<void> {
  const state = await getState();

  if (state.activeTabId === null || state.activeSince === null) {
    return;
  }

  const tab = state.tabs[String(state.activeTabId)];
  if (!tab) return;

  // Calculate time since last sync
  const sessionTime = now() - state.activeSince;

  // Update the stored time and reset activeSince
  await updateState((s) => ({
    ...s,
    activeSince: now(), // Reset the timer
    tabs: {
      ...s.tabs,
      [String(state.activeTabId!)]: {
        ...tab,
        totalActiveMs: tab.totalActiveMs + sessionTime,
        lastActiveAt: now(),
      },
    },
  }));
}
