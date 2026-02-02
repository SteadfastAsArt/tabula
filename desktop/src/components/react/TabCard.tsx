/**
 * Tabula Desktop - Tab Card Component
 */

import React, { memo } from "react";
import type { TabRecord } from "../../types";
import {
  escapeHtml,
  formatAge,
  formatDuration,
  formatTime,
  formatDateTime,
  getScreenshotUrl,
  getScreenshotFreshness,
  getCategoryLabel,
  getCategoryClass,
} from "../../utils";

interface TabCardProps {
  tab: TabRecord;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelect: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onKeep: (tabId: number) => void;
  onDisagree: (tabId: number, currentDecision: string) => void;
}

export const TabCard = memo(function TabCard({
  tab,
  isSelected,
  selectionMode,
  onToggleSelect,
  onClose,
  onKeep,
  onDisagree,
}: TabCardProps): React.ReactElement {
  const suggestion = tab.suggestion;
  const suggestionClass = suggestion ? `suggestion-${suggestion.decision}` : "";
  const hasScreenshot = !!tab.snapshot?.screenshot_path;

  const screenshotUrl = hasScreenshot
    ? getScreenshotUrl(tab.snapshot!.screenshot_path!, tab.snapshot!.captured_at)
    : "";

  const screenshotFreshness = hasScreenshot
    ? getScreenshotFreshness(tab.snapshot!.captured_at)
    : null;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(tab.id);
  };

  const handleScreenshotClick = () => {
    if (selectionMode) {
      onToggleSelect(tab.id);
    }
  };

  return (
    <div
      className={`tab-card ${suggestionClass} ${isSelected ? "selected" : ""}`}
      data-tab-id={tab.id}
    >
      {selectionMode && (
        <div className="tab-checkbox" onClick={handleCheckboxClick}>
          <input type="checkbox" checked={isSelected} readOnly tabIndex={-1} />
        </div>
      )}
      {hasScreenshot ? (
        <div className="tab-screenshot" onClick={handleScreenshotClick}>
          <img src={screenshotUrl} alt="Screenshot" loading="lazy" />
          <span
            className={`screenshot-age ${screenshotFreshness?.isStale ? "stale" : ""}`}
            title={`Screenshot captured ${screenshotFreshness?.label}`}
          >
            📷 {screenshotFreshness?.label}
          </span>
        </div>
      ) : (
        <div className="tab-screenshot placeholder" onClick={handleScreenshotClick}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span>No screenshot</span>
        </div>
      )}
      <div className="tab-info">
        <div className="tab-header">
          <div className="tab-title" title={tab.title || "Untitled"}>
            {escapeHtml(tab.title || "Untitled")}
          </div>
          {suggestion?.category && (
            <span className={`tab-category ${getCategoryClass(suggestion.category)}`}>
              {getCategoryLabel(suggestion.category)}
            </span>
          )}
        </div>
        <div className="tab-url" title={tab.url || ""}>
          {escapeHtml(tab.url || "")}
        </div>
        <div className="tab-meta">
          <span className="meta-item" title={`Tab opened ${formatDateTime(tab.created_at)}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {formatAge(tab.created_at)}
          </span>
          <span className="meta-item" title="Total active time: time spent viewing this tab">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {formatDuration(tab.total_active_ms)}
          </span>
          {tab.last_active_at && (
            <span className="meta-item" title={`Last switched away at ${formatDateTime(tab.last_active_at)}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
              {formatTime(tab.last_active_at)}
            </span>
          )}
        </div>
        {suggestion ? (
          <div className={`tab-suggestion ${suggestion.decision}`}>
            <div className="suggestion-header">
              <span className="decision">{suggestion.decision.toUpperCase()}</span>
              <button
                className="btn-disagree"
                title="I disagree with this suggestion"
                onClick={() => onDisagree(tab.id, suggestion.decision)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
              </button>
            </div>
            <span className="reason">{escapeHtml(suggestion.reason)}</span>
            {suggestion.digest && (
              <div className="tab-digest">{escapeHtml(suggestion.digest)}</div>
            )}
          </div>
        ) : (
          <div className="tab-pending">
            <span>Pending analysis</span>
          </div>
        )}
      </div>
      <div className="tab-actions">
        <button
          className="btn-icon keep"
          title="Mark as Keep - tab won't be suggested for closing"
          onClick={() => onKeep(tab.id)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </button>
        <button
          className="btn-icon close"
          title="Close this tab"
          onClick={() => onClose(tab.id)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
});
