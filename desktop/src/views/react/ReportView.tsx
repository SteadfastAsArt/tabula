/**
 * Tabula Desktop - Report View (React)
 */

import React, { useState, useCallback } from "react";
import type { DailyReport } from "../../types";
import { formatReportContent } from "../../utils";

interface ReportViewProps {
  report: DailyReport | null;
  onGenerateReport: () => Promise<void>;
  showStatus: (message: string, isError?: boolean) => void;
}

export function ReportView({
  report,
  onGenerateReport,
  showStatus,
}: ReportViewProps): React.ReactElement {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    showStatus("Generating daily report...");
    try {
      await onGenerateReport();
      showStatus("Report generated!");
    } catch (err) {
      showStatus(`Error: ${err}`, true);
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerateReport, showStatus]);

  return (
    <div className="view-wrapper">
      <header className="view-header">
        <div>
          <h1>Daily Report</h1>
          <p className="subtitle">AI-generated summary of your browsing activity</p>
        </div>
        <div className="actions">
          <button
            className="btn primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner" />
                Generating...
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
                  <path d="M12 2a10 10 0 1 0 10 10" />
                  <path d="M12 12l4-4" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                Generate Report
              </>
            )}
          </button>
        </div>
      </header>
      <div id="statusMessage" className="status-message" />
      <div className="scroll-area">
        <div className="report-container">
          {report ? (
            <>
              <div className="report-header">
                <span className="report-date">{report.date}</span>
                <span className="report-time">
                  Generated at {new Date(report.generated_at).toLocaleTimeString()}
                </span>
              </div>
              <div
                className="report-content"
                dangerouslySetInnerHTML={{ __html: formatReportContent(report.content) }}
              />
            </>
          ) : (
            <div className="empty-state">
              <p>No report generated yet.</p>
              <p>Click "Generate Report" to create a summary of today's browsing activity.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
