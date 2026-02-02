/**
 * Tabula Desktop - Enhanced Report View (React)
 * Includes visualizations, trends, and action items
 */

import React, { useState, useCallback } from "react";
import type {
  DailyReport,
  CategoryTimeData,
  HourlyActivity,
  DomainTimeData,
  TrendData,
  ActionItem,
} from "../../types";
import { formatReportContent, formatDuration } from "../../utils";
import * as api from "../../api";

interface ReportViewProps {
  report: DailyReport | null;
  onGenerateReport: () => Promise<void>;
  showStatus: (message: string, isError?: boolean) => void;
}

function CategoryChart({ data }: { data: CategoryTimeData[] }) {
  if (!data || data.length === 0) return null;

  const maxTime = Math.max(...data.map((d) => d.time_ms));

  return (
    <div className="chart-section">
      <h3>Time by Category</h3>
      <div className="bar-chart">
        {data.map((item) => (
          <div key={item.category} className="bar-item">
            <div className="bar-label">
              <span className="category-name">{item.category}</span>
              <span className="bar-value">
                {formatDuration(item.time_ms)} ({item.tab_count} tabs)
              </span>
            </div>
            <div className="bar-track">
              <div
                className={`bar-fill category-${item.category}`}
                style={{ width: `${(item.time_ms / maxTime) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HourlyHeatmap({ data }: { data: HourlyActivity[] }) {
  if (!data || data.length === 0) return null;

  const maxTime = Math.max(...data.map((d) => d.time_ms));

  const getIntensity = (time_ms: number) => {
    if (maxTime === 0) return 0;
    return Math.min(1, time_ms / maxTime);
  };

  return (
    <div className="chart-section">
      <h3>Activity by Hour</h3>
      <div className="hourly-heatmap">
        {data.map((item) => {
          const intensity = getIntensity(item.time_ms);
          return (
            <div
              key={item.hour}
              className="hour-cell"
              style={{
                backgroundColor: `rgba(59, 130, 246, ${intensity * 0.8 + 0.1})`,
              }}
              title={`${item.hour}:00 - ${formatDuration(item.time_ms)} (${item.tab_switches} switches)`}
            >
              <span className="hour-label">{item.hour}</span>
            </div>
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span>Less active</span>
        <div className="legend-gradient" />
        <span>More active</span>
      </div>
    </div>
  );
}

function DomainChart({ data }: { data: DomainTimeData[] }) {
  if (!data || data.length === 0) return null;

  const maxTime = Math.max(...data.map((d) => d.time_ms));

  return (
    <div className="chart-section">
      <h3>Top Domains</h3>
      <div className="bar-chart">
        {data.slice(0, 5).map((item) => (
          <div key={item.domain} className="bar-item">
            <div className="bar-label">
              <span className="domain-name">{item.domain}</span>
              <span className="bar-value">
                {formatDuration(item.time_ms)} ({item.tab_count} tabs)
              </span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill domain-bar"
                style={{ width: `${(item.time_ms / maxTime) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendComparison({ trends }: { trends: TrendData }) {
  const formatChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? "+100%" : "0%";
    const change = ((today - yesterday) / yesterday) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(0)}%`;
  };

  const getTrendClass = (today: number, yesterday: number) => {
    if (today > yesterday) return "trend-up";
    if (today < yesterday) return "trend-down";
    return "trend-same";
  };

  return (
    <div className="chart-section">
      <h3>Today vs Yesterday</h3>
      <div className="trends-grid">
        <div className="trend-item">
          <div className="trend-label">Active Time</div>
          <div className="trend-values">
            <span className="trend-today">
              {formatDuration(trends.total_time_today)}
            </span>
            <span
              className={`trend-change ${getTrendClass(trends.total_time_today, trends.total_time_yesterday)}`}
            >
              {formatChange(trends.total_time_today, trends.total_time_yesterday)}
            </span>
          </div>
          <div className="trend-yesterday">
            Yesterday: {formatDuration(trends.total_time_yesterday)}
          </div>
        </div>

        <div className="trend-item">
          <div className="trend-label">Tabs Opened</div>
          <div className="trend-values">
            <span className="trend-today">{trends.tabs_opened_today}</span>
            <span
              className={`trend-change ${getTrendClass(trends.tabs_opened_today, trends.tabs_opened_yesterday)}`}
            >
              {formatChange(trends.tabs_opened_today, trends.tabs_opened_yesterday)}
            </span>
          </div>
          <div className="trend-yesterday">
            Yesterday: {trends.tabs_opened_yesterday}
          </div>
        </div>

        <div className="trend-item">
          <div className="trend-label">Tabs Closed</div>
          <div className="trend-values">
            <span className="trend-today">{trends.tabs_closed_today}</span>
            <span
              className={`trend-change ${getTrendClass(trends.tabs_closed_today, trends.tabs_closed_yesterday)}`}
            >
              {formatChange(trends.tabs_closed_today, trends.tabs_closed_yesterday)}
            </span>
          </div>
          <div className="trend-yesterday">
            Yesterday: {trends.tabs_closed_yesterday}
          </div>
        </div>

        <div className="trend-item">
          <div className="trend-label">Top Category</div>
          <div className="trend-values">
            <span className="trend-today">
              {trends.top_category_today || "N/A"}
            </span>
          </div>
          <div className="trend-yesterday">
            Yesterday: {trends.top_category_yesterday || "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionItems({ items }: { items: ActionItem[] }) {
  if (!items || items.length === 0) return null;

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "";
    }
  };

  return (
    <div className="chart-section">
      <h3>Suggested Actions</h3>
      <div className="action-items-list">
        {items.map((item, index) => (
          <div key={index} className={`action-item ${getPriorityClass(item.priority)}`}>
            <div className="action-header">
              <span className={`priority-badge ${getPriorityClass(item.priority)}`}>
                {item.priority}
              </span>
              <span className="action-text">{item.action}</span>
            </div>
            <div className="action-reason">{item.reason}</div>
            {item.related_tabs.length > 0 && (
              <div className="action-tabs">
                {item.related_tabs.length} related tab(s)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportView({
  report,
  onGenerateReport,
  showStatus,
}: ReportViewProps): React.ReactElement {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportToNotion = useCallback(async () => {
    setIsExporting(true);
    showStatus("Exporting to Notion...");
    try {
      const url = await api.exportToNotion();
      showStatus("Exported to Notion!");
      // Open the Notion page in browser
      window.open(url, "_blank");
    } catch (err) {
      showStatus(`Error: ${err}`, true);
    } finally {
      setIsExporting(false);
    }
  }, [showStatus]);

  return (
    <div className="view-wrapper">
      <header className="view-header">
        <div>
          <h1>Daily Report</h1>
          <p className="subtitle">AI-generated summary with insights and trends</p>
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
          {report && (
            <button
              className="btn secondary"
              onClick={handleExportToNotion}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <span className="spinner" />
                  Exporting...
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
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Export to Notion
                </>
              )}
            </button>
          )}
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

              {/* Visualization Section */}
              <div className="report-visualizations">
                {report.trends && <TrendComparison trends={report.trends} />}

                <div className="charts-row">
                  {report.category_time && report.category_time.length > 0 && (
                    <CategoryChart data={report.category_time} />
                  )}
                  {report.domain_time && report.domain_time.length > 0 && (
                    <DomainChart data={report.domain_time} />
                  )}
                </div>

                {report.hourly_activity && report.hourly_activity.length > 0 && (
                  <HourlyHeatmap data={report.hourly_activity} />
                )}

                {report.action_items && report.action_items.length > 0 && (
                  <ActionItems items={report.action_items} />
                )}
              </div>

              {/* AI Content Section */}
              <div className="chart-section">
                <h3>AI Summary</h3>
                <div
                  className="report-content"
                  dangerouslySetInnerHTML={{ __html: formatReportContent(report.content) }}
                />
              </div>
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
