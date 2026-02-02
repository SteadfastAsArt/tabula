/**
 * Tabula Desktop - Closed Tab Card Component
 */

import React, { memo } from "react";
import type { TabRecord } from "../../types";
import { escapeHtml, formatAge } from "../../utils";

interface ClosedTabCardProps {
  tab: TabRecord;
  onRestore: (tabId: number) => void;
}

export const ClosedTabCard = memo(function ClosedTabCard({
  tab,
  onRestore,
}: ClosedTabCardProps): React.ReactElement {
  const closedTime = tab.closed_at ? formatAge(tab.closed_at) : "Unknown";

  return (
    <div className="closed-tab-card" data-tab-id={tab.id}>
      <div className="closed-tab-info">
        {tab.fav_icon_url && (
          <img
            className="closed-tab-favicon"
            src={tab.fav_icon_url}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="closed-tab-details">
          <div className="closed-tab-title" title={tab.title || "Untitled"}>
            {escapeHtml(tab.title || "Untitled")}
          </div>
          <div className="closed-tab-meta">
            <span className="closed-time">Closed {closedTime}</span>
            <span className="closed-url" title={tab.url || ""}>
              {escapeHtml(tab.url || "")}
            </span>
          </div>
        </div>
      </div>
      <button
        className="btn-restore"
        title="Restore this tab"
        onClick={() => onRestore(tab.id)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      </button>
    </div>
  );
});
