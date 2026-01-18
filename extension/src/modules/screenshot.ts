/**
 * Tabula Extension - Screenshot Capture Logic
 */

import { CapturePayload, TabEvent } from "./types";
import { SCREENSHOT_DELAY_MS } from "./config";
import { getState, updateState } from "./state";
import { sendToServer } from "./server";
import { now, getAccumulatedActiveMs } from "./utils";

// Track when user activated each tab to verify they stayed long enough
let lastActivatedTabId: number | null = null;
let lastActivatedTime: number = 0;
let screenshotTimer: ReturnType<typeof setTimeout> | null = null;

export function getLastActivatedTabId(): number | null {
  return lastActivatedTabId;
}

export function clearScreenshotTimer(): void {
  if (screenshotTimer) {
    clearTimeout(screenshotTimer);
    screenshotTimer = null;
  }
  lastActivatedTabId = null;
}

/**
 * Capture a screenshot for a specific tab
 */
export async function captureScreenshotForTab(
  tabId: number
): Promise<string | null> {
  try {
    // Double-check this tab is still active
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab?.id !== tabId) {
      return null;
    }

    // Can't screenshot chrome:// or extension pages
    if (
      activeTab.url?.startsWith("chrome://") ||
      activeTab.url?.startsWith("chrome-extension://")
    ) {
      return null;
    }

    // Get the window ID
    const windowId = activeTab.windowId;
    if (!windowId) return null;

    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "jpeg",
      quality: 60,
    });

    const screenshotBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    return screenshotBase64;
  } catch {
    return null;
  }
}

/**
 * Capture screenshot for a specific tab in a specific window
 * Used during refresh_all to capture active tabs in each window
 */
export async function captureScreenshotForTabInWindow(
  tabId: number,
  windowId: number
): Promise<string | null> {
  try {
    // Can't screenshot chrome:// or extension pages
    const tab = await chrome.tabs.get(tabId);
    if (
      tab.url?.startsWith("chrome://") ||
      tab.url?.startsWith("chrome-extension://")
    ) {
      return null;
    }

    // Capture the visible tab in this window
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "jpeg",
      quality: 60,
    });

    const screenshotBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    return screenshotBase64;
  } catch {
    return null;
  }
}

/**
 * Capture and send tab data to the server
 */
export async function captureAndSendTab(
  tabId: number,
  forceCapture: boolean = false
): Promise<boolean> {
  const state = await getState();
  const tab = state.tabs[String(tabId)];
  if (!tab) {
    return false;
  }

  // Check if user has been on this tab long enough (unless forced)
  if (!forceCapture) {
    if (lastActivatedTabId !== tabId) {
      return false;
    }

    const timeOnTab = now() - lastActivatedTime;
    if (timeOnTab < SCREENSHOT_DELAY_MS) {
      return false;
    }
  }

  // Extract description from content script
  let description: string | undefined;
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "extractContent",
    });
    description = response?.description;
  } catch {
    // Content script not available
  }

  // Capture screenshot
  const screenshotBase64 = await captureScreenshotForTab(tabId);

  // Send to server with accumulated time
  const payload: CapturePayload = {
    tab: {
      ...tab,
      description: description ?? tab.description,
      totalActiveMs: getAccumulatedActiveMs(tab, state),
      lastActiveAt: now(),
    },
    screenshotBase64: screenshotBase64 ?? undefined,
    capturedAt: now(),
  };

  const success = await sendToServer("/capture", payload);
  if (success && screenshotBase64) {
    // Update lastScreenshotAt if we captured a screenshot
    await updateState((s) => {
      const currentTab = s.tabs[String(tabId)];
      if (!currentTab) return s;
      return {
        ...s,
        tabs: {
          ...s.tabs,
          [String(tabId)]: {
            ...currentTab,
            lastScreenshotAt: now(),
          },
        },
      };
    });
  }
  return success;
}

/**
 * Schedule a screenshot after the user has stayed on a tab for a while
 */
export function scheduleScreenshot(tabId: number): void {
  // Clear any pending screenshot
  if (screenshotTimer) {
    clearTimeout(screenshotTimer);
    screenshotTimer = null;
  }

  // Record when this tab was activated
  lastActivatedTabId = tabId;
  lastActivatedTime = now();

  // Schedule screenshot after delay
  screenshotTimer = setTimeout(async () => {
    // Verify user is still on this tab
    if (lastActivatedTabId === tabId) {
      await captureAndSendTab(tabId);
    }
  }, SCREENSHOT_DELAY_MS);
}
