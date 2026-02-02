/**
 * Tabula Desktop - Main Entry Point
 */

import { listen } from "@tauri-apps/api/event";
import "./style.css";

import type { ViewType, SortField, Settings, GroupMode, RuleConfig, ReminderConfig } from "./types";
import * as state from "./state";
import * as api from "./api";
import { renderSidebar } from "./components/Sidebar";
import { renderTabsView, setRecentlyClosedTabs } from "./views/TabsView";
import {
  renderOnboardingModal,
  shouldShowOnboarding,
  markOnboardingComplete,
} from "./components/Onboarding";
import { renderStatsView } from "./views/StatsView";
import { renderHistoryView } from "./views/HistoryView";
import { renderReportView } from "./views/ReportView";
import { renderSettingsView } from "./views/SettingsView";

// ─────────────────────────────────────────────────────────────
// Onboarding State
// ─────────────────────────────────────────────────────────────

let showOnboarding = false;
let onboardingStep = 0;

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
        state.currentPage,
        state.groupMode
      );
    case "stats":
      return renderStatsView(state.tabs);
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
    ${showOnboarding ? renderOnboardingModal(onboardingStep) : ""}
  `;

  attachEventListeners();
  if (showOnboarding) {
    attachOnboardingListeners();
  }
}

function attachOnboardingListeners(): void {
  const nextBtn = document.getElementById("onboardingNextBtn");
  const prevBtn = document.getElementById("onboardingPrevBtn");
  const skipBtn = document.getElementById("onboardingSkipBtn");
  const finishBtn = document.getElementById("onboardingFinishBtn");

  nextBtn?.addEventListener("click", () => {
    onboardingStep++;
    renderApp();
  });

  prevBtn?.addEventListener("click", () => {
    onboardingStep--;
    renderApp();
  });

  skipBtn?.addEventListener("click", () => {
    showOnboarding = false;
    markOnboardingComplete();
    renderApp();
  });

  finishBtn?.addEventListener("click", () => {
    showOnboarding = false;
    markOnboardingComplete();
    renderApp();
  });
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

function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function loadTheme(): void {
  const savedTheme = localStorage.getItem("tabula-theme") as "dark" | "light" | null;
  const theme = savedTheme || "dark";
  state.setTheme(theme);
  applyTheme(theme);
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

      // Check for collapsible group header first (before button check)
      const collapsibleHeader = target.closest("[data-toggle-group]") as HTMLElement | null;
      if (collapsibleHeader) {
        const toggleGroupAttr = collapsibleHeader.dataset.toggleGroup;
        if (toggleGroupAttr) {
          state.toggleGroupCollapsed(toggleGroupAttr);
          renderApp();
          return;
        }
      }

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

      // Group mode buttons
      const groupModeAttr = btn.dataset.groupMode;
      if (groupModeAttr) {
        state.setGroupMode(groupModeAttr as GroupMode);
        state.resetPage();
        renderApp();
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

      // Tab actions (keep/close/toggle-select)
      const action = btn.dataset.action;
      const tabIdStr = btn.dataset.tabId;
      const tabIdsStr = btn.dataset.tabIds;

      if (action === "toggle-select" && tabIdStr) {
        e.stopPropagation();
        const tabId = parseInt(tabIdStr);
        state.toggleTabSelection(tabId);
        renderApp();
        return;
      }

      if (action === "select-group" && tabIdsStr) {
        e.stopPropagation();
        const tabIds = tabIdsStr.split(",").map((id) => parseInt(id));
        state.selectAllTabs(tabIds);
        renderApp();
        return;
      }

      if (action === "close-group" && tabIdsStr) {
        e.stopPropagation();
        const tabIds = tabIdsStr.split(",").map((id) => parseInt(id));
        if (!confirm(`Close all ${tabIds.length} tabs in this group?`)) return;

        try {
          const count = await api.closeTabsBatch(tabIds);
          await loadTabs();
          showStatus(`Closed ${count} tabs`);
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        }
        return;
      }

      if (action && tabIdStr) {
        e.stopPropagation();
        const tabId = parseInt(tabIdStr);

        if (action === "close") {
          await api.closeTab(tabId);
          await loadTabs();
          await loadRecentlyClosedTabs();
        } else if (action === "keep") {
          await api.markKeep(tabId);
          await loadTabs();
          showStatus("Tab marked as keep");
        } else if (action === "restore-tab") {
          try {
            await api.restoreTab(tabId);
            await loadTabs();
            await loadRecentlyClosedTabs();
            showStatus("Tab restored!");
          } catch (err) {
            showStatus(`Error: ${err}`, true);
          }
        } else if (action === "disagree") {
          const currentDecision = btn.dataset.current;
          if (currentDecision) {
            try {
              await api.markDisagree(tabId, currentDecision);
              await loadTabs();
              showStatus(`Suggestion updated to ${currentDecision === "keep" ? "close" : "keep"}`);
            } catch (err) {
              showStatus(`Error: ${err}`, true);
            }
          }
        }
        return;
      }

      // Analyze with rules button (quick, no AI)
      if (btn.id === "analyzeRulesBtn") {
        btn.setAttribute("disabled", "true");
        btn.innerHTML = '<span class="spinner"></span> Analyzing...';
        showStatus("Running rule-based analysis...");

        try {
          const [tabs, count] = await api.analyzeWithRules();
          state.setTabs(tabs);
          if (count > 0) {
            showStatus(`Analyzed ${count} tabs with rules!`);
          } else {
            showStatus("No tabs matched the rules (try AI analysis)");
          }
          renderApp();
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        } finally {
          const rulesBtn = document.getElementById("analyzeRulesBtn");
          if (rulesBtn) {
            rulesBtn.removeAttribute("disabled");
            rulesBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              Quick Rules
            `;
          }
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

      // Toggle selection mode button
      if (btn.id === "toggleSelectionBtn") {
        state.setSelectionMode(!state.selectionMode);
        renderApp();
        return;
      }

      // Confirm all suggestions button
      if (btn.id === "confirmAllSuggestionsBtn") {
        const closeSuggestedTabs = state.tabs.filter(
          (t) => !t.closed_at && t.suggestion?.decision === "close"
        );
        if (closeSuggestedTabs.length === 0) return;

        if (!confirm(`Confirm all suggestions? This will close ${closeSuggestedTabs.length} tabs marked for closing.`))
          return;

        try {
          const count = await api.confirmAllSuggestions();
          await loadTabs();
          await loadRecentlyClosedTabs();
          showStatus(`Confirmed: closed ${count} tabs`);
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        }
        return;
      }

      // Select all visible tabs button
      if (btn.id === "selectAllVisibleBtn") {
        const openTabs = state.tabs.filter((t) => !t.closed_at);
        state.selectAllTabs(openTabs.map((t) => t.id));
        renderApp();
        return;
      }

      // Deselect all tabs button
      if (btn.id === "deselectAllBtn") {
        state.deselectAllTabs();
        renderApp();
        return;
      }

      // Close selected tabs button
      if (btn.id === "closeSelectedBtn") {
        const selectedIds = state.getSelectedTabIds();
        if (selectedIds.length === 0) return;

        if (!confirm(`Close ${selectedIds.length} selected tab${selectedIds.length > 1 ? "s" : ""}?`))
          return;

        try {
          const count = await api.closeTabsBatch(selectedIds);
          state.deselectAllTabs();
          await loadTabs();
          showStatus(`Closed ${count} tabs`);
        } catch (err) {
          showStatus(`Error: ${err}`, true);
        }
        return;
      }

      // Cancel selection button
      if (btn.id === "cancelSelectionBtn") {
        state.deselectAllTabs();
        renderApp();
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

        // Rule configuration
        const rulesEnabled = (document.getElementById("rulesEnabled") as HTMLInputElement)?.checked ?? true;
        const inactiveDays = parseInt((document.getElementById("inactiveDays") as HTMLInputElement)?.value) || 30;
        const minActiveSeconds = parseInt((document.getElementById("minActiveSeconds") as HTMLInputElement)?.value) || 30;
        const duplicateDomainThreshold = parseInt((document.getElementById("duplicateDomainThreshold") as HTMLInputElement)?.value) || 5;
        const whitelistDomainsStr = (document.getElementById("whitelistDomains") as HTMLInputElement)?.value || "";
        const blacklistDomainsStr = (document.getElementById("blacklistDomains") as HTMLInputElement)?.value || "";

        const parseDomainsInput = (input: string): string[] =>
          input.split(",").map((d) => d.trim()).filter((d) => d.length > 0);

        const rules: RuleConfig = {
          enabled: rulesEnabled,
          inactive_days_threshold: Math.max(1, Math.min(365, inactiveDays)),
          min_active_seconds: Math.max(1, Math.min(3600, minActiveSeconds)),
          duplicate_domain_threshold: Math.max(2, Math.min(50, duplicateDomainThreshold)),
          whitelist_domains: parseDomainsInput(whitelistDomainsStr),
          blacklist_domains: parseDomainsInput(blacklistDomainsStr),
        };

        // Reminder configuration
        const remindersEnabled = (document.getElementById("remindersEnabled") as HTMLInputElement)?.checked ?? true;
        const lunchReminder = (document.getElementById("lunchReminder") as HTMLInputElement)?.checked ?? true;
        const lunchTime = (document.getElementById("lunchTime") as HTMLInputElement)?.value || "11:30";
        const eveningReminder = (document.getElementById("eveningReminder") as HTMLInputElement)?.checked ?? true;
        const eveningTime = (document.getElementById("eveningTime") as HTMLInputElement)?.value || "17:30";
        const tabThresholdReminder = (document.getElementById("tabThresholdReminder") as HTMLInputElement)?.checked ?? true;
        const tabThreshold = parseInt((document.getElementById("tabThreshold") as HTMLInputElement)?.value) || 30;
        const intervalReminder = (document.getElementById("intervalReminder") as HTMLInputElement)?.checked ?? false;
        const intervalHours = parseInt((document.getElementById("intervalHours") as HTMLInputElement)?.value) || 2;

        const autoReport = (document.getElementById("autoReport") as HTMLInputElement)?.checked ?? true;

        const reminders: ReminderConfig = {
          enabled: remindersEnabled,
          lunch_reminder: lunchReminder,
          lunch_time: lunchTime,
          evening_reminder: eveningReminder,
          evening_time: eveningTime,
          tab_threshold_reminder: tabThresholdReminder,
          tab_threshold: Math.max(5, Math.min(200, tabThreshold)),
          interval_reminder: intervalReminder,
          interval_hours: Math.max(1, Math.min(12, intervalHours)),
          auto_report: autoReport,
        };

        const newSettings: Settings = {
          openai_api_key: apiKey || undefined,
          base_url: baseUrl || undefined,
          model: model || undefined,
          user_context: userContext || undefined,
          analyze_batch_size: Math.max(1, Math.min(100, batchSize)),
          rules,
          reminders,
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

      // Theme toggle buttons
      const themeValue = btn.dataset.themeValue as "dark" | "light" | undefined;
      if (themeValue) {
        state.setTheme(themeValue);
        applyTheme(themeValue);
        localStorage.setItem("tabula-theme", themeValue);
        renderApp();
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

  // Keyboard shortcuts
  document.addEventListener(
    "keydown",
    (e) => {
      // Only handle shortcuts in tabs view
      if (state.currentView !== "tabs") return;

      // Ctrl/Cmd + A: Select all tabs
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const openTabs = state.tabs.filter((t) => !t.closed_at);
        state.selectAllTabs(openTabs.map((t) => t.id));
        renderApp();
        return;
      }

      // Escape: Cancel selection
      if (e.key === "Escape" && state.selectionMode) {
        e.preventDefault();
        state.deselectAllTabs();
        renderApp();
        return;
      }

      // Delete/Backspace: Close selected tabs (when in selection mode)
      if ((e.key === "Delete" || e.key === "Backspace") && state.selectionMode && state.selectedTabs.size > 0) {
        e.preventDefault();
        const selectedIds = state.getSelectedTabIds();
        if (confirm(`Close ${selectedIds.length} selected tab${selectedIds.length > 1 ? "s" : ""}?`)) {
          api.closeTabsBatch(selectedIds).then((count) => {
            state.deselectAllTabs();
            loadTabs();
            showStatus(`Closed ${count} tabs`);
          }).catch((err) => {
            showStatus(`Error: ${err}`, true);
          });
        }
        return;
      }
    },
    { signal }
  );
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

async function loadRecentlyClosedTabs(): Promise<void> {
  try {
    const recentlyClosed = await api.getRecentlyClosedTabs(50);
    setRecentlyClosedTabs(recentlyClosed);
  } catch (err) {
    console.error("Failed to load recently closed tabs:", err);
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

async function loadReport(): Promise<void> {
  try {
    const report = await api.getReport();
    state.setReport(report);
  } catch (err) {
    console.error("Failed to load report:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Load theme from localStorage first (before any rendering)
  loadTheme();

  // Check if onboarding should be shown
  showOnboarding = shouldShowOnboarding();

  await Promise.all([
    loadTabs(),
    loadClosedTabs(),
    loadSettings(),
    loadReport(),
    loadRecentlyClosedTabs(),
  ]);

  await listen("tab-captured", () => {
    loadTabs();
    loadRecentlyClosedTabs();
  });

  await listen("tab-event", () => {
    loadTabs();
    loadRecentlyClosedTabs();
  });

  // Listen for reminder notifications from the backend
  await listen("reminder", (event) => {
    const data = event.payload as { title: string; body: string };
    showReminderNotification(data.title, data.body);
  });
}

// Show in-app reminder notification
function showReminderNotification(title: string, body: string): void {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = "reminder-notification";
  notification.innerHTML = `
    <div class="reminder-content">
      <div class="reminder-title">${title}</div>
      <div class="reminder-body">${body}</div>
    </div>
    <button class="reminder-dismiss">&times;</button>
  `;

  // Add click handler to dismiss
  notification.querySelector(".reminder-dismiss")?.addEventListener("click", () => {
    notification.classList.add("hiding");
    setTimeout(() => notification.remove(), 300);
  });

  // Add to page
  document.body.appendChild(notification);

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add("hiding");
      setTimeout(() => notification.remove(), 300);
    }
  }, 10000);
}

init();
