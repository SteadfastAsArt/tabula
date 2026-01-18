/**
 * Tabula Extension - WebSocket Connection Management
 */

import { CapturePayload, TabEvent } from "./types";
import { WS_URL, WS_RECONNECT_DELAY_MS } from "./config";
import { getState, updateState } from "./state";
import { sendToServer } from "./server";
import { now, createTabData, updateTabFromChrome, getAccumulatedActiveMs } from "./utils";
import { captureScreenshotForTabInWindow } from "./screenshot";

let ws: WebSocket | null = null;
let wsReconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleReconnect(): void {
  if (wsReconnectTimeout) return;
  wsReconnectTimeout = setTimeout(() => {
    wsReconnectTimeout = null;
    connectWebSocket();
  }, WS_RECONNECT_DELAY_MS);
}

/**
 * Refresh screenshots for all open tabs across all windows
 * This is called when the desktop app requests a refresh
 *
 * Chrome API limitation: We can only capture the VISIBLE tab in each window.
 * So we capture the active tab in each window, then sync all tab metadata.
 */
async function refreshAllScreenshots(): Promise<void> {
  // Get all windows to capture each window's active tab
  const windows = await chrome.windows.getAll({ populate: true });
  let capturedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const capturedTabIds = new Set<number>();

  // First pass: Capture active tab in each window
  for (const win of windows) {
    if (win.type !== "normal") continue; // Skip popup/devtools windows

    const activeTab = win.tabs?.find((t) => t.active);
    if (!activeTab?.id || !win.id) continue;

    // Skip chrome:// and extension pages
    if (
      activeTab.url?.startsWith("chrome://") ||
      activeTab.url?.startsWith("chrome-extension://")
    ) {
      skippedCount++;
      continue;
    }

    // Skip discarded tabs (they have no content to capture)
    if (activeTab.discarded) {
      skippedCount++;
      continue;
    }

    try {
      const screenshotBase64 = await captureScreenshotForTabInWindow(
        activeTab.id,
        win.id
      );

      // Get or create tab data
      const state = await getState();
      let tab = state.tabs[String(activeTab.id)];
      if (!tab) {
        tab = createTabData(activeTab);
      } else {
        tab = updateTabFromChrome(tab, activeTab);
      }

      await updateState((s) => ({
        ...s,
        tabs: { ...s.tabs, [String(activeTab.id!)]: tab! },
      }));

      // Get text content if possible
      let text: string | undefined;
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          type: "extractContent",
        });
        text = response?.text?.slice(0, 8000);
      } catch {
        // Content script not available
      }

      // Send to server
      const currentState = await getState();
      const currentTab = currentState.tabs[String(activeTab.id)];
      if (currentTab) {
        const payload: CapturePayload = {
          tab: {
            ...currentTab,
            totalActiveMs: getAccumulatedActiveMs(currentTab, currentState),
            lastActiveAt: now(),
          },
          text,
          screenshotBase64: screenshotBase64 ?? undefined,
          capturedAt: now(),
        };

        await sendToServer("/capture", payload);
        
        if (screenshotBase64) {
          capturedCount++;
          capturedTabIds.add(activeTab.id);

          // Update lastScreenshotAt
          await updateState((s) => {
            const t = s.tabs[String(activeTab.id!)];
            if (!t) return s;
            return {
              ...s,
              tabs: {
                ...s.tabs,
                [String(activeTab.id!)]: { ...t, lastScreenshotAt: now() },
              },
            };
          });
        } else {
          failedCount++;
        }
      }
    } catch {
      failedCount++;
    }
  }

  // Second pass: Sync metadata for all other tabs (no screenshots, just data update)
  const allTabs = await chrome.tabs.query({});
  let syncedCount = 0;
  
  for (const chromeTab of allTabs) {
    if (!chromeTab.id || capturedTabIds.has(chromeTab.id)) continue;

    // Skip chrome:// and extension pages
    if (
      chromeTab.url?.startsWith("chrome://") ||
      chromeTab.url?.startsWith("chrome-extension://")
    ) {
      continue;
    }

    // Get or create tab data
    const state = await getState();
    let tab = state.tabs[String(chromeTab.id)];
    if (!tab) {
      tab = createTabData(chromeTab);
    } else {
      tab = updateTabFromChrome(tab, chromeTab);
    }

    await updateState((s) => ({
      ...s,
      tabs: { ...s.tabs, [String(chromeTab.id!)]: tab! },
    }));

    // Send update event (no screenshot)
    const event: TabEvent = {
      type: "updated",
      tab: {
        ...tab,
        totalActiveMs: getAccumulatedActiveMs(tab, state),
      },
      timestamp: now(),
    };
    await sendToServer("/event", event);
    syncedCount++;
  }

  console.log(
    `[Tabula] Refresh complete: ${capturedCount} screenshots, ${syncedCount} tabs synced` +
    (failedCount > 0 ? `, ${failedCount} failed` : "") +
    (skippedCount > 0 ? `, ${skippedCount} skipped` : "")
  );
}

/**
 * Connect to the WebSocket server for receiving commands from desktop app
 */
export function connectWebSocket(): void {
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("[Tabula] WebSocket connected to desktop app");
    // Clear any pending reconnect
    if (wsReconnectTimeout) {
      clearTimeout(wsReconnectTimeout);
      wsReconnectTimeout = null;
    }
  };

  ws.onmessage = async (event) => {
    const command = event.data;

    if (command === "refresh_all") {
      await refreshAllScreenshots();
      // Send acknowledgment
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send("refresh_all_done");
      }
    } else if (command.startsWith("close_tab:")) {
      // Close a specific tab by ID
      const tabIdStr = command.replace("close_tab:", "");
      const tabId = parseInt(tabIdStr, 10);
      if (!isNaN(tabId)) {
        try {
          await chrome.tabs.remove(tabId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(`close_tab_done:${tabId}`);
          }
        } catch {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(`close_tab_error:${tabId}`);
          }
        }
      }
    }
  };

  ws.onclose = () => {
    ws = null;
    console.log("[Tabula] WebSocket disconnected, will retry in 5s...");
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose will be called after this, suppress the default error
  };
}

/**
 * Check and reconnect WebSocket if needed
 */
export function ensureWebSocketConnected(): void {
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    connectWebSocket();
  }
}
