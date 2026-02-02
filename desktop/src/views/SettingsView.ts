/**
 * Tabula Desktop - Settings View
 */

import type { Settings } from "../types";
import { theme } from "../state";

export function renderSettingsView(settings: Settings): string {
  return `
    <div class="view-wrapper">
      <header class="view-header">
        <div>
          <h1>Settings</h1>
          <p class="subtitle">Configure AI and extension settings</p>
        </div>
      </header>
      <div id="statusMessage" class="status-message"></div>
      <div class="scroll-area">
        <div class="settings-container">
          <div class="settings-section">
            <h2>Appearance</h2>
            <div class="theme-toggle-container">
              <span class="theme-label">Theme</span>
              <div class="theme-toggle-wrapper">
                <button id="themeDarkBtn" class="btn-theme ${theme === "dark" ? "active" : ""}" data-theme-value="dark">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                  Dark
                </button>
                <button id="themeLightBtn" class="btn-theme ${theme === "light" ? "active" : ""}" data-theme-value="light">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  Light
                </button>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h2>AI Configuration</h2>
            <div class="form-group">
              <label for="apiKey">OpenAI API Key</label>
              <input type="password" id="apiKey" placeholder="sk-..." value="${settings.openai_api_key || ""}" />
            </div>
            <div class="form-group">
              <label for="baseUrl">Base URL</label>
              <input type="text" id="baseUrl" placeholder="https://api.openai.com/v1" value="${settings.base_url || ""}" />
              <span class="hint">Leave empty for default OpenAI endpoint, or use your own proxy</span>
            </div>
            <div class="form-group">
              <label for="model">Model</label>
              <input type="text" id="model" placeholder="gpt-4o-mini" value="${settings.model || ""}" />
            </div>
            <div class="form-group">
              <label for="batchSize">Analyze Batch Size</label>
              <input type="number" id="batchSize" min="1" max="100" placeholder="30" value="${settings.analyze_batch_size || 30}" />
              <span class="hint">Number of tabs to analyze at once (1-100)</span>
            </div>
          </div>

          <div class="settings-section">
            <h2>Rule-Based Analysis</h2>
            <p class="section-desc">Quick analysis using rules - no AI/API key required. These rules run when you click "Quick Rules".</p>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="rulesEnabled" ${settings.rules?.enabled !== false ? "checked" : ""} />
                Enable rule-based analysis
              </label>
            </div>
            <div class="form-group">
              <label for="inactiveDays">Inactive Days Threshold</label>
              <input type="number" id="inactiveDays" min="1" max="365" value="${settings.rules?.inactive_days_threshold || 30}" />
              <span class="hint">Suggest closing tabs inactive for more than this many days</span>
            </div>
            <div class="form-group">
              <label for="minActiveSeconds">Minimum Active Time (seconds)</label>
              <input type="number" id="minActiveSeconds" min="1" max="3600" value="${settings.rules?.min_active_seconds || 30}" />
              <span class="hint">Tabs with less active time than this may be "forgotten"</span>
            </div>
            <div class="form-group">
              <label for="duplicateDomainThreshold">Duplicate Domain Threshold</label>
              <input type="number" id="duplicateDomainThreshold" min="2" max="50" value="${settings.rules?.duplicate_domain_threshold || 5}" />
              <span class="hint">Warn when you have more than this many tabs from the same domain</span>
            </div>
            <div class="form-group">
              <label for="whitelistDomains">Whitelist Domains (always keep)</label>
              <input type="text" id="whitelistDomains" placeholder="github.com, docs.google.com" value="${(settings.rules?.whitelist_domains || []).join(", ")}" />
              <span class="hint">Comma-separated list of domains to always keep</span>
            </div>
            <div class="form-group">
              <label for="blacklistDomains">Blacklist Domains (always close)</label>
              <input type="text" id="blacklistDomains" placeholder="facebook.com, twitter.com" value="${(settings.rules?.blacklist_domains || []).join(", ")}" />
              <span class="hint">Comma-separated list of domains to always suggest closing</span>
            </div>
          </div>

          <div class="settings-section">
            <h2>Smart Reminders</h2>
            <p class="section-desc">Get proactive notifications to help you manage your tabs throughout the day.</p>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" id="remindersEnabled" ${settings.reminders?.enabled !== false ? "checked" : ""} />
                Enable smart reminders
              </label>
            </div>
            <div class="form-row">
              <div class="form-group half">
                <label class="checkbox-label">
                  <input type="checkbox" id="lunchReminder" ${settings.reminders?.lunch_reminder !== false ? "checked" : ""} />
                  Lunch break reminder
                </label>
                <input type="time" id="lunchTime" value="${settings.reminders?.lunch_time || "11:30"}" />
              </div>
              <div class="form-group half">
                <label class="checkbox-label">
                  <input type="checkbox" id="eveningReminder" ${settings.reminders?.evening_reminder !== false ? "checked" : ""} />
                  End of day reminder
                </label>
                <input type="time" id="eveningTime" value="${settings.reminders?.evening_time || "17:30"}" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group half">
                <label class="checkbox-label">
                  <input type="checkbox" id="tabThresholdReminder" ${settings.reminders?.tab_threshold_reminder !== false ? "checked" : ""} />
                  Tab count threshold
                </label>
                <input type="number" id="tabThreshold" min="5" max="200" value="${settings.reminders?.tab_threshold || 30}" />
                <span class="hint">Alert when tabs exceed this count</span>
              </div>
              <div class="form-group half">
                <label class="checkbox-label">
                  <input type="checkbox" id="intervalReminder" ${settings.reminders?.interval_reminder ? "checked" : ""} />
                  Periodic check-in
                </label>
                <input type="number" id="intervalHours" min="1" max="12" value="${settings.reminders?.interval_hours || 2}" />
                <span class="hint">Hours between reminders</span>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h2>Your Context & Goals</h2>
            <p class="section-desc">Tell the AI about your work, projects, and preferences. This helps it make better decisions about which tabs to keep or close.</p>
            <div class="form-group">
              <label for="userContext">Work Context & Preferences</label>
              <textarea id="userContext" rows="6" placeholder="Example:
I'm a software developer working on a React project.
Keep tabs related to: React, TypeScript, Node.js documentation
Close tabs: social media, news sites idle for >30min
Important projects: tabula, my-portfolio">${settings.user_context || ""}</textarea>
            </div>
          </div>

          <button id="saveSettingsBtn" class="btn primary">Save All Settings</button>

          <div class="settings-section info-section">
            <h2>How It Works</h2>
            <div class="info-item">
              <strong>✓ Keep Button</strong>
              <p>Marks the tab as "keep" so AI won't suggest closing it. The tab stays open and is preserved for reference.</p>
            </div>
            <div class="info-item">
              <strong>✕ Close Button</strong>
              <p>Removes the tab from the list and closes it in Chrome (if extension is connected).</p>
            </div>
            <div class="info-item">
              <strong>Analyze Next 30</strong>
              <p>Only analyzes tabs that haven't been analyzed yet. Previously analyzed tabs keep their suggestions.</p>
            </div>
            <div class="info-item">
              <strong>Reset</strong>
              <p>Clears all AI suggestions so you can re-analyze all tabs fresh.</p>
            </div>
          </div>

          <div class="settings-section">
            <h2>Storage Management</h2>
            <p>Clean up old closed tab records to reduce memory usage.</p>
            <div class="storage-actions">
              <button id="cleanupOldTabsBtn" class="btn secondary">Clean Up Tabs Older Than 7 Days</button>
            </div>
          </div>

          <div class="settings-section danger-zone">
            <h2>Danger Zone</h2>
            <p>Clear all stored tab data and screenshots.</p>
            <button id="clearDataBtn" class="btn danger">Clear All Data</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
