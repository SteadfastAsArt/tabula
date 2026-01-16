/**
 * Tabula Extension - Background Service Worker
 *
 * Key features:
 * 1. Use chrome.storage.local to persist data (MV3 service workers can die anytime)
 * 2. Screenshot only after user stays on tab for 3+ seconds
 * 3. Active time is accumulated and synced to storage periodically
 * 4. WebSocket connection for receiving refresh commands from desktop app
 */

import { SYNC_INTERVAL_MS } from "./modules/config";
import { getState } from "./modules/state";
import { checkServerConnection } from "./modules/server";
import { syncActiveTime } from "./modules/timer";
import { captureAndSendTab } from "./modules/screenshot";
import {
  handleActivated,
  handleCreated,
  handleUpdated,
  handleRemoved,
  handleWindowFocusChanged,
} from "./modules/handlers";
import { connectWebSocket, ensureWebSocketConnected } from "./modules/websocket";
import { syncAllTabs } from "./modules/sync";

// ─────────────────────────────────────────────────────────────
// Message Handler (for popup)
// ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type) return;

  if (message.type === "getStatus") {
    Promise.all([getState(), checkServerConnection()]).then(
      ([state, connected]) => {
        sendResponse({
          connected,
          tabCount: Object.keys(state.tabs).length,
          activeTabId: state.activeTabId,
        });
      }
    );
    return true;
  }

  if (message.type === "forceCapture") {
    // Force capture current tab immediately (no 3 second wait)
    getState().then(async (state) => {
      if (state.activeTabId) {
        const success = await captureAndSendTab(state.activeTabId, true);
        sendResponse({ ok: success });
      } else {
        sendResponse({ error: "No active tab" });
      }
    });
    return true;
  }

  if (message.type === "syncAllTabs") {
    syncAllTabs()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ error: String(err) }));
    return true;
  }
});

// ─────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener((info) => {
  handleActivated(info).catch(console.error);
});

chrome.tabs.onCreated.addListener((tab) => {
  handleCreated(tab).catch(console.error);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  handleUpdated(tabId, changeInfo, tab).catch(console.error);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  handleRemoved(tabId).catch(console.error);
});

// Handle window focus changes - when user switches between windows
chrome.windows.onFocusChanged.addListener((windowId) => {
  handleWindowFocusChanged(windowId).catch(console.error);
});

// Periodic sync of active time to storage
setInterval(() => {
  syncActiveTime().catch(console.error);
}, SYNC_INTERVAL_MS);

// Periodically check WebSocket connection
setInterval(() => {
  ensureWebSocketConnected();
}, SYNC_INTERVAL_MS);

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

// Initial sync on startup
syncAllTabs().catch(console.error);

// Connect to WebSocket for receiving commands from desktop app
connectWebSocket();

console.log("[Tabula] Background service worker started");
