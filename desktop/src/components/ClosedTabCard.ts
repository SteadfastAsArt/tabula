/**
 * Tabula Desktop - Closed Tab Card Component
 * Displays a closed tab with restore button
 */

import type { TabRecord } from "../types";
import { formatAge, formatDuration, extractDomain } from "../utils";

export function renderClosedTabCard(tab: TabRecord): string {
  const title = tab.title || "Untitled";
  const url = tab.url || "";
  const domain = extractDomain(url);
  const closedAt = tab.closed_at ? formatAge(tab.closed_at) : "Unknown";
  const activeTime = formatDuration(tab.total_active_ms);
  const favicon = tab.fav_icon_url;

  return `
    <div class="closed-tab-card" data-tab-id="${tab.id}">
      <div class="closed-tab-info">
        ${favicon ? `<img class="closed-tab-favicon" src="${favicon}" onerror="this.style.display='none'" />` : '<span class="closed-tab-icon">🌐</span>'}
        <div class="closed-tab-details">
          <div class="closed-tab-title" title="${title}">${title}</div>
          <div class="closed-tab-meta">
            <span class="closed-tab-domain">${domain}</span>
            <span class="closed-tab-separator">•</span>
            <span class="closed-tab-time">Closed ${closedAt}</span>
            ${tab.total_active_ms > 0 ? `<span class="closed-tab-separator">•</span><span class="closed-tab-active">${activeTime} active</span>` : ""}
          </div>
        </div>
      </div>
      <div class="closed-tab-actions">
        <button class="btn-restore" data-action="restore-tab" data-tab-id="${tab.id}" title="Restore this tab">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
          Restore
        </button>
      </div>
    </div>
  `;
}
