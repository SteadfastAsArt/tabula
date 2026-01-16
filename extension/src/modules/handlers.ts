/**
 * Tabula Extension - Tab Event Handlers
 */

import { TabData, TabEvent } from "./types";
import { getState, updateState } from "./state";
import { sendToServer } from "./server";
import { now, createTabData, updateTabFromChrome, getAccumulatedActiveMs } from "./utils";
import { stopActiveTimer, startActiveTimer } from "./timer";
import { scheduleScreenshot, getLastActivatedTabId, clearScreenshotTimer } from "./screenshot";

/**
 * Handle tab activation event
 */
export async function handleActivated(
  info: chrome.tabs.TabActiveInfo
): Promise<void> {
  // Stop timer for previous tab
  const prevTab = await stopActiveTimer();
  if (prevTab) {
    const event: TabEvent = { type: "updated", tab: prevTab, timestamp: now() };
    await sendToServer("/event", event);
  }

  // Get or create tab data
  const chromeTab = await chrome.tabs.get(info.tabId);
  const state = await getState();

  let tab = state.tabs[String(info.tabId)];
  if (tab) {
    tab = updateTabFromChrome(tab, chromeTab);
  } else {
    tab = createTabData(chromeTab);
  }

  // Save and start timer
  await updateState((s) => ({
    ...s,
    tabs: { ...s.tabs, [String(info.tabId)]: tab! },
  }));

  await startActiveTimer(info.tabId);

  // Send activated event
  const event: TabEvent = { type: "activated", tab, timestamp: now() };
  await sendToServer("/event", event);

  // Schedule screenshot (will only capture if user stays for 3+ seconds)
  scheduleScreenshot(info.tabId);
}

/**
 * Handle tab created event
 */
export async function handleCreated(chromeTab: chrome.tabs.Tab): Promise<void> {
  if (!chromeTab.id) return;

  const tab = createTabData(chromeTab);

  await updateState((state) => ({
    ...state,
    tabs: { ...state.tabs, [String(chromeTab.id!)]: tab },
  }));

  const event: TabEvent = { type: "created", tab, timestamp: now() };
  await sendToServer("/event", event);
}

/**
 * Handle tab updated event
 */
export async function handleUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  chromeTab: chrome.tabs.Tab
): Promise<void> {
  const state = await getState();
  let tab = state.tabs[String(tabId)];
  const wasDiscarded = tab?.discarded;

  if (!tab) {
    tab = createTabData(chromeTab);
  } else {
    tab = updateTabFromChrome(tab, chromeTab);
  }

  await updateState((s) => ({
    ...s,
    tabs: { ...s.tabs, [String(tabId)]: tab! },
  }));

  // Send update for meaningful changes
  if (
    changeInfo.status === "complete" ||
    changeInfo.title ||
    changeInfo.url ||
    changeInfo.discarded !== undefined
  ) {
    const updatedState = await getState();
    const event: TabEvent = {
      type: "updated",
      tab: {
        ...tab,
        totalActiveMs: getAccumulatedActiveMs(tab, updatedState),
      },
      timestamp: now(),
    };
    await sendToServer("/event", event);

    // Re-schedule screenshot if this is the active tab and:
    // 1. Page just finished loading, OR
    // 2. Tab was un-discarded (Chrome reloaded it)
    const isActiveTab = state.activeTabId === tabId;
    const wasUndiscarded = wasDiscarded && !chromeTab.discarded;

    if (isActiveTab && (changeInfo.status === "complete" || wasUndiscarded)) {
      scheduleScreenshot(tabId);
    }
  }
}

/**
 * Handle tab removed event
 */
export async function handleRemoved(tabId: number): Promise<void> {
  const state = await getState();
  const tab = state.tabs[String(tabId)];
  if (!tab) return;

  // Stop timer if this was the active tab
  if (state.activeTabId === tabId) {
    await stopActiveTimer();
  }

  // Cancel any pending screenshot for this tab
  if (getLastActivatedTabId() === tabId) {
    clearScreenshotTimer();
  }

  const closedTab: TabData = {
    ...tab,
    closedAt: now(),
    isActive: false,
    totalActiveMs: getAccumulatedActiveMs(tab, state),
  };

  // Remove from storage
  await updateState((s) => {
    const { [String(tabId)]: removed, ...rest } = s.tabs;
    return {
      ...s,
      tabs: rest,
      activeTabId: s.activeTabId === tabId ? null : s.activeTabId,
      activeSince: s.activeTabId === tabId ? null : s.activeSince,
    };
  });

  const event: TabEvent = { type: "removed", tab: closedTab, timestamp: now() };
  await sendToServer("/event", event);
}

/**
 * Handle window focus changes
 * When user switches to a different Chrome window, we need to:
 * 1. Stop timing for the previous active tab (in the old window)
 * 2. Start timing for the active tab in the newly focused window
 * 3. Schedule screenshot for the new active tab
 */
export async function handleWindowFocusChanged(windowId: number): Promise<void> {
  // windowId === chrome.windows.WINDOW_ID_NONE means Chrome lost focus entirely
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    const prevTab = await stopActiveTimer();
    if (prevTab) {
      const event: TabEvent = { type: "updated", tab: prevTab, timestamp: now() };
      await sendToServer("/event", event);
    }
    return;
  }

  // Get the active tab in the newly focused window
  const [activeTab] = await chrome.tabs.query({ active: true, windowId });
  if (!activeTab?.id) return;

  const state = await getState();

  // If this is the same tab we're already tracking, do nothing
  if (state.activeTabId === activeTab.id) return;

  // Stop timer for previous tab
  const prevTab = await stopActiveTimer();
  if (prevTab) {
    const event: TabEvent = { type: "updated", tab: prevTab, timestamp: now() };
    await sendToServer("/event", event);
  }

  // Get or create tab data for the new active tab
  let tab = state.tabs[String(activeTab.id)];
  if (tab) {
    tab = updateTabFromChrome(tab, activeTab);
  } else {
    tab = createTabData(activeTab);
  }

  // Save and start timer
  await updateState((s) => ({
    ...s,
    tabs: { ...s.tabs, [String(activeTab.id!)]: tab! },
  }));

  await startActiveTimer(activeTab.id);

  // Send activated event
  const event: TabEvent = { type: "activated", tab, timestamp: now() };
  await sendToServer("/event", event);

  // Schedule screenshot
  scheduleScreenshot(activeTab.id);
}
