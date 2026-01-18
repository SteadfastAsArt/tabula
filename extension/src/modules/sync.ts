/**
 * Tabula Extension - Tab Sync Logic
 */

import { TabEvent } from "./types";
import { getState, updateState } from "./state";
import { sendToServer } from "./server";
import { now, createTabData, updateTabFromChrome } from "./utils";
import { scheduleScreenshot } from "./screenshot";

/**
 * Extract description from a tab's content script
 */
async function extractDescription(tabId: number): Promise<string | undefined> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "extractDescription",
    });
    return response?.description;
  } catch {
    // Content script not available
    return undefined;
  }
}

/**
 * Sync all tabs with the server
 * Called on extension startup to ensure server has current state
 */
export async function syncAllTabs(): Promise<void> {
  const chromeTabs = await chrome.tabs.query({});
  const state = await getState();
  const newTabs: Record<string, import("./types").TabData> = {};

  // Collect all current Chrome tab IDs for sync
  const chromeTabIds: number[] = [];
  let newCount = 0;
  let updatedCount = 0;

  for (const chromeTab of chromeTabs) {
    if (!chromeTab.id) continue;
    
    // Skip chrome:// and extension pages
    if (
      chromeTab.url?.startsWith("chrome://") ||
      chromeTab.url?.startsWith("chrome-extension://")
    ) {
      continue;
    }

    chromeTabIds.push(chromeTab.id);

    // Extract description if page is already loaded
    let description: string | undefined;
    if (chromeTab.status === "complete") {
      description = await extractDescription(chromeTab.id);
    }

    // Preserve existing data if we have it
    const existing = state.tabs[String(chromeTab.id)];
    if (existing) {
      newTabs[String(chromeTab.id)] = updateTabFromChrome(existing, chromeTab, description);
      updatedCount++;
    } else {
      newTabs[String(chromeTab.id)] = createTabData(chromeTab, description);
      newCount++;
    }

    // Send to server (silently)
    const event: TabEvent = {
      type: "created",
      tab: newTabs[String(chromeTab.id)],
      timestamp: now(),
    };
    await sendToServer("/event", event);
  }

  // Send sync request to clean up stale tabs on server
  await sendToServer("/sync", { tab_ids: chromeTabIds });

  // Find active tab
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  await updateState((s) => ({
    ...s,
    tabs: newTabs,
    activeTabId: activeTab?.id ?? null,
    activeWindowId: activeTab?.windowId ?? null,
    activeSince: activeTab?.id ? now() : null,
  }));

  // Schedule capture for the active tab
  if (activeTab?.id) {
    scheduleScreenshot(activeTab.id);
  }

  console.log(`[Tabula] Sync complete: ${newCount} new, ${updatedCount} updated, ${Object.keys(newTabs).length} total`);
}
