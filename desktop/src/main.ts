/**
 * Tabula Desktop - Main Entry Point
 */

import { listen } from "@tauri-apps/api/event";
import "./style.css";

import type { ViewType, SortField, Settings } from "./types";
import * as state from "./state";
import * as api from "./api";
import { renderSidebar } from "./components/Sidebar";
import { renderTabsView } from "./views/TabsView";
import { renderHistoryView } from "./views/HistoryView";
import { renderReportView } from "./views/ReportView";
import { renderSettingsView } from "./views/SettingsView";

// ─────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────

function renderContent(): string {
  switch (state.currentView) {
    case "tabs":
      return renderTabsView(
        state.tabs,
        state.settings,
        state.sortField,
        state.sortOrder,
        state.currentPage
      );
    case "history":
      return renderHistoryView(state.closedTabs);
    case "report":
      return renderReportView(state.report);
    case "settings":
      return renderSettingsView(state.settings);
  }
}

function renderApp(): void {
  const app = document.getElementById("app")!;

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar(state.currentView, state.tabs)}
      <main class="content">
        ${renderContent()}
      </main>
    </div>
  `;

  attachEventListeners();
}

function showStatus(message: string, isError = false): void {
  const el = document.getElementById("statusMessage");
  if (!el) return;
  el.textContent = message;
  el.className = `status-message ${isError ? "error" : "success"} visible`;
  setTimeout(() => {
    el.className = "status-message";
  }, 4000);
}

// ─────────────────────────────────────────────────────────────
// Event Handling - Using Event Delegation to avoid accumulation
// ─────────────────────────────────────────────────────────────

// Store abort controller for cleanup
let eventController: AbortController | null = null;

function attachEventListeners(): void {
  // Clean up previous listeners
  if (eventController) {
    eventController.abort();
  }
  eventController = new AbortController();
  const signal = eventController.signal;

  const app = document.getElementById("app")!;

  // Use event delegation for all clicks
  app.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest("button, [data-action]") as HTMLElement | null;
      if (!btn) return;

      // Navigation
      if (btn.classList.contains("nav-item")) {
        const view = btn.dataset.view as ViewType;
        if (view) {
          state.setCurrentView(view);
          state.resetPage();
          renderApp();
        }
        return;
      }

      // Sort order toggle
      if (btn.id === "toggleOrder") {
        state.toggleSortOrder();
        state.resetPage();
        renderApp();
        return;
      }

      // Pagination
      if (btn.id === "prevPageBtn") {
        state.prevPage();
        renderApp();
        return;
      }

      if (btn.id === "nextPageBtn") {
        const openTabs = state.tabs.filter((t) => !t.closed_at);
        state.nextPage(openTabs.length);
        renderApp();
        return;
      }

      // Tab actions (keep/close)
      const action = btn.dataset.action;
      const tabIdStr = btn.dataset.tabId;
      if (action && tabIdStr) {
        e.stopPropagation();
        const tabId = parseInt(tabIdStr);

        if (action === "close") {
          await api.closeTab(tabId);
          await loadTabs();
        } else if (action === "keep") {
          await api.markKeep(tabId);
          await loadTabs();
          showStatus("Tab marked as keep");
        }
        return;
      }

      // Analyze batch button
      if (btn.id === "analyzeBatchBtn") {
        const batchSize = state.settings.analyze_batch_size || 30;
        btn.setAttribute("disabled", "true");
        btn.innerHTML = '<span class="spinner"></span> Analyzing...';
        showStatus("Analyzing unanalyzed tabs...");

        try {
          const [tabs, count] = await api.analyzeBatch(batchSize);
          state.setTabs(tabs);
          showStatus(`Analyzed ${count} tabs!`);
          renderApp();
        } catch (err) {
          showStatus(`Error: ${err}`, true);
          btn.removeAttribute("disabled");
          btn.innerHTML = `Analyze Next ${batchSize}`;
        }
        return;
      }

      // Refresh button
      if (btn.id === "refreshBtn") {
        btn.setAttribute("disabled", "true");
        btn.innerHTML = '<span class="spinner"></span> Refreshing...';

        try {
          await api.triggerRefresh();
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await loadTabs();
          showStatus("Tabs and screenshots refreshed!");
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        } finally {
          setTimeout(() => {
            const refreshBtn = document.getElementById("refreshBtn");
            if (refreshBtn) {
              refreshBtn.removeAttribute("disabled");
              refreshBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 2v6h-6"/>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M3 22v-6h6"/>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
                Refresh
              `;
            }
          }, 1000);
        }
        return;
      }

      // Clear suggestions button
      if (btn.id === "clearSuggestionsBtn") {
        if (!confirm("Clear all AI suggestions? This will allow you to re-analyze all tabs."))
          return;

        try {
          await api.clearSuggestions();
          await loadTabs();
          showStatus("All suggestions cleared");
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        }
        return;
      }

      // Refresh history button
      if (btn.id === "refreshHistoryBtn") {
        btn.setAttribute("disabled", "true");
        btn.innerHTML = '<span class="spinner"></span> Refreshing...';

        try {
          await loadClosedTabs();
          showStatus("History refreshed!");
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        } finally {
          setTimeout(() => {
            const histBtn = document.getElementById("refreshHistoryBtn");
            if (histBtn) {
              histBtn.removeAttribute("disabled");
              histBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 2v6h-6"/>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M3 22v-6h6"/>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
                Refresh
              `;
            }
          }, 500);
        }
        return;
      }

      // Generate report button
      if (btn.id === "generateReportBtn") {
        btn.setAttribute("disabled", "true");
        btn.innerHTML = '<span class="spinner"></span> Generating...';
        showStatus("Generating daily report...");

        try {
          const report = await api.generateReport();
          state.setReport(report);
          showStatus("Report generated!");
          renderApp();
        } catch (err) {
          showStatus(`Error: ${err}`, true);
          btn.removeAttribute("disabled");
          btn.innerHTML = "Generate Report";
        }
        return;
      }

      // Save settings button
      if (btn.id === "saveSettingsBtn") {
        const apiKey = (document.getElementById("apiKey") as HTMLInputElement).value.trim();
        const baseUrl = (document.getElementById("baseUrl") as HTMLInputElement).value.trim();
        const model = (document.getElementById("model") as HTMLInputElement).value.trim();
        const userContext = (document.getElementById("userContext") as HTMLTextAreaElement).value.trim();
        const batchSizeStr = (document.getElementById("batchSize") as HTMLInputElement).value.trim();
        const batchSize = parseInt(batchSizeStr) || 30;

        const newSettings: Settings = {
          openai_api_key: apiKey || undefined,
          base_url: baseUrl || undefined,
          model: model || undefined,
          user_context: userContext || undefined,
          analyze_batch_size: Math.max(1, Math.min(100, batchSize)),
        };

        try {
          await api.saveSettings(newSettings);
          state.setSettings(newSettings);
          showStatus("Settings saved!");
          renderApp();
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        }
        return;
      }

      // Clear data button
      if (btn.id === "clearDataBtn") {
        if (!confirm("Are you sure you want to clear all data? This cannot be undone."))
          return;

        try {
          await api.clearData();
          state.setTabs([]);
          state.setReport(null);
          showStatus("All data cleared");
          renderApp();
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        }
        return;
      }

      // Cleanup old tabs button
      if (btn.id === "cleanupOldTabsBtn") {
        btn.setAttribute("disabled", "true");
        btn.textContent = "Cleaning up...";

        try {
          const count = await api.cleanupOldTabs(7);
          if (count > 0) {
            await loadTabs();
            showStatus(`Cleaned up ${count} old tabs`);
          } else {
            showStatus("No old tabs to clean up");
          }
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        } finally {
          btn.removeAttribute("disabled");
          btn.textContent = "Clean Up Tabs Older Than 7 Days";
        }
        return;
      }
    },
    { signal }
  );

  // Sort field change
  const sortField = document.getElementById("sortField");
  if (sortField) {
    sortField.addEventListener(
      "change",
      (e) => {
        state.setSortField((e.target as HTMLSelectElement).value as SortField);
        state.resetPage();
        renderApp();
      },
      { signal }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Data Loading
// ─────────────────────────────────────────────────────────────

async function loadTabs(): Promise<void> {
  try {
    const tabs = await api.getTabs();
    state.setTabs(tabs);
    renderApp();
  } catch (err) {
    console.error("Failed to load tabs:", err);
  }
}

async function loadClosedTabs(): Promise<void> {
  try {
    const closedTabs = await api.getClosedTabs();
    state.setClosedTabs(closedTabs);
    renderApp();
  } catch (err) {
    console.error("Failed to load closed tabs:", err);
  }
}

async function loadSettings(): Promise<void> {
  try {
    const settings = await api.getSettings();
    state.setSettings(settings);
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  await Promise.all([loadTabs(), loadClosedTabs(), loadSettings()]);

  await listen("tab-captured", () => {
    loadTabs();
  });

  await listen("tab-event", () => {
    loadTabs();
  });
}

init();
