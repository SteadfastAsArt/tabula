/**
 * Tabula Desktop - Tab Card Component
 */

import type { TabRecord } from "../types";
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
} from "../utils";
import { isTabSelected, selectionMode } from "../state";

export function renderTabCard(tab: TabRecord): string {
  const isSelected = isTabSelected(tab.id);
  const suggestion = tab.suggestion;
  const suggestionClass = suggestion ? `suggestion-${suggestion.decision}` : "";
  const hasScreenshot = !!tab.snapshot?.screenshot_path;

  const screenshotUrl = hasScreenshot
    ? getScreenshotUrl(tab.snapshot!.screenshot_path!, tab.snapshot!.captured_at)
    : "";

  const screenshotFreshness = hasScreenshot
    ? getScreenshotFreshness(tab.snapshot!.captured_at)
    : null;

  return `
    <div class="tab-card ${suggestionClass} ${isSelected ? "selected" : ""}" data-tab-id="${tab.id}">
      ${selectionMode ? `
        <div class="tab-checkbox" data-action="toggle-select" data-tab-id="${tab.id}">
          <input type="checkbox" ${isSelected ? "checked" : ""} tabindex="-1" />
        </div>
      ` : ""}
      ${
        hasScreenshot
          ? `
        <div class="tab-screenshot" ${selectionMode ? 'data-action="toggle-select" data-tab-id="' + tab.id + '"' : ""}>
          <img src="${screenshotUrl}" alt="Screenshot" loading="lazy" />
          <span class="screenshot-age ${screenshotFreshness?.isStale ? "stale" : ""}" title="Screenshot captured ${screenshotFreshness?.label}">
            📷 ${screenshotFreshness?.label}
          </span>
        </div>
      `
          : `
        <div class="tab-screenshot placeholder" ${selectionMode ? 'data-action="toggle-select" data-tab-id="' + tab.id + '"' : ""}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <span>No screenshot</span>
        </div>
      `
      }
      <div class="tab-info">
        <div class="tab-header">
          <div class="tab-title" title="${escapeHtml(tab.title || "Untitled")}">${escapeHtml(tab.title || "Untitled")}</div>
          ${
            suggestion?.category
              ? `<span class="tab-category ${getCategoryClass(suggestion.category)}">${getCategoryLabel(suggestion.category)}</span>`
              : ""
          }
        </div>
        <div class="tab-url" title="${escapeHtml(tab.url || "")}">${escapeHtml(tab.url || "")}</div>
        <div class="tab-meta">
          <span class="meta-item" title="Tab opened ${formatDateTime(tab.created_at)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            ${formatAge(tab.created_at)}
          </span>
          <span class="meta-item" title="Total active time: time spent viewing this tab">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            ${formatDuration(tab.total_active_ms)}
          </span>
          ${
            tab.last_active_at
              ? `
            <span class="meta-item" title="Last switched away at ${formatDateTime(tab.last_active_at)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14"/>
                <path d="M12 5l7 7-7 7"/>
              </svg>
              ${formatTime(tab.last_active_at)}
            </span>
          `
              : ""
          }
        </div>
        ${
          suggestion
            ? `
          <div class="tab-suggestion ${suggestion.decision}">
            <div class="suggestion-header">
              <span class="decision">${suggestion.decision.toUpperCase()}</span>
              <button class="btn-disagree" title="I disagree with this suggestion" data-action="disagree" data-tab-id="${tab.id}" data-current="${suggestion.decision}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                </svg>
              </button>
            </div>
            <span class="reason">${escapeHtml(suggestion.reason)}</span>
            ${suggestion.digest ? `<div class="tab-digest">${escapeHtml(suggestion.digest)}</div>` : ""}
          </div>
        `
            : `
          <div class="tab-pending">
            <span>Pending analysis</span>
          </div>
        `
        }
      </div>
      <div class="tab-actions">
        <button class="btn-icon keep" title="Mark as Keep - tab won't be suggested for closing" data-action="keep" data-tab-id="${tab.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </button>
        <button class="btn-icon close" title="Close this tab" data-action="close" data-tab-id="${tab.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}
