const connectionStatus = document.getElementById("connectionStatus") as HTMLSpanElement;
const tabCount = document.getElementById("tabCount") as HTMLSpanElement;
const captureBtn = document.getElementById("captureBtn") as HTMLButtonElement;
const syncBtn = document.getElementById("syncBtn") as HTMLButtonElement;
const messageEl = document.getElementById("message") as HTMLDivElement;
const hintEl = document.getElementById("hint") as HTMLDivElement;

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
  } else {
    connectionStatus.textContent = "Not Connected";
    connectionStatus.className = "status-value disconnected";
    captureBtn.disabled = true;
    syncBtn.disabled = true;
    hintEl.textContent = "Start the Tab Cleanser desktop app to enable AI analysis and daily reports.";
  }

  tabCount.textContent = String(status.tabCount);
}

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
  captureBtn.textContent = "Capture Current Tab";
  await updateStatus();
});

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
  syncBtn.textContent = "Sync All Tabs";
  await updateStatus();
});

// Initial status check
updateStatus();

// Refresh status every 5 seconds
setInterval(updateStatus, 5000);
