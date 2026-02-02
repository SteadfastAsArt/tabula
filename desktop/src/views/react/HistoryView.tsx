/**
 * Tabula Desktop - History View (React)
 */

import React, { useState, useMemo, useCallback } from "react";
import type { TabRecord } from "../../types";
import { escapeHtml, formatDuration, formatDateTime, getCategoryLabel } from "../../utils";

interface HistoryViewProps {
  closedTabs: TabRecord[];
  loadClosedTabs: () => Promise<void>;
  showStatus: (message: string, isError?: boolean) => void;
}

export function HistoryView({
  closedTabs,
  loadClosedTabs,
  showStatus,
}: HistoryViewProps): React.ReactElement {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sortedClosedTabs = useMemo(() => {
    return [...closedTabs].sort((a, b) => {
      const aTime = a.closed_at || 0;
      const bTime = b.closed_at || 0;
      return bTime - aTime;
    });
  }, [closedTabs]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadClosedTabs();
      showStatus("History refreshed!");
    } catch (err) {
      showStatus(`Error: ${err}`, true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadClosedTabs, showStatus]);

  return (
    <div className="view-wrapper">
      <header className="view-header">
        <div>
          <h1>Today's History</h1>
          <p className="subtitle">
            {closedTabs.length} tabs closed today - used for daily report
          </p>
        </div>
        <div className="actions">
          <button
            className="btn secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <span className="spinner" />
                Refreshing...
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </header>
      <div id="statusMessage" className="status-message" />
      <div className="scroll-area">
        <div className="history-list">
          {sortedClosedTabs.length === 0 ? (
            <div className="empty-state">
              <p>No tabs closed today yet.</p>
              <p>Closed tabs will appear here and be used for your daily report.</p>
            </div>
          ) : (
            sortedClosedTabs.map((tab) => <HistoryItem key={tab.id} tab={tab} />)
          )}
        </div>
      </div>
    </div>
  );
}

interface HistoryItemProps {
  tab: TabRecord;
}

function HistoryItem({ tab }: HistoryItemProps): React.ReactElement {
  const closedTime = tab.closed_at ? formatDateTime(tab.closed_at) : "Unknown";
  const activeTime = formatDuration(tab.total_active_ms);
  const category = tab.suggestion?.category
    ? getCategoryLabel(tab.suggestion.category)
    : "";

  return (
    <div className="history-item">
      <div className="history-item-main">
        <div className="history-item-title" title={tab.title || "Untitled"}>
          {escapeHtml(tab.title || "Untitled")}
        </div>
        <div className="history-item-url" title={tab.url || ""}>
          {escapeHtml(tab.url || "")}
        </div>
      </div>
      <div className="history-item-meta">
        {category && <span className="history-category">{category}</span>}
        <span className="history-stat" title="Time spent on this tab">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {activeTime}
        </span>
        <span className="history-stat" title={`Closed at ${closedTime}`}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          {closedTime}
        </span>
      </div>
    </div>
  );
}
