/**
 * Tabula Desktop - Tabs View
 */

import type { TabRecord, Settings, SortField, SortOrder } from "../types";
import { sortTabs, getStats } from "../utils";
import { renderTabCard } from "../components/TabCard";
import { TABS_PER_PAGE } from "../state";

export function renderTabsView(
  tabs: TabRecord[],
  settings: Settings,
  sortField: SortField,
  sortOrder: SortOrder,
  currentPage: number
): string {
  const openTabs = tabs.filter((t) => !t.closed_at);
  const sortedTabs = sortTabs(openTabs, sortField, sortOrder);
  const stats = getStats(tabs);
  const batchSize = settings.analyze_batch_size || 30;

  // Pagination
  const totalTabs = sortedTabs.length;
  const totalPages = Math.ceil(totalTabs / TABS_PER_PAGE);
  const startIdx = currentPage * TABS_PER_PAGE;
  const endIdx = Math.min(startIdx + TABS_PER_PAGE, totalTabs);
  const paginatedTabs = sortedTabs.slice(startIdx, endIdx);

  const hasPrev = currentPage > 0;
  const hasNext = currentPage < totalPages - 1;

  return `
    <div class="view-wrapper">
      <header class="view-header">
        <div>
          <h1>Open Tabs</h1>
          <p class="subtitle">${stats.unanalyzed} tabs pending analysis (showing ${startIdx + 1}-${endIdx} of ${totalTabs})</p>
        </div>
        <div class="actions">
          <button id="analyzeBatchBtn" class="btn primary" ${stats.unanalyzed === 0 ? "disabled" : ""}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 1 0 10 10"/>
              <path d="M12 12l4-4"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            Analyze Next ${batchSize}
          </button>
          <button id="refreshBtn" class="btn secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6"/>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            Refresh
          </button>
          <button id="clearSuggestionsBtn" class="btn secondary" title="Clear all AI suggestions to re-analyze">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Reset
          </button>
        </div>
      </header>
      <div class="toolbar">
        <div class="sort-controls">
          <label>Sort by:</label>
          <select id="sortField">
            <option value="last_active" ${sortField === "last_active" ? "selected" : ""}>Last Active (离开时间)</option>
            <option value="created" ${sortField === "created" ? "selected" : ""}>Tab Age (创建时间)</option>
            <option value="title" ${sortField === "title" ? "selected" : ""}>Title (标题)</option>
            <option value="active_time" ${sortField === "active_time" ? "selected" : ""}>Active Time (活跃时长)</option>
            <option value="has_screenshot" ${sortField === "has_screenshot" ? "selected" : ""}>Has Screenshot (有截图)</option>
            <option value="has_analysis" ${sortField === "has_analysis" ? "selected" : ""}>Has Analysis (已分析)</option>
          </select>
          <button id="toggleOrder" class="btn-order ${sortOrder}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </button>
        </div>
        ${totalPages > 1 ? `
          <div class="pagination">
            <button id="prevPageBtn" class="btn-page" ${!hasPrev ? "disabled" : ""}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span class="page-info">${currentPage + 1} / ${totalPages}</span>
            <button id="nextPageBtn" class="btn-page" ${!hasNext ? "disabled" : ""}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        ` : ""}
      </div>
      <div id="statusMessage" class="status-message"></div>
      <div class="scroll-area">
        <div class="tabs-grid">
          ${paginatedTabs.map((tab) => renderTabCard(tab)).join("")}
          ${
            paginatedTabs.length === 0
              ? '<div class="empty-state">No tabs tracked yet. Make sure the Chrome extension is connected and click a tab to capture it.</div>'
              : ""
          }
        </div>
      </div>
    </div>
  `;
}
