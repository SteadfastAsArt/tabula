const connectionStatus = document.getElementById("connectionStatus") as HTMLSpanElement;
const tabCount = document.getElementById("tabCount") as HTMLSpanElement;
const closeSuggestedCount = document.getElementById("closeSuggestedCount") as HTMLSpanElement;
const captureBtn = document.getElementById("captureBtn") as HTMLButtonElement;
const syncBtn = document.getElementById("syncBtn") as HTMLButtonElement;
const openDesktopBtn = document.getElementById("openDesktopBtn") as HTMLButtonElement;
const messageEl = document.getElementById("message") as HTMLDivElement;
const hintEl = document.getElementById("hint") as HTMLDivElement;

// Current tab section elements
const currentTabSection = document.getElementById("currentTabSection") as HTMLDivElement;
const suggestionBadge = document.getElementById("suggestionBadge") as HTMLSpanElement;
const suggestionReason = document.getElementById("suggestionReason") as HTMLDivElement;
const keepBtn = document.getElementById("keepBtn") as HTMLButtonElement;
const closeCurrentBtn = document.getElementById("closeCurrentBtn") as HTMLButtonElement;

let currentTabId: number | null = null;

function sendMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response as T));
  });
}

function showMessage(text: string, isError = false): void {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#f87171" : "#4ade80";
  setTimeout(() => {
    messageEl.textContent = "";
  }, 3000);
}

interface TabInfo {
  found: boolean;
  suggestion: string | null;
  reason: string | null;
  category: string | null;
}

interface Stats {
  total_tabs: number;
  close_suggested: number;
  keep_suggested: number;
  unanalyzed: number;
}

function updateSuggestionUI(info: TabInfo | null): void {
  if (!info || !info.found) {
    currentTabSection.style.display = "none";
    return;
  }

  currentTabSection.style.display = "block";

  // Reset classes
  currentTabSection.className = "current-tab-section";

  if (info.suggestion === "close") {
    currentTabSection.classList.add("suggestion-close");
    suggestionBadge.textContent = "Close";
    suggestionBadge.className = "suggestion-badge close";
    keepBtn.disabled = false;
    closeCurrentBtn.disabled = false;
  } else if (info.suggestion === "keep") {
    currentTabSection.classList.add("suggestion-keep");
    suggestionBadge.textContent = "Keep";
    suggestionBadge.className = "suggestion-badge keep";
    keepBtn.disabled = false;
    closeCurrentBtn.disabled = false;
  } else if (info.suggestion === "unsure") {
    suggestionBadge.textContent = "Unsure";
    suggestionBadge.className = "suggestion-badge unsure";
    keepBtn.disabled = false;
    closeCurrentBtn.disabled = false;
  } else {
    suggestionBadge.textContent = "Not Analyzed";
    suggestionBadge.className = "suggestion-badge none";
    keepBtn.disabled = true;
    closeCurrentBtn.disabled = true;
  }

  // Show reason if available
  if (info.reason) {
    suggestionReason.textContent = info.reason;
    suggestionReason.style.display = "block";
  } else {
    suggestionReason.style.display = "none";
  }
}

async function updateCurrentTabInfo(): Promise<void> {
  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    currentTabSection.style.display = "none";
    return;
  }

  currentTabId = tab.id;

  // Get tab info from server
  const info = await sendMessage<TabInfo | null>({
    type: "getTabInfo",
    tabId: tab.id,
  });

  updateSuggestionUI(info);
}

async function updateStats(): Promise<void> {
  const stats = await sendMessage<Stats | null>({ type: "getServerStats" });

  if (stats) {
    closeSuggestedCount.textContent = String(stats.close_suggested);
    if (stats.close_suggested > 0) {
      closeSuggestedCount.className = "status-value warning";
    } else {
      closeSuggestedCount.className = "status-value";
    }
  } else {
    closeSuggestedCount.textContent = "-";
    closeSuggestedCount.className = "status-value";
  }
}

async function updateStatus(): Promise<void> {
  const status = await sendMessage<{
    connected: boolean;
    tabCount: number;
    activeTabId: number | null;
  }>({ type: "getStatus" });

  if (status.connected) {
    connectionStatus.textContent = "Connected";
    connectionStatus.className = "status-value connected";
    captureBtn.disabled = false;
    syncBtn.disabled = false;
    hintEl.textContent = "Desktop app connected. Use it to analyze tabs and generate reports.";

    // Fetch additional info when connected
    await Promise.all([updateCurrentTabInfo(), updateStats()]);
  } else {
    connectionStatus.textContent = "Not Connected";
    connectionStatus.className = "status-value disconnected";
    captureBtn.disabled = true;
    syncBtn.disabled = true;
    currentTabSection.style.display = "none";
    closeSuggestedCount.textContent = "-";
    hintEl.textContent = "Start the Tabula desktop app to enable AI analysis and daily reports.";
  }

  tabCount.textContent = String(status.tabCount);
}

// Capture button
captureBtn.addEventListener("click", async () => {
  captureBtn.disabled = true;
  captureBtn.textContent = "Capturing...";

  const result = await sendMessage<{ ok?: boolean; error?: string }>({
    type: "forceCapture",
  });

  if (result.ok) {
    showMessage("Tab captured successfully!");
  } else {
    showMessage(result.error ?? "Capture failed", true);
  }

  captureBtn.disabled = false;
  captureBtn.textContent = "📸 Capture Current Tab";
  await updateStatus();
});

// Sync button
syncBtn.addEventListener("click", async () => {
  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing...";

  const result = await sendMessage<{ ok?: boolean; error?: string }>({
    type: "syncAllTabs",
  });

  if (result.ok) {
    showMessage("All tabs synced!");
  } else {
    showMessage(result.error ?? "Sync failed", true);
  }

  syncBtn.disabled = false;
  syncBtn.textContent = "🔄 Sync All Tabs";
  await updateStatus();
});

// Open Desktop App button
openDesktopBtn.addEventListener("click", () => {
  // Try to open the desktop app via custom protocol
  // This requires the desktop app to register a protocol handler
  window.open("tabula://open", "_blank");
  showMessage("Opening desktop app...");
});

// Keep button - mark current tab as one to keep
keepBtn.addEventListener("click", async () => {
  if (!currentTabId) return;

  // For now, just close the popup with a message
  // In future, this could send feedback to the server
  showMessage("Marked as keep!");

  // Close the popup after a brief moment
  setTimeout(() => window.close(), 500);
});

// Close current tab button
closeCurrentBtn.addEventListener("click", async () => {
  if (!currentTabId) return;

  try {
    await chrome.tabs.remove(currentTabId);
    showMessage("Tab closed!");
    // Popup will close automatically since the tab is gone
  } catch {
    showMessage("Failed to close tab", true);
  }
});

// Initial status check
updateStatus();

// Refresh status every 5 seconds
setInterval(updateStatus, 5000);
