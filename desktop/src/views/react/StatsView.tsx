/**
 * Tabula Desktop - Stats View (React)
 */

import React from "react";
import type { TabRecord } from "../../types";
import { getDetailedStats, formatDuration, CATEGORIES } from "../../utils";

interface StatsViewProps {
  tabs: TabRecord[];
}

export function StatsView({ tabs }: StatsViewProps): React.ReactElement {
  const stats = getDetailedStats(tabs);
  const screenshotPercent =
    stats.totalTabs > 0 ? Math.round((stats.withScreenshots / stats.totalTabs) * 100) : 0;
  const analyzedPercent =
    stats.totalTabs > 0 ? Math.round((stats.analyzed / stats.totalTabs) * 100) : 0;

  return (
    <div className="view-wrapper">
      <header className="view-header">
        <div>
          <h1>📊 Statistics</h1>
          <p className="subtitle">Tab lifecycle metrics and insights</p>
        </div>
      </header>
      <div className="scroll-area">
        <div className="stats-container">
          {/* Hero Stats Row */}
          <div className="stats-hero">
            <div className="hero-stat primary">
              <div className="hero-stat-icon">📑</div>
              <div className="hero-stat-content">
                <div className="hero-stat-value">{stats.totalTabs}</div>
                <div className="hero-stat-label">Open Tabs</div>
              </div>
            </div>
            <div className="hero-stat accent">
              <div className="hero-stat-icon">⏱️</div>
              <div className="hero-stat-content">
                <div className="hero-stat-value">{formatDuration(stats.totalActiveTime)}</div>
                <div className="hero-stat-label">Total Active Time</div>
              </div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-icon">📈</div>
              <div className="hero-stat-content">
                <div className="hero-stat-value">{formatDuration(stats.avgActiveTime)}</div>
                <div className="hero-stat-label">Avg per Tab</div>
              </div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-icon">🕐</div>
              <div className="hero-stat-content">
                <div className="hero-stat-value">{formatDuration(stats.avgAge)}</div>
                <div className="hero-stat-label">Avg Tab Age</div>
              </div>
            </div>
          </div>

          {/* Progress Rings Row */}
          <div className="stats-rings-row">
            <div className="ring-card">
              <div className="ring-visual">
                <ProgressRing percent={screenshotPercent} color="#8b5cf6" bgColor="#3b0764" />
                <div className="ring-center">
                  <span className="ring-value">{screenshotPercent}%</span>
                </div>
              </div>
              <div className="ring-info">
                <div className="ring-title">Screenshots</div>
                <div className="ring-subtitle">
                  {stats.withScreenshots} of {stats.totalTabs} tabs
                </div>
              </div>
            </div>
            <div className="ring-card">
              <div className="ring-visual">
                <ProgressRing percent={analyzedPercent} color="#22c55e" bgColor="#052e16" />
                <div className="ring-center">
                  <span className="ring-value">{analyzedPercent}%</span>
                </div>
              </div>
              <div className="ring-info">
                <div className="ring-title">Analyzed</div>
                <div className="ring-subtitle">
                  {stats.analyzed} of {stats.totalTabs} tabs
                </div>
              </div>
            </div>
            <div className="ring-card suggestion-summary">
              <div className="suggestion-bars">
                <SuggestionBar
                  label="Keep"
                  count={stats.suggestionCounts.keep}
                  total={stats.analyzed}
                  type="keep"
                />
                <SuggestionBar
                  label="Close"
                  count={stats.suggestionCounts.close}
                  total={stats.analyzed}
                  type="close"
                />
                <SuggestionBar
                  label="Unsure"
                  count={stats.suggestionCounts.unsure}
                  total={stats.analyzed}
                  type="unsure"
                />
              </div>
              <div className="ring-info">
                <div className="ring-title">AI Suggestions</div>
                <div className="ring-subtitle">{stats.analyzed} tabs analyzed</div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="stats-two-col">
            {/* Category Distribution */}
            <section className="stats-section">
              <h2>🏷️ Category Distribution</h2>
              <div className="category-chart">
                {CATEGORIES.map((cat) => {
                  const count = stats.categoryCounts[cat.id];
                  const percent = stats.analyzed > 0 ? (count / stats.analyzed) * 100 : 0;
                  return (
                    <div key={cat.id} className="category-row">
                      <div className="category-row-left">
                        <span className="category-emoji">{cat.icon}</span>
                        <span className="category-label">{cat.label}</span>
                      </div>
                      <div className="category-row-bar">
                        <div
                          className="category-row-fill"
                          style={{
                            width: `${percent}%`,
                            background: `linear-gradient(90deg, ${cat.color}, ${cat.color}88)`,
                          }}
                        />
                      </div>
                      <div className="category-row-value">{count}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Time & Age Distribution */}
            <div className="stats-col">
              <section className="stats-section compact">
                <h2>⏰ Active Time</h2>
                <div className="mini-bars">
                  <MiniBar
                    label="< 1 min"
                    value={stats.activeTimeDistribution.under1m}
                    total={stats.totalTabs}
                    color="#6366f1"
                  />
                  <MiniBar
                    label="1-5 min"
                    value={stats.activeTimeDistribution.under5m}
                    total={stats.totalTabs}
                    color="#8b5cf6"
                  />
                  <MiniBar
                    label="5-30 min"
                    value={stats.activeTimeDistribution.under30m}
                    total={stats.totalTabs}
                    color="#a855f7"
                  />
                  <MiniBar
                    label="> 30 min"
                    value={stats.activeTimeDistribution.over30m}
                    total={stats.totalTabs}
                    color="#d946ef"
                  />
                </div>
              </section>

              <section className="stats-section compact">
                <h2>📅 Tab Age</h2>
                <div className="mini-bars">
                  <MiniBar
                    label="< 1 hour"
                    value={stats.ageDistribution.under1h}
                    total={stats.totalTabs}
                    color="#22c55e"
                  />
                  <MiniBar
                    label="1h - 1 day"
                    value={stats.ageDistribution.under1d}
                    total={stats.totalTabs}
                    color="#84cc16"
                  />
                  <MiniBar
                    label="1-7 days"
                    value={stats.ageDistribution.under7d}
                    total={stats.totalTabs}
                    color="#eab308"
                  />
                  <MiniBar
                    label="> 7 days"
                    value={stats.ageDistribution.over7d}
                    total={stats.totalTabs}
                    color="#f97316"
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="stats-footer">
            <div className="footer-stat">
              <span className="footer-stat-label">🦕 Oldest Tab</span>
              <span className="footer-stat-value">{formatDuration(stats.oldestTab)}</span>
            </div>
            <div className="footer-divider" />
            <div className="footer-stat">
              <span className="footer-stat-label">🐣 Newest Tab</span>
              <span className="footer-stat-value">{formatDuration(stats.newestTab)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProgressRingProps {
  percent: number;
  color: string;
  bgColor: string;
}

function ProgressRing({ percent, color, bgColor }: ProgressRingProps): React.ReactElement {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg className="ring-svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke={bgColor} strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

interface SuggestionBarProps {
  label: string;
  count: number;
  total: number;
  type: "keep" | "close" | "unsure";
}

function SuggestionBar({ label, count, total, type }: SuggestionBarProps): React.ReactElement {
  const percent = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="suggestion-bar-item">
      <div className="suggestion-bar-header">
        <span className={`suggestion-dot ${type}`} />
        <span>{label}</span>
        <span className="suggestion-count">{count}</span>
      </div>
      <div className="suggestion-bar-track">
        <div className={`suggestion-bar-fill ${type}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

interface MiniBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function MiniBar({ label, value, total, color }: MiniBarProps): React.ReactElement {
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="mini-bar-item">
      <div className="mini-bar-header">
        <span>{label}</span>
        <span className="mini-bar-value">{value}</span>
      </div>
      <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}
