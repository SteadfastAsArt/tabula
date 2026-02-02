/**
 * Tabula Desktop - Tabs View (React)
 */

import React, { useState, useCallback, useMemo } from "react";
import type { TabRecord, SortField, GroupMode } from "../../types";
import type { AppState, AppActions } from "../../hooks/useAppState";
import { TABS_PER_PAGE } from "../../hooks/useAppState";
import * as api from "../../api";
import { sortTabs, getStats, groupTabsByCategory, groupTabsByDomain, CATEGORIES, getCategoryInfo } from "../../utils";
import { TabCard } from "../../components/react/TabCard";
import { ClosedTabCard } from "../../components/react/ClosedTabCard";

interface TabsViewProps {
  state: AppState;
  actions: AppActions;
  loadTabs: () => Promise<void>;
  loadRecentlyClosedTabs: () => Promise<void>;
}

export function TabsView({
  state,
  actions,
  loadTabs,
  loadRecentlyClosedTabs,
}: TabsViewProps): React.ReactElement {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingRules, setIsAnalyzingRules] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openTabs = useMemo(() => state.tabs.filter((t) => !t.closed_at), [state.tabs]);
  const stats = useMemo(() => getStats(state.tabs), [state.tabs]);
  const batchSize = state.settings.analyze_batch_size || 30;
  const closeSuggestedCount = useMemo(
    () => openTabs.filter((t) => t.suggestion?.decision === "close").length,
    [openTabs]
  );

  const handleClose = useCallback(
    async (tabId: number) => {
      await api.closeTab(tabId);
      await loadTabs();
      await loadRecentlyClosedTabs();
    },
    [loadTabs, loadRecentlyClosedTabs]
  );

  const handleKeep = useCallback(
    async (tabId: number) => {
      await api.markKeep(tabId);
      await loadTabs();
      actions.showStatus("Tab marked as keep");
    },
    [loadTabs, actions]
  );

  const handleDisagree = useCallback(
    async (tabId: number, currentDecision: string) => {
      try {
        await api.markDisagree(tabId, currentDecision);
        await loadTabs();
        actions.showStatus(`Suggestion updated to ${currentDecision === "keep" ? "close" : "keep"}`);
      } catch (err) {
        actions.showStatus(`Error: ${err}`, true);
      }
    },
    [loadTabs, actions]
  );

  const handleRestore = useCallback(
    async (tabId: number) => {
      try {
        await api.restoreTab(tabId);
        await loadTabs();
        await loadRecentlyClosedTabs();
        actions.showStatus("Tab restored!");
      } catch (err) {
        actions.showStatus(`Error: ${err}`, true);
      }
    },
    [loadTabs, loadRecentlyClosedTabs, actions]
  );

  const handleAnalyzeRules = useCallback(async () => {
    setIsAnalyzingRules(true);
    actions.showStatus("Running rule-based analysis...");
    try {
      const [tabs, count] = await api.analyzeWithRules();
      actions.setTabs(tabs);
      if (count > 0) {
        actions.showStatus(`Analyzed ${count} tabs with rules!`);
      } else {
        actions.showStatus("No tabs matched the rules (try AI analysis)");
      }
    } catch (err) {
      actions.showStatus(`Error: ${err}`, true);
    } finally {
      setIsAnalyzingRules(false);
    }
  }, [actions]);

  const handleAnalyzeBatch = useCallback(async () => {
    setIsAnalyzing(true);
    actions.showStatus("Analyzing unanalyzed tabs...");
    try {
      const [tabs, count] = await api.analyzeBatch(batchSize);
      actions.setTabs(tabs);
      actions.showStatus(`Analyzed ${count} tabs!`);
    } catch (err) {
      actions.showStatus(`Error: ${err}`, true);
    } finally {
      setIsAnalyzing(false);
    }
  }, [batchSize, actions]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await api.triggerRefresh();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await loadTabs();
      actions.showStatus("Tabs and screenshots refreshed!");
    } catch (err) {
      actions.showStatus(`Error: ${err}`, true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTabs, actions]);

  const handleClearSuggestions = useCallback(async () => {
    if (!confirm("Clear all AI suggestions? This will allow you to re-analyze all tabs.")) return;
    try {
      await api.clearSuggestions();
      await loadTabs();
      actions.showStatus("All suggestions cleared");
    } catch (err) {
      actions.showStatus(`Error: ${err}`, true);
    }
  }, [loadTabs, actions]);

  const handleConfirmAll = useCallback(async () => {
    if (!confirm(`Confirm all suggestions? This will close ${closeSuggestedCount} tabs marked for closing.`)) return;
    try {
      const count = await api.confirmAllSuggestions();
      await loadTabs();
      await loadRecentlyClosedTabs();
      actions.showStatus(`Confirmed: closed ${count} tabs`);
    } catch (err) {
      actions.showStatus(`Error: ${err}`, true);
    }
  }, [closeSuggestedCount, loadTabs, loadRecentlyClosedTabs, actions]);

  const handleCloseSelected = useCallback(async () => {
    const selectedIds = actions.getSelectedTabIds();
    if (selectedIds.length === 0) return;
    if (!confirm(`Close ${selectedIds.length} selected tab${selectedIds.length > 1 ? "s" : ""}?`)) return;

    try {
      const count = await api.closeTabsBatch(selectedIds);
      actions.deselectAllTabs();
      await loadTabs();
      await loadRecentlyClosedTabs();
      actions.showStatus(`Closed ${count} tabs`);
    } catch (err) {
      actions.showStatus(`Error: ${err}`, true);
    }
  }, [actions, loadTabs, loadRecentlyClosedTabs]);

  const handleCloseGroup = useCallback(
    async (tabIds: number[]) => {
      if (!confirm(`Close all ${tabIds.length} tabs in this group?`)) return;
      try {
        const count = await api.closeTabsBatch(tabIds);
        await loadTabs();
        await loadRecentlyClosedTabs();
        actions.showStatus(`Closed ${count} tabs`);
      } catch (err) {
        actions.showStatus(`Error: ${err}`, true);
      }
    },
    [loadTabs, loadRecentlyClosedTabs, actions]
  );

  // Render based on group mode
  if (state.groupMode !== "none") {
    return (
      <GroupedTabsView
        openTabs={openTabs}
        stats={stats}
        batchSize={batchSize}
        closeSuggestedCount={closeSuggestedCount}
        state={state}
        actions={actions}
        isAnalyzing={isAnalyzing}
        isAnalyzingRules={isAnalyzingRules}
        isRefreshing={isRefreshing}
        onClose={handleClose}
        onKeep={handleKeep}
        onDisagree={handleDisagree}
        onRestore={handleRestore}
        onAnalyzeRules={handleAnalyzeRules}
        onAnalyzeBatch={handleAnalyzeBatch}
        onRefresh={handleRefresh}
        onClearSuggestions={handleClearSuggestions}
        onConfirmAll={handleConfirmAll}
        onCloseSelected={handleCloseSelected}
        onCloseGroup={handleCloseGroup}
      />
    );
  }

  // Normal sorted view with pagination
  const sortedTabs = sortTabs(openTabs, state.sortField, state.sortOrder);
  const totalTabs = sortedTabs.length;
  const totalPages = Math.ceil(totalTabs / TABS_PER_PAGE);
  const startIdx = state.currentPage * TABS_PER_PAGE;
  const endIdx = Math.min(startIdx + TABS_PER_PAGE, totalTabs);
  const paginatedTabs = sortedTabs.slice(startIdx, endIdx);

  const hasPrev = state.currentPage > 0;
  const hasNext = state.currentPage < totalPages - 1;

  return (
    <div className="view-wrapper">
      <Header
        stats={stats}
        batchSize={batchSize}
        closeSuggestedCount={closeSuggestedCount}
        selectionMode={state.selectionMode}
        selectedCount={state.selectedTabs.size}
        unanalyzed={stats.unanalyzed}
        isAnalyzing={isAnalyzing}
        isAnalyzingRules={isAnalyzingRules}
        isRefreshing={isRefreshing}
        onToggleSelection={() => actions.setSelectionMode(!state.selectionMode)}
        onConfirmAll={handleConfirmAll}
        onAnalyzeRules={handleAnalyzeRules}
        onAnalyzeBatch={handleAnalyzeBatch}
        onRefresh={handleRefresh}
        onClearSuggestions={handleClearSuggestions}
      />
      {state.selectionMode && state.selectedTabs.size > 0 && (
        <BatchActionBar
          selectedCount={state.selectedTabs.size}
          onSelectAll={() => actions.selectAllTabs(openTabs.map((t) => t.id))}
          onDeselectAll={actions.deselectAllTabs}
          onCloseSelected={handleCloseSelected}
          onCancel={actions.deselectAllTabs}
        />
      )}
      <div className="toolbar">
        <GroupControls groupMode={state.groupMode} onGroupModeChange={actions.setGroupMode} />
        <div className="toolbar-divider" />
        <SortControls
          sortField={state.sortField}
          sortOrder={state.sortOrder}
          onSortFieldChange={actions.setSortField}
          onToggleSortOrder={actions.toggleSortOrder}
        />
        {totalPages > 1 && (
          <Pagination
            currentPage={state.currentPage}
            totalPages={totalPages}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={actions.prevPage}
            onNext={() => actions.nextPage(totalTabs)}
          />
        )}
      </div>
      <div id="statusMessage" className="status-message" />
      <div className="scroll-area">
        <div className="tabs-grid">
          {paginatedTabs.map((tab) => (
            <TabCard
              key={tab.id}
              tab={tab}
              isSelected={actions.isTabSelected(tab.id)}
              selectionMode={state.selectionMode}
              onToggleSelect={actions.toggleTabSelection}
              onClose={handleClose}
              onKeep={handleKeep}
              onDisagree={handleDisagree}
            />
          ))}
          {paginatedTabs.length === 0 && <EmptyState />}
        </div>
        <RecentlyClosedSection
          tabs={state.recentlyClosedTabs}
          isCollapsed={actions.isGroupCollapsed("recently-closed")}
          onToggle={() => actions.toggleGroupCollapsed("recently-closed")}
          onRestore={handleRestore}
        />
      </div>
    </div>
  );
}

