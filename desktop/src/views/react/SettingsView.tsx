/**
 * Tabula Desktop - Settings View (React)
 */

import React, { useState, useCallback } from "react";
import type { Settings, RuleConfig, ReminderConfig, AiProvider } from "../../types";
import { AI_PROVIDER_PRESETS } from "../../types";
import * as api from "../../api";

interface SettingsViewProps {
  settings: Settings;
  theme: "dark" | "light";
  onSaveSettings: (settings: Settings) => Promise<void>;
  onThemeChange: (theme: "dark" | "light") => void;
  showStatus: (message: string, isError?: boolean) => void;
}

export function SettingsView({
  settings,
  theme,
  onSaveSettings,
  onThemeChange,
  showStatus,
}: SettingsViewProps): React.ReactElement {
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Form state
  const [aiProvider, setAiProvider] = useState<AiProvider>(settings.ai_provider || "openai");
  const [apiKey, setApiKey] = useState(settings.openai_api_key || "");
  const [baseUrl, setBaseUrl] = useState(settings.base_url || "");
  const [model, setModel] = useState(settings.model || "");
  const [userContext, setUserContext] = useState(settings.user_context || "");
  const [batchSize, setBatchSize] = useState(settings.analyze_batch_size || 30);

  // Update base_url and model when provider changes
  const handleProviderChange = useCallback((provider: AiProvider) => {
    setAiProvider(provider);
    if (provider !== "custom") {
      const preset = AI_PROVIDER_PRESETS[provider];
      setBaseUrl(preset.base_url);
      setModel(preset.default_model);
    }
  }, []);

  // Rules state
  const [rulesEnabled, setRulesEnabled] = useState(settings.rules?.enabled !== false);
  const [inactiveDays, setInactiveDays] = useState(settings.rules?.inactive_days_threshold || 30);
  const [minActiveSeconds, setMinActiveSeconds] = useState(settings.rules?.min_active_seconds || 30);
  const [duplicateThreshold, setDuplicateThreshold] = useState(
    settings.rules?.duplicate_domain_threshold || 5
  );
  const [whitelistDomains, setWhitelistDomains] = useState(
    (settings.rules?.whitelist_domains || []).join(", ")
  );
  const [blacklistDomains, setBlacklistDomains] = useState(
    (settings.rules?.blacklist_domains || []).join(", ")
  );

  // Reminders state
  const [remindersEnabled, setRemindersEnabled] = useState(settings.reminders?.enabled !== false);
  const [lunchReminder, setLunchReminder] = useState(settings.reminders?.lunch_reminder !== false);
  const [lunchTime, setLunchTime] = useState(settings.reminders?.lunch_time || "11:30");
  const [eveningReminder, setEveningReminder] = useState(
    settings.reminders?.evening_reminder !== false
  );
  const [eveningTime, setEveningTime] = useState(settings.reminders?.evening_time || "17:30");
  const [tabThresholdReminder, setTabThresholdReminder] = useState(
    settings.reminders?.tab_threshold_reminder !== false
  );
  const [tabThreshold, setTabThreshold] = useState(settings.reminders?.tab_threshold || 30);
  const [intervalReminder, setIntervalReminder] = useState(
    settings.reminders?.interval_reminder || false
  );
  const [intervalHours, setIntervalHours] = useState(settings.reminders?.interval_hours || 2);
  const [autoReport, setAutoReport] = useState(settings.reminders?.auto_report !== false);

  // Notion state
  const [notionApiKey, setNotionApiKey] = useState(settings.notion_api_key || "");
  const [notionDatabaseId, setNotionDatabaseId] = useState(settings.notion_database_id || "");

  const parseDomainsInput = (input: string): string[] =>
    input
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const rules: RuleConfig = {
        enabled: rulesEnabled,
        inactive_days_threshold: Math.max(1, Math.min(365, inactiveDays)),
        min_active_seconds: Math.max(1, Math.min(3600, minActiveSeconds)),
        duplicate_domain_threshold: Math.max(2, Math.min(50, duplicateThreshold)),
        whitelist_domains: parseDomainsInput(whitelistDomains),
        blacklist_domains: parseDomainsInput(blacklistDomains),
      };

      const reminders: ReminderConfig = {
        enabled: remindersEnabled,
        lunch_reminder: lunchReminder,
        lunch_time: lunchTime,
        evening_reminder: eveningReminder,
        evening_time: eveningTime,
        tab_threshold_reminder: tabThresholdReminder,
        tab_threshold: Math.max(5, Math.min(200, tabThreshold)),
        interval_reminder: intervalReminder,
        interval_hours: Math.max(1, Math.min(12, intervalHours)),
        auto_report: autoReport,
      };

      const newSettings: Settings = {
        openai_api_key: apiKey || undefined,
        base_url: baseUrl || undefined,
        model: model || undefined,
        ai_provider: aiProvider,
        user_context: userContext || undefined,
        analyze_batch_size: Math.max(1, Math.min(100, batchSize)),
        rules,
        reminders,
        notion_api_key: notionApiKey || undefined,
        notion_database_id: notionDatabaseId || undefined,
      };

      await onSaveSettings(newSettings);
      showStatus("Settings saved!");
    } catch (err) {
      showStatus(`Error: ${err}`, true);
    } finally {
      setIsSaving(false);
    }
  }, [
    aiProvider,
    apiKey,
    baseUrl,
    model,
    userContext,
    batchSize,
    rulesEnabled,
    inactiveDays,
    minActiveSeconds,
    duplicateThreshold,
    whitelistDomains,
    blacklistDomains,
    remindersEnabled,
    lunchReminder,
    lunchTime,
    eveningReminder,
    eveningTime,
    tabThresholdReminder,
    tabThreshold,
    intervalReminder,
    intervalHours,
    autoReport,
    notionApiKey,
    notionDatabaseId,
    onSaveSettings,
    showStatus,
  ]);

  const handleCleanup = useCallback(async () => {
    setIsCleaningUp(true);
    try {
      const count = await api.cleanupOldTabs(7);
      if (count > 0) {
        showStatus(`Cleaned up ${count} old tabs`);
      } else {
        showStatus("No old tabs to clean up");
      }
    } catch (err) {
      showStatus(`Error: ${err}`, true);
    } finally {
      setIsCleaningUp(false);
    }
  }, [showStatus]);

  const handleClearData = useCallback(async () => {
    if (!confirm("Are you sure you want to clear all data? This cannot be undone.")) return;
    try {
      await api.clearData();
      showStatus("All data cleared");
    } catch (err) {
      showStatus(`Error: ${err}`, true);
    }
  }, [showStatus]);

  return (
    <div className="view-wrapper">
      <header className="view-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Configure AI and extension settings</p>
        </div>
      </header>
      <div id="statusMessage" className="status-message" />
      <div className="scroll-area">
        <div className="settings-container">
          {/* Appearance */}
          <div className="settings-section">
            <h2>Appearance</h2>
            <div className="theme-toggle-container">
              <span className="theme-label">Theme</span>
              <div className="theme-toggle-wrapper">
                <button
                  className={`btn-theme ${theme === "dark" ? "active" : ""}`}
                  onClick={() => onThemeChange("dark")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  Dark
                </button>
                <button
                  className={`btn-theme ${theme === "light" ? "active" : ""}`}
                  onClick={() => onThemeChange("light")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  Light
                </button>
              </div>
            </div>
          </div>

          {/* AI Configuration */}
          <div className="settings-section">
            <h2>AI Configuration</h2>
            <div className="form-group">
              <label>AI Provider</label>
              <div className="provider-buttons">
                {(Object.keys(AI_PROVIDER_PRESETS) as AiProvider[]).map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    className={`btn-provider ${aiProvider === provider ? "active" : ""}`}
                    onClick={() => handleProviderChange(provider)}
                  >
                    {AI_PROVIDER_PRESETS[provider].name}
                  </button>
                ))}
              </div>
              <span className="hint">
                {aiProvider === "ollama" && "Make sure Ollama is running on localhost:11434"}
                {aiProvider === "lmstudio" && "Make sure LM Studio server is running on localhost:1234"}
                {aiProvider === "openai" && "Requires an OpenAI API key"}
                {aiProvider === "custom" && "Configure your own API endpoint below"}
              </span>
            </div>
            {AI_PROVIDER_PRESETS[aiProvider].needs_api_key && (
              <div className="form-group">
                <label htmlFor="apiKey">API Key</label>
                <input
                  type="password"
                  id="apiKey"
                  placeholder={aiProvider === "openai" ? "sk-..." : "API key (if required)"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="baseUrl">Base URL</label>
              <input
                type="text"
                id="baseUrl"
                placeholder="https://api.openai.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={aiProvider !== "custom"}
              />
              {aiProvider === "custom" && (
                <span className="hint">
                  Must be OpenAI-compatible API endpoint (e.g., /v1/chat/completions)
                </span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="model">Model</label>
              <input
                type="text"
                id="model"
                placeholder={AI_PROVIDER_PRESETS[aiProvider].default_model || "model name"}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              <span className="hint">
                {aiProvider === "ollama" && "e.g., llama3.2, mistral, codellama"}
                {aiProvider === "lmstudio" && "Use the model name from LM Studio"}
                {aiProvider === "openai" && "e.g., gpt-4o-mini, gpt-4o, gpt-3.5-turbo"}
              </span>
            </div>
            <div className="form-group">
              <label htmlFor="batchSize">Analyze Batch Size</label>
              <input
                type="number"
                id="batchSize"
                min={1}
                max={100}
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 30)}
              />
              <span className="hint">Number of tabs to analyze at once (1-100)</span>
            </div>
          </div>

          {/* Rule-Based Analysis */}
          <div className="settings-section">
            <h2>Rule-Based Analysis</h2>
            <p className="section-desc">
              Quick analysis using rules - no AI/API key required. These rules run when you click
              "Quick Rules".
            </p>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rulesEnabled}
                  onChange={(e) => setRulesEnabled(e.target.checked)}
                />
                Enable rule-based analysis
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="inactiveDays">Inactive Days Threshold</label>
              <input
                type="number"
                id="inactiveDays"
                min={1}
                max={365}
                value={inactiveDays}
                onChange={(e) => setInactiveDays(parseInt(e.target.value) || 30)}
              />
              <span className="hint">
                Suggest closing tabs inactive for more than this many days
              </span>
            </div>
            <div className="form-group">
              <label htmlFor="minActiveSeconds">Minimum Active Time (seconds)</label>
              <input
                type="number"
                id="minActiveSeconds"
                min={1}
                max={3600}
                value={minActiveSeconds}
                onChange={(e) => setMinActiveSeconds(parseInt(e.target.value) || 30)}
              />
              <span className="hint">Tabs with less active time than this may be "forgotten"</span>
            </div>
            <div className="form-group">
              <label htmlFor="duplicateThreshold">Duplicate Domain Threshold</label>
              <input
                type="number"
                id="duplicateThreshold"
                min={2}
                max={50}
                value={duplicateThreshold}
                onChange={(e) => setDuplicateThreshold(parseInt(e.target.value) || 5)}
              />
              <span className="hint">
                Warn when you have more than this many tabs from the same domain
              </span>
            </div>
            <div className="form-group">
              <label htmlFor="whitelistDomains">Whitelist Domains (always keep)</label>
              <input
                type="text"
                id="whitelistDomains"
                placeholder="github.com, docs.google.com"
                value={whitelistDomains}
                onChange={(e) => setWhitelistDomains(e.target.value)}
              />
              <span className="hint">Comma-separated list of domains to always keep</span>
            </div>
            <div className="form-group">
              <label htmlFor="blacklistDomains">Blacklist Domains (always close)</label>
              <input
                type="text"
                id="blacklistDomains"
                placeholder="facebook.com, twitter.com"
                value={blacklistDomains}
                onChange={(e) => setBlacklistDomains(e.target.value)}
              />
              <span className="hint">Comma-separated list of domains to always suggest closing</span>
            </div>
          </div>

          {/* Smart Reminders */}
          <div className="settings-section">
            <h2>Smart Reminders</h2>
            <p className="section-desc">
              Get proactive notifications to help you manage your tabs throughout the day.
            </p>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                />
                Enable smart reminders
              </label>
            </div>
            <div className="form-row">
              <div className="form-group half">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={lunchReminder}
                    onChange={(e) => setLunchReminder(e.target.checked)}
                  />
                  Lunch break reminder
                </label>
                <input
                  type="time"
                  value={lunchTime}
                  onChange={(e) => setLunchTime(e.target.value)}
                />
              </div>
              <div className="form-group half">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={eveningReminder}
                    onChange={(e) => setEveningReminder(e.target.checked)}
                  />
                  End of day reminder
                </label>
                <input
                  type="time"
                  value={eveningTime}
                  onChange={(e) => setEveningTime(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group half">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={tabThresholdReminder}
                    onChange={(e) => setTabThresholdReminder(e.target.checked)}
                  />
                  Tab count threshold
                </label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={tabThreshold}
                  onChange={(e) => setTabThreshold(parseInt(e.target.value) || 30)}
                />
                <span className="hint">Alert when tabs exceed this count</span>
              </div>
              <div className="form-group half">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={intervalReminder}
                    onChange={(e) => setIntervalReminder(e.target.checked)}
                  />
                  Periodic check-in
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(parseInt(e.target.value) || 2)}
                />
                <span className="hint">Hours between reminders</span>
              </div>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoReport}
                  onChange={(e) => setAutoReport(e.target.checked)}
                />
                Auto-generate daily report at end of day
              </label>
              <span className="hint">
                Automatically generate your daily browsing summary at the evening time set above
              </span>
            </div>
          </div>

          {/* Notion Integration */}
          <div className="settings-section">
            <h2>Notion Integration</h2>
            <p className="section-desc">
              Export your daily reports to a Notion database. Create an internal integration at{" "}
              <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer">
                notion.so/my-integrations
              </a>{" "}
              and share a database with it.
            </p>
            <div className="form-group">
              <label htmlFor="notionApiKey">Notion Integration Secret</label>
              <input
                type="password"
                id="notionApiKey"
                placeholder="secret_..."
                value={notionApiKey}
                onChange={(e) => setNotionApiKey(e.target.value)}
              />
              <span className="hint">
                Found in your integration settings under "Internal Integration Token"
              </span>
            </div>
            <div className="form-group">
              <label htmlFor="notionDatabaseId">Database ID</label>
              <input
                type="text"
                id="notionDatabaseId"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={notionDatabaseId}
                onChange={(e) => setNotionDatabaseId(e.target.value)}
              />
              <span className="hint">
                Copy from the database URL: notion.so/[workspace]/[database_id]?v=...
                <br />
                Database must have "Name" (title) and "Date" (date) properties.
              </span>
            </div>
          </div>

          {/* User Context */}
          <div className="settings-section">
            <h2>Your Context & Goals</h2>
            <p className="section-desc">
              Tell the AI about your work, projects, and preferences. This helps it make better
              decisions about which tabs to keep or close.
            </p>
            <div className="form-group">
              <label htmlFor="userContext">Work Context & Preferences</label>
              <textarea
                id="userContext"
                rows={6}
                placeholder={`Example:
I'm a software developer working on a React project.
Keep tabs related to: React, TypeScript, Node.js documentation
Close tabs: social media, news sites idle for >30min
Important projects: tabula, my-portfolio`}
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save All Settings"}
          </button>

          {/* How It Works */}
          <div className="settings-section info-section">
            <h2>How It Works</h2>
            <div className="info-item">
              <strong>✓ Keep Button</strong>
              <p>
                Marks the tab as "keep" so AI won't suggest closing it. The tab stays open and is
                preserved for reference.
              </p>
            </div>
            <div className="info-item">
              <strong>✕ Close Button</strong>
              <p>
                Removes the tab from the list and closes it in Chrome (if extension is connected).
              </p>
            </div>
            <div className="info-item">
              <strong>Analyze Next 30</strong>
              <p>
                Only analyzes tabs that haven't been analyzed yet. Previously analyzed tabs keep
                their suggestions.
              </p>
            </div>
            <div className="info-item">
              <strong>Reset</strong>
              <p>Clears all AI suggestions so you can re-analyze all tabs fresh.</p>
            </div>
          </div>

          {/* Storage Management */}
          <div className="settings-section">
            <h2>Storage Management</h2>
            <p>Clean up old closed tab records to reduce memory usage.</p>
            <div className="storage-actions">
              <button
                className="btn secondary"
                onClick={handleCleanup}
                disabled={isCleaningUp}
              >
                {isCleaningUp ? "Cleaning up..." : "Clean Up Tabs Older Than 7 Days"}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-section danger-zone">
            <h2>Danger Zone</h2>
            <p>Clear all stored tab data and screenshots.</p>
            <button className="btn danger" onClick={handleClearData}>
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
