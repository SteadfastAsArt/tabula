/**
 * Tabula Desktop - Stats View (Tab lifecycle statistics)
 */

import type { TabRecord } from "../types";
import { getDetailedStats, formatDuration, CATEGORIES } from "../utils";

export function renderStatsView(tabs: TabRecord[]): string {
  const stats = getDetailedStats(tabs);

  return `
    <div class="view-wrapper">
      <header class="view-header">
        <div>
          <h1>Statistics</h1>
          <p class="subtitle">Tab lifecycle metrics and insights</p>
        </div>
      </header>
      <div class="scroll-area">
        <div class="stats-container">
          <!-- Overview Section -->
          <section class="stats-section">
            <h2>Overview</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-card-value">${stats.totalTabs}</div>
                <div class="stat-card-label">Total Open Tabs</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value">${formatDuration(stats.totalActiveTime)}</div>
                <div class="stat-card-label">Total Active Time</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value">${formatDuration(stats.avgActiveTime)}</div>
                <div class="stat-card-label">Avg Active Time</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value">${formatDuration(stats.avgAge)}</div>
                <div class="stat-card-label">Avg Tab Age</div>
              </div>
            </div>
          </section>

          <!-- Tab Status Section -->
          <section class="stats-section">
            <h2>Tab Status</h2>
            <div class="stats-grid cols-3">
              <div class="stat-card">
                <div class="stat-card-value">${stats.withScreenshots}</div>
                <div class="stat-card-label">With Screenshots</div>
                <div class="stat-card-percent">${stats.totalTabs > 0 ? Math.round((stats.withScreenshots / stats.totalTabs) * 100) : 0}%</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value">${stats.analyzed}</div>
                <div class="stat-card-label">Analyzed</div>
                <div class="stat-card-percent">${stats.totalTabs > 0 ? Math.round((stats.analyzed / stats.totalTabs) * 100) : 0}%</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value">${stats.totalTabs - stats.analyzed}</div>
                <div class="stat-card-label">Pending Analysis</div>
                <div class="stat-card-percent">${stats.totalTabs > 0 ? Math.round(((stats.totalTabs - stats.analyzed) / stats.totalTabs) * 100) : 0}%</div>
              </div>
            </div>
          </section>

          <!-- AI Suggestions Section -->
          <section class="stats-section">
            <h2>AI Suggestions</h2>
            <div class="stats-grid cols-3">
              <div class="stat-card suggestion-keep">
                <div class="stat-card-value">${stats.suggestionCounts.keep}</div>
                <div class="stat-card-label">Keep</div>
                ${renderProgressBar(stats.suggestionCounts.keep, stats.analyzed, 'keep')}
              </div>
              <div class="stat-card suggestion-close">
                <div class="stat-card-value">${stats.suggestionCounts.close}</div>
                <div class="stat-card-label">Close</div>
                ${renderProgressBar(stats.suggestionCounts.close, stats.analyzed, 'close')}
              </div>
              <div class="stat-card suggestion-unsure">
                <div class="stat-card-value">${stats.suggestionCounts.unsure}</div>
                <div class="stat-card-label">Unsure</div>
                ${renderProgressBar(stats.suggestionCounts.unsure, stats.analyzed, 'unsure')}
              </div>
            </div>
          </section>

          <!-- Category Distribution Section -->
          <section class="stats-section">
            <h2>Category Distribution</h2>
            <div class="category-bars">
              ${CATEGORIES.map((cat) => {
                const count = stats.categoryCounts[cat.id];
                const percent = stats.analyzed > 0 ? (count / stats.analyzed) * 100 : 0;
                return `
                  <div class="category-bar-item">
                    <div class="category-bar-label">
                      <span class="category-icon">${cat.icon}</span>
                      <span>${cat.label}</span>
                      <span class="category-bar-count">${count}</span>
                    </div>
                    <div class="category-bar-track">
                      <div class="category-bar-fill" style="width: ${percent}%; background: ${cat.color}"></div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </section>

          <!-- Active Time Distribution Section -->
          <section class="stats-section">
            <h2>Active Time Distribution</h2>
            <div class="distribution-chart">
              ${renderDistributionBar('< 1 min', stats.activeTimeDistribution.under1m, stats.totalTabs, '#6366f1')}
              ${renderDistributionBar('1-5 min', stats.activeTimeDistribution.under5m, stats.totalTabs, '#8b5cf6')}
              ${renderDistributionBar('5-30 min', stats.activeTimeDistribution.under30m, stats.totalTabs, '#a855f7')}
              ${renderDistributionBar('> 30 min', stats.activeTimeDistribution.over30m, stats.totalTabs, '#d946ef')}
            </div>
          </section>

          <!-- Tab Age Distribution Section -->
          <section class="stats-section">
            <h2>Tab Age Distribution</h2>
            <div class="distribution-chart">
              ${renderDistributionBar('< 1 hour', stats.ageDistribution.under1h, stats.totalTabs, '#22c55e')}
              ${renderDistributionBar('1h - 1 day', stats.ageDistribution.under1d, stats.totalTabs, '#84cc16')}
              ${renderDistributionBar('1-7 days', stats.ageDistribution.under7d, stats.totalTabs, '#eab308')}
              ${renderDistributionBar('> 7 days', stats.ageDistribution.over7d, stats.totalTabs, '#f97316')}
            </div>
          </section>

          <!-- Tab Lifespan Section -->
          <section class="stats-section">
            <h2>Tab Lifespan</h2>
            <div class="stats-grid cols-2">
              <div class="stat-card">
                <div class="stat-card-value">${formatDuration(stats.oldestTab)}</div>
                <div class="stat-card-label">Oldest Tab Age</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-value">${formatDuration(stats.newestTab)}</div>
                <div class="stat-card-label">Newest Tab Age</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderProgressBar(value: number, total: number, type: string): string {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return `
    <div class="progress-bar">
      <div class="progress-bar-fill progress-${type}" style="width: ${percent}%"></div>
    </div>
  `;
}

function renderDistributionBar(label: string, value: number, total: number, color: string): string {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return `
    <div class="distribution-item">
      <div class="distribution-label">
        <span>${label}</span>
        <span class="distribution-value">${value} (${Math.round(percent)}%)</span>
      </div>
      <div class="distribution-bar-track">
        <div class="distribution-bar-fill" style="width: ${percent}%; background: ${color}"></div>
      </div>
    </div>
  `;
}