// Sub-components

interface HeaderProps {
  stats: ReturnType<typeof getStats>;
  batchSize: number;
  closeSuggestedCount: number;
  selectionMode: boolean;
  selectedCount: number;
  unanalyzed: number;
  isAnalyzing: boolean;
  isAnalyzingRules: boolean;
  isRefreshing: boolean;
  onToggleSelection: () => void;
  onConfirmAll: () => void;
  onAnalyzeRules: () => void;
  onAnalyzeBatch: () => void;
  onRefresh: () => void;
  onClearSuggestions: () => void;
}

function Header({
  stats,
  batchSize,
  closeSuggestedCount,
  selectionMode,
  selectedCount,
  unanalyzed,
  isAnalyzing,
  isAnalyzingRules,
  isRefreshing,
  onToggleSelection,
  onConfirmAll,
  onAnalyzeRules,
  onAnalyzeBatch,
  onRefresh,
  onClearSuggestions,
}: HeaderProps): React.ReactElement {
  return (
    <header className="view-header">
      <div>
        <h1>Open Tabs</h1>
        <p className="subtitle">
          {stats.total} tabs total, {stats.unanalyzed} pending analysis
        </p>
      </div>
      <div className="actions">
        <button
          className={`btn ${selectionMode ? "active" : "secondary"}`}
          onClick={onToggleSelection}
          title="Toggle selection mode (Ctrl+A to select all)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          {selectionMode ? `${selectedCount} selected` : "Select"}
        </button>
        {closeSuggestedCount > 0 && (
          <button
            className="btn success"
            onClick={onConfirmAll}
            title="Confirm all AI suggestions: close tabs marked 'close'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Confirm All ({closeSuggestedCount})
          </button>
        )}
        <button
          className="btn secondary"
          onClick={onAnalyzeRules}
          disabled={unanalyzed === 0 || isAnalyzingRules}
          title="Quick analysis using rules (no AI required)"
        >
          {isAnalyzingRules ? (
            <>
              <span className="spinner" />
              Analyzing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Quick Rules
            </>
          )}
        </button>
        <button
          className="btn primary"
          onClick={onAnalyzeBatch}
          disabled={unanalyzed === 0 || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className="spinner" />
              Analyzing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M12 12l4-4" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              Analyze Next {batchSize}
            </>
          )}
        </button>
        <button className="btn secondary" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <span className="spinner" />
              Refreshing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              Refresh
            </>
          )}
        </button>
        <button
          className="btn secondary"
          onClick={onClearSuggestions}
          title="Clear all AI suggestions to re-analyze"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
          Reset
        </button>
      </div>
    </header>
  );
}

