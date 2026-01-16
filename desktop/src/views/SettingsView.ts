/**
 * Tabula Desktop - Settings View
 */

import type { Settings } from "../types";

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
