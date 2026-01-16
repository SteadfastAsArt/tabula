/**
 * Tab Cleanser Desktop - Report View
 */

import type { DailyReport } from "../types";
import { formatReportContent } from "../utils";

export function renderReportView(report: DailyReport | null): string {
  return `
    <div class="view-wrapper">
      <header class="view-header">
        <div>
          <h1>Daily Report</h1>
          <p class="subtitle">AI-generated summary of your browsing activity</p>
        </div>
        <div class="actions">
          <button id="generateReportBtn" class="btn primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 1 0 10 10"/>
              <path d="M12 12l4-4"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            Generate Report
          </button>
        </div>
      </header>
      <div id="statusMessage" class="status-message"></div>
      <div class="scroll-area">
        <div class="report-container">
          ${
            report
              ? `
            <div class="report-header">
              <span class="report-date">${report.date}</span>
              <span class="report-time">Generated at ${new Date(report.generated_at).toLocaleTimeString()}</span>
            </div>
            <div class="report-content">${formatReportContent(report.content)}</div>
          `
              : `
            <div class="empty-state">
              <p>No report generated yet.</p>
              <p>Click "Generate Report" to create a summary of today's browsing activity.</p>
            </div>
          `
          }
        </div>
      </div>
    </div>
  `;
}