interface BatchActionBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCloseSelected: () => void;
  onCancel: () => void;
}

function BatchActionBar({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onCloseSelected,
  onCancel,
}: BatchActionBarProps): React.ReactElement {
  return (
    <div className="batch-action-bar">
      <div className="batch-info">
        <span>
          {selectedCount} tab{selectedCount > 1 ? "s" : ""} selected
        </span>
        <button className="btn-link" onClick={onSelectAll}>
          Select All
        </button>
        <button className="btn-link" onClick={onDeselectAll}>
          Deselect All
        </button>
      </div>
      <div className="batch-actions">
        <button className="btn danger" onClick={onCloseSelected}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          Close Selected
        </button>
        <button className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

interface GroupControlsProps {
  groupMode: GroupMode;
  onGroupModeChange: (mode: GroupMode) => void;
}

function GroupControls({ groupMode, onGroupModeChange }: GroupControlsProps): React.ReactElement {
  return (
    <div className="group-controls">
      <label>Group by:</label>
      <div className="group-buttons">
        <button
          className={`btn-group ${groupMode === "none" ? "active" : ""}`}
          onClick={() => onGroupModeChange("none")}
        >
          None
        </button>
        <button
          className={`btn-group ${groupMode === "category" ? "active" : ""}`}
          onClick={() => onGroupModeChange("category")}
        >
          📁 Category
        </button>
        <button
          className={`btn-group ${groupMode === "domain" ? "active" : ""}`}
          onClick={() => onGroupModeChange("domain")}
        >
          🌐 Domain
        </button>
      </div>
    </div>
  );
}

interface SortControlsProps {
  sortField: SortField;
  sortOrder: string;
  onSortFieldChange: (field: SortField) => void;
  onToggleSortOrder: () => void;
}

function SortControls({
  sortField,
  sortOrder,
  onSortFieldChange,
  onToggleSortOrder,
}: SortControlsProps): React.ReactElement {
  return (
    <div className="sort-controls">
      <label>Sort by:</label>
      <select
        value={sortField}
        onChange={(e) => onSortFieldChange(e.target.value as SortField)}
      >
        <option value="last_active">Last Active</option>
        <option value="created">Tab Age</option>
        <option value="title">Title</option>
        <option value="active_time">Active Time</option>
        <option value="has_screenshot">Has Screenshot</option>
        <option value="has_analysis">Has Analysis</option>
      </select>
      <button className={`btn-order ${sortOrder}`} onClick={onToggleSortOrder}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </button>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

function Pagination({
  currentPage,
  totalPages,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: PaginationProps): React.ReactElement {
  return (
    <div className="pagination">
      <button className="btn-page" disabled={!hasPrev} onClick={onPrev}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span className="page-info">
        {currentPage + 1} / {totalPages}
      </span>
      <button className="btn-page" disabled={!hasNext} onClick={onNext}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div className="empty-state">
      No tabs tracked yet. Make sure the Chrome extension is connected and click a tab to capture it.
    </div>
  );
}

interface RecentlyClosedSectionProps {
  tabs: TabRecord[];
  isCollapsed: boolean;
  onToggle: () => void;
  onRestore: (tabId: number) => void;
}

function RecentlyClosedSection({
  tabs,
  isCollapsed,
  onToggle,
  onRestore,
}: RecentlyClosedSectionProps): React.ReactElement | null {
  if (tabs.length === 0) return null;

  const displayTabs = tabs.slice(0, 10);

  return (
    <div className={`recently-closed-section ${isCollapsed ? "collapsed" : ""}`}>
      <div className="recently-closed-header collapsible" onClick={onToggle}>
        <div className="recently-closed-title">
          <span className="collapse-icon">{isCollapsed ? "▶" : "▼"}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <span>Recently Closed</span>
          <span className="recently-closed-count">{tabs.length}</span>
        </div>
      </div>
      <div className="recently-closed-content" style={{ display: isCollapsed ? "none" : undefined }}>
        <div className="closed-tabs-list">
          {displayTabs.map((tab) => (
            <ClosedTabCard key={tab.id} tab={tab} onRestore={onRestore} />
          ))}
        </div>
        {tabs.length > 10 && (
          <div className="recently-closed-more">And {tabs.length - 10} more...</div>
        )}
      </div>
    </div>
  );
}

// Grouped view (Category/Domain)
interface GroupedTabsViewProps {
  openTabs: TabRecord[];
  stats: ReturnType<typeof getStats>;
  batchSize: number;
  closeSuggestedCount: number;
  state: AppState;
  actions: AppActions;
  isAnalyzing: boolean;
  isAnalyzingRules: boolean;
  isRefreshing: boolean;
  onClose: (tabId: number) => void;
  onKeep: (tabId: number) => void;
  onDisagree: (tabId: number, currentDecision: string) => void;
  onRestore: (tabId: number) => void;
  onAnalyzeRules: () => void;
  onAnalyzeBatch: () => void;
  onRefresh: () => void;
  onClearSuggestions: () => void;
  onConfirmAll: () => void;
  onCloseSelected: () => void;
  onCloseGroup: (tabIds: number[]) => void;
}

function GroupedTabsView({
  openTabs,
  stats,
  batchSize,
  closeSuggestedCount,
  state,
  actions,
  isAnalyzing,
  isAnalyzingRules,
  isRefreshing,
  onClose,
  onKeep,
  onDisagree,
  onRestore,
  onAnalyzeRules,
  onAnalyzeBatch,
  onRefresh,
  onClearSuggestions,
  onConfirmAll,
  onCloseSelected,
  onCloseGroup,
}: GroupedTabsViewProps): React.ReactElement {
  let groupsContent: React.ReactNode;

  if (state.groupMode === "category") {
    const grouped = groupTabsByCategory(openTabs);
    const nonEmptyCategories = CATEGORIES.filter((cat) => (grouped.get(cat.id)?.length || 0) > 0);

    groupsContent =
      nonEmptyCategories.length > 0 ? (
        nonEmptyCategories.map((cat) => (
          <CategoryGroup
            key={cat.id}
            category={cat.id}
            tabs={grouped.get(cat.id) || []}
            sortField={state.sortField}
            sortOrder={state.sortOrder}
            isCollapsed={actions.isGroupCollapsed(`category-${cat.id}`)}
            selectionMode={state.selectionMode}
            isTabSelected={actions.isTabSelected}
            onToggle={() => actions.toggleGroupCollapsed(`category-${cat.id}`)}
            onToggleSelect={actions.toggleTabSelection}
            onSelectGroup={() => actions.selectAllTabs((grouped.get(cat.id) || []).map((t) => t.id))}
            onCloseGroup={() => onCloseGroup((grouped.get(cat.id) || []).map((t) => t.id))}
            onClose={onClose}
            onKeep={onKeep}
            onDisagree={onDisagree}
          />
        ))
      ) : (
        <EmptyState />
      );
  } else {
    const grouped = groupTabsByDomain(openTabs);
    groupsContent =
      grouped.size > 0 ? (
        [...grouped.entries()].map(([domain, tabs]) => (
          <DomainGroup
            key={domain}
            domain={domain}
            tabs={tabs}
            sortField={state.sortField}
            sortOrder={state.sortOrder}
            isCollapsed={actions.isGroupCollapsed(`domain-${domain}`)}
            selectionMode={state.selectionMode}
            isTabSelected={actions.isTabSelected}
            onToggle={() => actions.toggleGroupCollapsed(`domain-${domain}`)}
            onToggleSelect={actions.toggleTabSelection}
            onSelectGroup={() => actions.selectAllTabs(tabs.map((t) => t.id))}
            onCloseGroup={() => onCloseGroup(tabs.map((t) => t.id))}
            onClose={onClose}
            onKeep={onKeep}
            onDisagree={onDisagree}
          />
        ))
      ) : (
        <EmptyState />
      );
  }

  return (
    <div className="view-wrapper">
      <Header
        stats={stats}
        batchSize={batchSize}
        closeSuggestedCount={closeSuggestedCount}
        selectionMode={state.selectionMode}
        selectedCount={state.selectedTabs.size}
        unanalyzed={stats.unanalyzed}
        isAnalyzing={isAnalyzing}
        isAnalyzingRules={isAnalyzingRules}
        isRefreshing={isRefreshing}
        onToggleSelection={() => actions.setSelectionMode(!state.selectionMode)}
        onConfirmAll={onConfirmAll}
        onAnalyzeRules={onAnalyzeRules}
        onAnalyzeBatch={onAnalyzeBatch}
        onRefresh={onRefresh}
        onClearSuggestions={onClearSuggestions}
      />
      {state.selectionMode && state.selectedTabs.size > 0 && (
        <BatchActionBar
          selectedCount={state.selectedTabs.size}
          onSelectAll={() => actions.selectAllTabs(openTabs.map((t) => t.id))}
          onDeselectAll={actions.deselectAllTabs}
          onCloseSelected={onCloseSelected}
          onCancel={actions.deselectAllTabs}
        />
      )}
      <div className="toolbar">
        <GroupControls groupMode={state.groupMode} onGroupModeChange={actions.setGroupMode} />
        <div className="toolbar-divider" />
        <SortControls
          sortField={state.sortField}
          sortOrder={state.sortOrder}
          onSortFieldChange={actions.setSortField}
          onToggleSortOrder={actions.toggleSortOrder}
        />
      </div>
      <div id="statusMessage" className="status-message" />
      <div className="scroll-area">
        <div className="grouped-container">{groupsContent}</div>
        <RecentlyClosedSection
          tabs={state.recentlyClosedTabs}
          isCollapsed={actions.isGroupCollapsed("recently-closed")}
          onToggle={() => actions.toggleGroupCollapsed("recently-closed")}
          onRestore={onRestore}
        />
      </div>
    </div>
  );
}

interface CategoryGroupProps {
  category: string;
  tabs: TabRecord[];
  sortField: SortField;
  sortOrder: string;
  isCollapsed: boolean;
  selectionMode: boolean;
  isTabSelected: (id: number) => boolean;
  onToggle: () => void;
  onToggleSelect: (id: number) => void;
  onSelectGroup: () => void;
  onCloseGroup: () => void;
  onClose: (id: number) => void;
  onKeep: (id: number) => void;
  onDisagree: (id: number, decision: string) => void;
}

function CategoryGroup({
  category,
  tabs,
  sortField,
  sortOrder,
  isCollapsed,
  selectionMode,
  isTabSelected,
  onToggle,
  onToggleSelect,
  onSelectGroup,
  onCloseGroup,
  onClose,
  onKeep,
  onDisagree,
}: CategoryGroupProps): React.ReactElement {
  const info = getCategoryInfo(category);
  const sortedTabs = sortTabs(tabs, sortField, sortOrder as "asc" | "desc");

  return (
    <div className={`category-group ${isCollapsed ? "collapsed" : ""}`} data-category={category}>
      <div
        className="category-header collapsible"
        style={{ "--category-color": info.color } as React.CSSProperties}
        onClick={onToggle}
      >
        <div className="category-title">
          <span className="collapse-icon">{isCollapsed ? "▶" : "▼"}</span>
          <span className="category-icon">{info.icon}</span>
          <span className="category-name">{info.label}</span>
          <span className="category-count">{tabs.length}</span>
        </div>
        <div className="category-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn-small secondary" onClick={onSelectGroup} title="Select all in group">
            Select
          </button>
          <button className="btn-small danger" onClick={onCloseGroup} title="Close all tabs in this category">
            Close All
          </button>
        </div>
      </div>
      <div className="category-tabs" style={{ display: isCollapsed ? "none" : undefined }}>
        <div className="tabs-grid">
          {sortedTabs.map((tab) => (
            <TabCard
              key={tab.id}
              tab={tab}
              isSelected={isTabSelected(tab.id)}
              selectionMode={selectionMode}
              onToggleSelect={onToggleSelect}
              onClose={onClose}
              onKeep={onKeep}
              onDisagree={onDisagree}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DomainGroupProps {
  domain: string;
  tabs: TabRecord[];
  sortField: SortField;
  sortOrder: string;
  isCollapsed: boolean;
  selectionMode: boolean;
  isTabSelected: (id: number) => boolean;
  onToggle: () => void;
  onToggleSelect: (id: number) => void;
  onSelectGroup: () => void;
  onCloseGroup: () => void;
  onClose: (id: number) => void;
  onKeep: (id: number) => void;
  onDisagree: (id: number, decision: string) => void;
}

function DomainGroup({
  domain,
  tabs,
  sortField,
  sortOrder,
  isCollapsed,
  selectionMode,
  isTabSelected,
  onToggle,
  onToggleSelect,
  onSelectGroup,
  onCloseGroup,
  onClose,
  onKeep,
  onDisagree,
}: DomainGroupProps): React.ReactElement {
  const sortedTabs = sortTabs(tabs, sortField, sortOrder as "asc" | "desc");
  const favicon = tabs[0]?.fav_icon_url;

  return (
    <div className={`domain-group ${isCollapsed ? "collapsed" : ""}`} data-domain={domain}>
      <div className="domain-header collapsible" onClick={onToggle}>
        <div className="domain-title">
          <span className="collapse-icon">{isCollapsed ? "▶" : "▼"}</span>
          {favicon ? (
            <img
              className="domain-favicon"
              src={favicon}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="domain-icon">🌐</span>
          )}
          <span className="domain-name">{domain}</span>
          <span className="domain-count">{tabs.length}</span>
        </div>
        <div className="domain-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn-small secondary" onClick={onSelectGroup} title="Select all in group">
            Select
          </button>
          <button className="btn-small danger" onClick={onCloseGroup} title="Close all tabs from this domain">
            Close All
          </button>
        </div>
      </div>
      <div className="domain-tabs" style={{ display: isCollapsed ? "none" : undefined }}>
        <div className="tabs-grid">
          {sortedTabs.map((tab) => (
            <TabCard
              key={tab.id}
              tab={tab}
              isSelected={isTabSelected(tab.id)}
              selectionMode={selectionMode}
              onToggleSelect={onToggleSelect}
              onClose={onClose}
              onKeep={onKeep}
              onDisagree={onDisagree}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
