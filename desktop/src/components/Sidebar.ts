/**
 * Tabula Desktop - Sidebar Component
 */

import type { ViewType, TabRecord } from "../types";
import { getStats } from "../utils";

export function renderSidebar(
  currentView: ViewType,
  tabs: TabRecord[]
): string {
  const stats = getStats(tabs);

  return `
    <aside class="sidebar">
      <div class="logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18"/>
          <path d="M9 21V9"/>
        </svg>
        <span>Tabula</span>
      </div>
      <nav class="nav">
        <div class="nav-section-label">Views</div>
        <button class="nav-item ${currentView === "tabs" ? "active" : ""}" data-view="tabs">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="9" rx="1"/>
            <rect x="14" y="3" width="7" height="5" rx="1"/>
            <rect x="14" y="12" width="7" height="9" rx="1"/>
            <rect x="3" y="16" width="7" height="5" rx="1"/>
          </svg>
          Open Tabs
        </button>
        <button class="nav-item ${currentView === "stats" ? "active" : ""}" data-view="stats">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 20V10"/>
            <path d="M12 20V4"/>
            <path d="M6 20v-6"/>
          </svg>
          Stats
        </button>
        <div class="nav-section-label">Tools</div>
        <button class="nav-item ${currentView === "history" ? "active" : ""}" data-view="history">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          History
        </button>
        <button class="nav-item ${currentView === "report" ? "active" : ""}" data-view="report">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M16 13H8"/>
            <path d="M16 17H8"/>
            <path d="M10 9H8"/>
          </svg>
          Report
        </button>
        <button class="nav-item ${currentView === "settings" ? "active" : ""}" data-view="settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"/>
          </svg>
          Settings
        </button>
      </nav>
      <div class="sidebar-stats">
        <div class="stat-item">
          <span class="stat-value">${stats.total}</span>
          <span class="stat-label">Open Tabs</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.withScreenshots}</span>
          <span class="stat-label">Screenshots</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.analyzed}</span>
          <span class="stat-label">Analyzed</span>
        </div>
      </div>
    </aside>
  `;
}
