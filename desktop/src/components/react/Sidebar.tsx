/**
 * Tabula Desktop - Sidebar Component
 */

import React from "react";
import type { ViewType, TabRecord } from "../../types";
import { getStats } from "../../utils";

interface SidebarProps {
  currentView: ViewType;
  tabs: TabRecord[];
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ currentView, tabs, onViewChange }: SidebarProps): React.ReactElement {
  const stats = getStats(tabs);

  return (
    <aside className="sidebar">
      <div className="logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
        <span>Tabula</span>
      </div>
      <nav className="nav">
        <div className="nav-section-label">Views</div>
        <button
          className={`nav-item ${currentView === "tabs" ? "active" : ""}`}
          onClick={() => onViewChange("tabs")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          Open Tabs
        </button>
        <button
          className={`nav-item ${currentView === "stats" ? "active" : ""}`}
          onClick={() => onViewChange("stats")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          Stats
        </button>
        <div className="nav-section-label">Tools</div>
        <button
          className={`nav-item ${currentView === "history" ? "active" : ""}`}
          onClick={() => onViewChange("history")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          History
        </button>
        <button
          className={`nav-item ${currentView === "report" ? "active" : ""}`}
          onClick={() => onViewChange("report")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
          Report
        </button>
        <button
          className={`nav-item ${currentView === "settings" ? "active" : ""}`}
          onClick={() => onViewChange("settings")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" />
          </svg>
          Settings
        </button>
      </nav>
      <div className="sidebar-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Open Tabs</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.withScreenshots}</span>
          <span className="stat-label">Screenshots</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.analyzed}</span>
          <span className="stat-label">Analyzed</span>
        </div>
      </div>
    </aside>
  );
}
