/**
 * Tab Cleanser Desktop - History View
 */

import type { TabRecord } from "../types";
import { escapeHtml, formatDuration, formatDateTime, getCategoryLabel } from "../utils";

function renderHistoryItem(tab: TabRecord): string {
  const closedTime = tab.closed_at ? formatDateTime(tab.closed_at) : "Unknown";
  const activeTime = formatDuration(tab.total_active_ms);
  const category = tab.suggestion?.category
    ? getCategoryLabel(tab.suggestion.category)
    : "";

  return `
    <div class="history-item">
      <div class="history-item-main">
        <div class="history-item-title" title="${escapeHtml(tab.title || "Untitled")}">${escapeHtml(tab.title || "Untitled")}</div>
        <div class="history-item-url" title="${escapeHtml(tab.url || "")}">${escapeHtml(tab.url || "")}</div>
      </div>
      <div class="history-item-meta">
        ${category ? `<span class="history-category">${category}</span>` : ""}
        <span class="history-stat" title="Time spent on this tab">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          ${activeTime}
        </span>
        <span class="history-stat" title="Closed at ${closedTime}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          ${closedTime}
        </span>
      </div>
    </div>
  `;
}

export function renderHistoryView(closedTabs: TabRecord[]): string {
  // Sort closed tabs by closed_at time (most recent first)
  const sortedClosedTabs = [...closedTabs].sort((a, b) => {
    const aTime = a.closed_at || 0;
    const bTime = b.closed_at || 0;
    return bTime - aTime;
  });

  return `
    <div class="view-wrapper">
      <header class="view-header">
        <div>
          <h1>Today's History</h1>
          <p class="subtitle">${closedTabs.length} tabs closed today - used for daily report</p>
        </div>
        <div class="actions">
          <button id="refreshHistoryBtn" class="btn secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6"/>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            Refresh
          </button>
        </div>
      </header>
      <div id="statusMessage" class="status-message"></div>
      <div class="scroll-area">
        <div class="history-list">
          ${
            sortedClosedTabs.length === 0
              ? `
            <div class="empty-state">
              <p>No tabs closed today yet.</p>
              <p>Closed tabs will appear here and be used for your daily report.</p>
            </div>
          `
              : sortedClosedTabs.map((tab) => renderHistoryItem(tab)).join("")
          }
        </div>
      </div>
    </div>
  `;
}
