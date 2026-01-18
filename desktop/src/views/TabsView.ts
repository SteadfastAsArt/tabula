/**
 * Tabula Desktop - Tabs View
 */

import type { TabRecord, Settings, SortField, SortOrder, TabCategory } from "../types";
import { sortTabs, getStats, groupTabsByCategory, CATEGORIES, getCategoryInfo } from "../utils";
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
  const stats = getStats(tabs);
  const batchSize = settings.analyze_batch_size || 30;

  // Check if we're in grouped mode
  const isGroupedMode = sortField === "category";

  if (isGroupedMode) {
    return renderGroupedMode(openTabs, stats, batchSize, sortField);
  }

  // Normal sorted view with pagination
  const sortedTabs = sortTabs(openTabs, sortField, sortOrder);
  const totalTabs = sortedTabs.length;
  const totalPages = Math.ceil(totalTabs / TABS_PER_PAGE);
  const startIdx = currentPage * TABS_PER_PAGE;
  const endIdx = Math.min(startIdx + TABS_PER_PAGE, totalTabs);
  const paginatedTabs = sortedTabs.slice(startIdx, endIdx);

  const hasPrev = currentPage > 0;
  const hasNext = currentPage < totalPages - 1;

  return `
    <div class="view-wrapper">
      ${renderHeader(stats, batchSize)}
      <div class="toolbar">
        ${renderSortControls(sortField, sortOrder)}
        ${totalPages > 1 ? renderPagination(currentPage, totalPages, hasPrev, hasNext) : ""}
      </div>
      <div id="statusMessage" class="status-message"></div>
      <div class="scroll-area">
        <div class="tabs-grid">
          ${paginatedTabs.map((tab) => renderTabCard(tab)).join("")}
          ${paginatedTabs.length === 0 ? renderEmptyState() : ""}
        </div>
      </div>
    </div>
  `;
}

function renderGroupedMode(
  openTabs: TabRecord[],
  stats: ReturnType<typeof getStats>,
  batchSize: number,
  sortField: SortField
): string {
  const grouped = groupTabsByCategory(openTabs);
  
  // Filter out empty categories
  const nonEmptyCategories = CATEGORIES.filter(
    (cat) => (grouped.get(cat.id)?.length || 0) > 0
  );

  return `
    <div class="view-wrapper">
      ${renderHeader(stats, batchSize)}
      <div class="toolbar">
        ${renderSortControls(sortField, "desc")}
      </div>
      <div id="statusMessage" class="status-message"></div>
      <div class="scroll-area">
        <div class="grouped-container">
          ${nonEmptyCategories.length > 0
            ? nonEmptyCategories.map((cat) => renderCategoryGroup(cat.id, grouped.get(cat.id) || [])).join("")
            : renderEmptyState()
          }
        </div>
      </div>
    </div>
  `;
}

function renderCategoryGroup(category: TabCategory, tabs: TabRecord[]): string {
  const info = getCategoryInfo(category);

  return `
    <div class="category-group" data-category="${category}">
      <div class="category-header" style="--category-color: ${info.color}">
        <div class="category-title">
          <span class="category-icon">${info.icon}</span>
          <span class="category-name">${info.label}</span>
          <span class="category-count">${tabs.length}</span>
        </div>
      </div>
      <div class="category-tabs">
        <div class="tabs-grid">
          ${tabs.map((tab) => renderTabCard(tab)).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderHeader(stats: ReturnType<typeof getStats>, batchSize: number): string {
  return `
    <header class="view-header">
      <div>
        <h1>Open Tabs</h1>
        <p class="subtitle">${stats.total} tabs total, ${stats.unanalyzed} pending analysis</p>
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
  `;
}

function renderSortControls(sortField: SortField, sortOrder: string): string {
  return `
    <div class="sort-controls">
      <label>Sort by:</label>
      <select id="sortField">
        <option value="last_active" ${sortField === "last_active" ? "selected" : ""}>Last Active (离开时间)</option>
        <option value="created" ${sortField === "created" ? "selected" : ""}>Tab Age (创建时间)</option>
        <option value="title" ${sortField === "title" ? "selected" : ""}>Title (标题)</option>
        <option value="active_time" ${sortField === "active_time" ? "selected" : ""}>Active Time (活跃时长)</option>
        <option value="has_screenshot" ${sortField === "has_screenshot" ? "selected" : ""}>Has Screenshot (有截图)</option>
        <option value="has_analysis" ${sortField === "has_analysis" ? "selected" : ""}>Has Analysis (已分析)</option>
        <option value="category" ${sortField === "category" ? "selected" : ""}>Category (按类别分组)</option>
      </select>
      ${sortField !== "category" ? `
        <button id="toggleOrder" class="btn-order ${sortOrder}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </button>
      ` : ""}
    </div>
  `;
}

function renderPagination(currentPage: number, totalPages: number, hasPrev: boolean, hasNext: boolean): string {
  return `
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
  `;
}

function renderEmptyState(): string {
  return '<div class="empty-state">No tabs tracked yet. Make sure the Chrome extension is connected and click a tab to capture it.</div>';
}
