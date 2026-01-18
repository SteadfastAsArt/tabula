/**
 * Tabula Desktop - Stats View (Tab lifecycle statistics)
 */

import type { TabRecord } from "../types";
import { getDetailedStats, formatDuration, CATEGORIES } from "../utils";

export function renderStatsView(tabs: TabRecord[]): string {
  const stats = getDetailedStats(tabs);
  const screenshotPercent = stats.totalTabs > 0 ? Math.round((stats.withScreenshots / stats.totalTabs) * 100) : 0;
  const analyzedPercent = stats.totalTabs > 0 ? Math.round((stats.analyzed / stats.totalTabs) * 100) : 0;

  return `
    <div class="view-wrapper">
      <header class="view-header">
        <div>
          <h1>📊 Statistics</h1>
          <p class="subtitle">Tab lifecycle metrics and insights</p>
        </div>
      </header>
      <div class="scroll-area">
        <div class="stats-container">
          <!-- Hero Stats Row -->
          <div class="stats-hero">
            <div class="hero-stat primary">
              <div class="hero-stat-icon">📑</div>
              <div class="hero-stat-content">
                <div class="hero-stat-value">${stats.totalTabs}</div>
                <div class="hero-stat-label">Open Tabs</div>
              </div>
            </div>
            <div class="hero-stat accent">
              <div class="hero-stat-icon">⏱️</div>
              <div class="hero-stat-content">
                <div class="hero-stat-value">${formatDuration(stats.totalActiveTime)}</div>
                <div class="hero-stat-label">Total Active Time</div>
              </div>
            </div>
            <div class="hero-stat">
              <div class="hero-stat-icon">📈</div>
              <div class="hero-stat-content">
                <div class="hero-stat-value">${formatDuration(stats.avgActiveTime)}</div>
                <div class="hero-stat-label">Avg per Tab</div>
              </div>
            </div>
            <div class="hero-stat">
              <div class="hero-stat-icon">🕐</div>
              <div class="hero-stat-content">
                <div class="hero-stat-value">${formatDuration(stats.avgAge)}</div>
                <div class="hero-stat-label">Avg Tab Age</div>
              </div>
            </div>
          </div>

          <!-- Progress Rings Row -->
          <div class="stats-rings-row">
            <div class="ring-card">
              <div class="ring-visual">
                ${renderProgressRing(screenshotPercent, '#8b5cf6', '#3b0764')}
                <div class="ring-center">
                  <span class="ring-value">${screenshotPercent}%</span>
                </div>
              </div>
              <div class="ring-info">
                <div class="ring-title">Screenshots</div>
                <div class="ring-subtitle">${stats.withScreenshots} of ${stats.totalTabs} tabs</div>
              </div>
            </div>
            <div class="ring-card">
              <div class="ring-visual">
                ${renderProgressRing(analyzedPercent, '#22c55e', '#052e16')}
                <div class="ring-center">
                  <span class="ring-value">${analyzedPercent}%</span>
                </div>
              </div>
              <div class="ring-info">
                <div class="ring-title">Analyzed</div>
                <div class="ring-subtitle">${stats.analyzed} of ${stats.totalTabs} tabs</div>
              </div>
            </div>
            <div class="ring-card suggestion-summary">
              <div class="suggestion-bars">
                <div class="suggestion-bar-item">
                  <div class="suggestion-bar-header">
                    <span class="suggestion-dot keep"></span>
                    <span>Keep</span>
                    <span class="suggestion-count">${stats.suggestionCounts.keep}</span>
                  </div>
                  <div class="suggestion-bar-track">
                    <div class="suggestion-bar-fill keep" style="width: ${stats.analyzed > 0 ? (stats.suggestionCounts.keep / stats.analyzed) * 100 : 0}%"></div>
                  </div>
                </div>
                <div class="suggestion-bar-item">
                  <div class="suggestion-bar-header">
                    <span class="suggestion-dot close"></span>
                    <span>Close</span>
                    <span class="suggestion-count">${stats.suggestionCounts.close}</span>
                  </div>
                  <div class="suggestion-bar-track">
                    <div class="suggestion-bar-fill close" style="width: ${stats.analyzed > 0 ? (stats.suggestionCounts.close / stats.analyzed) * 100 : 0}%"></div>
                  </div>
                </div>
                <div class="suggestion-bar-item">
                  <div class="suggestion-bar-header">
                    <span class="suggestion-dot unsure"></span>
                    <span>Unsure</span>
                    <span class="suggestion-count">${stats.suggestionCounts.unsure}</span>
                  </div>
                  <div class="suggestion-bar-track">
                    <div class="suggestion-bar-fill unsure" style="width: ${stats.analyzed > 0 ? (stats.suggestionCounts.unsure / stats.analyzed) * 100 : 0}%"></div>
                  </div>
                </div>
              </div>
              <div class="ring-info">
                <div class="ring-title">AI Suggestions</div>
                <div class="ring-subtitle">${stats.analyzed} tabs analyzed</div>
              </div>
            </div>
          </div>

          <!-- Two Column Layout -->
          <div class="stats-two-col">
            <!-- Category Distribution -->
            <section class="stats-section">
              <h2>🏷️ Category Distribution</h2>
              <div class="category-chart">
                ${CATEGORIES.map((cat) => {
                  const count = stats.categoryCounts[cat.id];
                  const percent = stats.analyzed > 0 ? (count / stats.analyzed) * 100 : 0;
                  return `
                    <div class="category-row">
                      <div class="category-row-left">
                        <span class="category-emoji">${cat.icon}</span>
                        <span class="category-label">${cat.label}</span>
                      </div>
                      <div class="category-row-bar">
                        <div class="category-row-fill" style="width: ${percent}%; background: linear-gradient(90deg, ${cat.color}, ${cat.color}88)"></div>
                      </div>
                      <div class="category-row-value">${count}</div>
                    </div>
                  `;
                }).join("")}
              </div>
            </section>

            <!-- Time & Age Distribution -->
            <div class="stats-col">
              <section class="stats-section compact">
                <h2>⏰ Active Time</h2>
                <div class="mini-bars">
                  ${renderMiniBar('< 1 min', stats.activeTimeDistribution.under1m, stats.totalTabs, '#6366f1')}
                  ${renderMiniBar('1-5 min', stats.activeTimeDistribution.under5m, stats.totalTabs, '#8b5cf6')}
                  ${renderMiniBar('5-30 min', stats.activeTimeDistribution.under30m, stats.totalTabs, '#a855f7')}
                  ${renderMiniBar('> 30 min', stats.activeTimeDistribution.over30m, stats.totalTabs, '#d946ef')}
                </div>
              </section>

              <section class="stats-section compact">
                <h2>📅 Tab Age</h2>
                <div class="mini-bars">
                  ${renderMiniBar('< 1 hour', stats.ageDistribution.under1h, stats.totalTabs, '#22c55e')}
                  ${renderMiniBar('1h - 1 day', stats.ageDistribution.under1d, stats.totalTabs, '#84cc16')}
                  ${renderMiniBar('1-7 days', stats.ageDistribution.under7d, stats.totalTabs, '#eab308')}
                  ${renderMiniBar('> 7 days', stats.ageDistribution.over7d, stats.totalTabs, '#f97316')}
                </div>
              </section>
            </div>
          </div>

          <!-- Footer Stats -->
          <div class="stats-footer">
            <div class="footer-stat">
              <span class="footer-stat-label">🦕 Oldest Tab</span>
              <span class="footer-stat-value">${formatDuration(stats.oldestTab)}</span>
            </div>
            <div class="footer-divider"></div>
            <div class="footer-stat">
              <span class="footer-stat-label">🐣 Newest Tab</span>
              <span class="footer-stat-value">${formatDuration(stats.newestTab)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProgressRing(percent: number, color: string, bgColor: string): string {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percent / 100) * circumference;
  return `
    <svg class="ring-svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="${bgColor}" stroke-width="8"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 50 50)"
        style="transition: stroke-dashoffset 0.6s ease"/>
    </svg>
  `;
}

function renderMiniBar(label: string, value: number, total: number, color: string): string {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return `
    <div class="mini-bar-item">
      <div class="mini-bar-header">
        <span>${label}</span>
        <span class="mini-bar-value">${value}</span>
      </div>
      <div class="mini-bar-track">
        <div class="mini-bar-fill" style="width: ${percent}%; background: ${color}"></div>
      </div>
    </div>
  `;
}
