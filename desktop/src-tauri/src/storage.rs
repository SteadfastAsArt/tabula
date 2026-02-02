use base64::Engine;
use chrono::{Local, TimeZone};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// A single viewing session for a tab
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveSession {
    pub started_at: i64,      // When the session started
    pub ended_at: Option<i64>, // When the session ended (None if still active)
    pub duration_ms: i64,      // Duration of this session
}

/// A URL change record for a tab
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UrlHistoryEntry {
    pub url: String,
    pub title: Option<String>,
    pub visited_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabSnapshot {
    pub screenshot_path: Option<String>,
    pub captured_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabSuggestion {
    pub decision: String,
    pub reason: String,
    pub category: Option<String>,
    pub digest: Option<String>, // AI-generated brief summary of the tab content
    pub scored_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabRecord {
    pub id: i64,
    pub window_id: Option<i64>,
    pub url: Option<String>,
    pub title: Option<String>,
    pub fav_icon_url: Option<String>,
    pub created_at: i64,
    pub last_active_at: Option<i64>,
    pub total_active_ms: i64,
    pub is_active: bool,
    pub closed_at: Option<i64>,
    /// Rich description extracted from page meta/content (max 8000 words)
    pub description: Option<String>,
    pub snapshot: Option<TabSnapshot>,
    pub suggestion: Option<TabSuggestion>,
    /// Session history - each time the tab was actively viewed
    #[serde(default)]
    pub sessions: Vec<ActiveSession>,
    /// URL history - URLs visited in this tab
    #[serde(default)]
    pub url_history: Vec<UrlHistoryEntry>,
}

/// Time spent on a category for visualization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryTimeData {
    pub category: String,
    pub time_ms: i64,
    pub tab_count: u32,
}

/// Hourly activity for heatmap
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyActivity {
    pub hour: u8,          // 0-23
    pub time_ms: i64,      // Total active time in this hour
    pub tab_switches: u32, // Number of tab switches
}

/// Domain time breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainTimeData {
    pub domain: String,
    pub time_ms: i64,
    pub tab_count: u32,
}

/// Trend comparison with previous day
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendData {
    pub total_time_today: i64,
    pub total_time_yesterday: i64,
    pub tabs_opened_today: u32,
    pub tabs_opened_yesterday: u32,
    pub tabs_closed_today: u32,
    pub tabs_closed_yesterday: u32,
    pub top_category_today: Option<String>,
    pub top_category_yesterday: Option<String>,
}

/// Action item suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionItem {
    pub priority: String,      // high, medium, low
    pub action: String,        // The suggested action
    pub reason: String,        // Why this is suggested
    pub related_tabs: Vec<i64>, // Tab IDs related to this action
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyReport {
    pub date: String,
    pub content: String,
    pub generated_at: i64,
    /// Time distribution by category
    #[serde(default)]
    pub category_time: Vec<CategoryTimeData>,
    /// Hourly activity heatmap data
    #[serde(default)]
    pub hourly_activity: Vec<HourlyActivity>,
    /// Top domains by time spent
    #[serde(default)]
    pub domain_time: Vec<DomainTimeData>,
    /// Comparison with previous day
    #[serde(default)]
    pub trends: Option<TrendData>,
    /// Suggested actions
    #[serde(default)]
    pub action_items: Vec<ActionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleConfig {
    pub enabled: bool,
    pub inactive_days_threshold: u32,        // Days without activity to suggest close (default: 30)
    pub min_active_seconds: u32,             // Minimum active time to consider "used" (default: 30)
    pub duplicate_domain_threshold: u32,     // Max tabs per domain before suggesting merge (default: 5)
    pub whitelist_domains: Vec<String>,      // Never suggest closing these domains
    pub blacklist_domains: Vec<String>,      // Always suggest closing these domains
}

impl Default for RuleConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            inactive_days_threshold: 30,
            min_active_seconds: 30,
            duplicate_domain_threshold: 5,
            whitelist_domains: vec![],
            blacklist_domains: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderConfig {
    pub enabled: bool,
    pub lunch_reminder: bool,           // Remind before lunch (default: 11:30)
    pub lunch_time: String,             // HH:MM format
    pub evening_reminder: bool,         // Remind before end of day (default: 17:30)
    pub evening_time: String,           // HH:MM format
    pub tab_threshold_reminder: bool,   // Remind when tab count exceeds threshold
    pub tab_threshold: u32,             // Number of tabs to trigger reminder
    pub interval_reminder: bool,        // Periodic reminder
    pub interval_hours: u32,            // Hours between reminders
    #[serde(default = "default_true")]
    pub auto_report: bool,              // Auto-generate daily report at evening time
}

fn default_true() -> bool {
    true
}

impl Default for ReminderConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            lunch_reminder: true,
            lunch_time: "11:30".to_string(),
            evening_reminder: true,
            evening_time: "17:30".to_string(),
            tab_threshold_reminder: true,
            tab_threshold: 30,
            interval_reminder: false,
            interval_hours: 2,
            auto_report: true,
        }
    }
}

/// Record of a user's decision on a tab (for learning user preferences)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDecision {
    pub tab_id: i64,
    pub url: Option<String>,
    pub domain: Option<String>,
    pub title: Option<String>,
    pub category: Option<String>,
    pub ai_suggestion: Option<String>,     // What AI suggested (keep/close/unsure)
    pub user_decision: String,              // What user decided (keep/close)
    pub agreed_with_ai: bool,               // Did user agree with AI?
    pub active_time_ms: i64,                // How long was tab active
    pub tab_age_ms: i64,                    // How old was the tab
    pub decided_at: i64,                    // Timestamp of decision
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub openai_api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub user_context: Option<String>, // User's work habits, goals, preferences
    pub analyze_batch_size: Option<u32>, // Number of tabs to analyze at once (default: 30)
    pub rules: Option<RuleConfig>,    // Rule-based analysis configuration
    pub reminders: Option<ReminderConfig>, // Smart reminder configuration
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            openai_api_key: None,
            base_url: Some("https://api.openai.com/v1".to_string()),
            model: Some("gpt-4o-mini".to_string()),
            user_context: None,
            analyze_batch_size: Some(30),
            rules: Some(RuleConfig::default()),
            reminders: Some(ReminderConfig::default()),
        }
    }
}

pub struct Storage {
    pub tabs: HashMap<i64, TabRecord>,
    pub settings: Settings,
    pub report: Option<DailyReport>,
    pub user_decisions: Vec<UserDecision>,  // History of user decisions for learning
    data_dir: PathBuf,
    screenshots_dir: PathBuf,
}

impl Storage {
    pub fn new(app_handle: &AppHandle) -> Self {
        let data_dir = app_handle
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));

        let screenshots_dir = data_dir.join("screenshots");

        // Ensure directories exist
        fs::create_dir_all(&data_dir).ok();
        fs::create_dir_all(&screenshots_dir).ok();

        let mut storage = Self {
            tabs: HashMap::new(),
            settings: Settings::default(),
            report: None,
            user_decisions: Vec::new(),
            data_dir,
            screenshots_dir,
        };

        // Load existing data
        storage.load_tabs();
        storage.load_settings();
        storage.load_report();
        storage.load_user_decisions();

        // Clean up old screenshots (migrate from timestamp-based to simple naming)
        storage.cleanup_old_screenshots();

        storage
    }

    /// Clean up old screenshots with timestamp in filename (migrate to new naming scheme)
    fn cleanup_old_screenshots(&self) {
        if let Ok(entries) = fs::read_dir(&self.screenshots_dir) {
            for entry in entries.flatten() {
                let filename = entry.file_name().to_string_lossy().to_string();
                // Old format: {tab_id}_{timestamp}.jpg, new format: {tab_id}.jpg
                // Delete files that have underscore (old format)
                if filename.contains('_') && filename.ends_with(".jpg") {
                    println!("[Storage] Cleaning up old screenshot: {}", filename);
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
    }

    pub fn get_open_tabs(&self) -> Vec<TabRecord> {
        self.tabs
            .values()
            .filter(|t| t.closed_at.is_none())
            .cloned()
            .collect()
    }

    pub fn get_today_tabs(&self) -> Vec<TabRecord> {
        let today = Local::now().date_naive();
        let start_of_day = Local
            .from_local_datetime(&today.and_hms_opt(0, 0, 0).unwrap())
            .unwrap()
            .timestamp_millis();

        self.tabs
            .values()
            .filter(|t| {
                t.created_at >= start_of_day
                    || t.last_active_at
                        .map(|la| la >= start_of_day)
                        .unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    /// Get today's closed tabs (for history view)
    pub fn get_today_closed_tabs(&self) -> Vec<TabRecord> {
        let today = Local::now().date_naive();
        let start_of_day = Local
            .from_local_datetime(&today.and_hms_opt(0, 0, 0).unwrap())
            .unwrap()
            .timestamp_millis();

        self.tabs
            .values()
            .filter(|t| {
                // Must be closed
                t.closed_at.is_some() &&
                // And was active today (closed today or was active today)
                (t.closed_at.map(|c| c >= start_of_day).unwrap_or(false)
                    || t.last_active_at.map(|la| la >= start_of_day).unwrap_or(false)
                    || t.created_at >= start_of_day)
            })
            .cloned()
            .collect()
    }

    /// Get recently closed tabs (sorted by closed_at, most recent first)
    /// limit: maximum number of tabs to return
    pub fn get_recently_closed_tabs(&self, limit: usize) -> Vec<TabRecord> {
        let mut closed_tabs: Vec<TabRecord> = self
            .tabs
            .values()
            .filter(|t| t.closed_at.is_some() && t.url.is_some())
            .cloned()
            .collect();

        // Sort by closed_at descending (most recent first)
        closed_tabs.sort_by(|a, b| {
            let a_time = a.closed_at.unwrap_or(0);
            let b_time = b.closed_at.unwrap_or(0);
            b_time.cmp(&a_time)
        });

        closed_tabs.truncate(limit);
        closed_tabs
    }

    /// Restore a closed tab (mark it as open again)
    /// This is called after the extension successfully opens the URL
    pub fn mark_tab_restored(&mut self, tab_id: i64) {
        if let Some(tab) = self.tabs.get_mut(&tab_id) {
            tab.closed_at = None;
            tab.is_active = false; // Will be updated when extension reports activation
        }
    }

    pub fn close_tab(&mut self, tab_id: i64) {
        if let Some(tab) = self.tabs.get_mut(&tab_id) {
            tab.closed_at = Some(chrono::Utc::now().timestamp_millis());
            tab.is_active = false;
        }
    }

    pub fn update_suggestion(&mut self, tab_id: i64, suggestion: TabSuggestion) {
        if let Some(tab) = self.tabs.get_mut(&tab_id) {
            tab.suggestion = Some(suggestion);
        }
    }

    pub fn clear(&mut self) {
        self.tabs.clear();
        self.report = None;
        // Clean up screenshots
        if let Ok(entries) = fs::read_dir(&self.screenshots_dir) {
            for entry in entries.flatten() {
                fs::remove_file(entry.path()).ok();
            }
        }
    }

    /// Clean up old closed tabs (older than specified days)
    /// Returns the number of tabs cleaned up
    pub fn cleanup_old_tabs(&mut self, days_old: i64) -> usize {
        let cutoff = chrono::Utc::now().timestamp_millis() - (days_old * 24 * 60 * 60 * 1000);

        let tabs_to_remove: Vec<i64> = self
            .tabs
            .iter()
            .filter(|(_, tab)| {
                // Only remove closed tabs that are old
                if let Some(closed_at) = tab.closed_at {
                    closed_at < cutoff
                } else {
                    false
                }
            })
            .map(|(id, _)| *id)
            .collect();

        let count = tabs_to_remove.len();

        for tab_id in &tabs_to_remove {
            // Delete screenshot
            self.delete_screenshot(*tab_id);
            // Remove from tabs
            self.tabs.remove(tab_id);
        }

        if count > 0 {
            println!("[Storage] Cleaned up {} old closed tabs", count);
        }

        count
    }

    /// Get memory usage stats
    pub fn get_stats(&self) -> (usize, usize, usize) {
        let total_tabs = self.tabs.len();
        let open_tabs = self.tabs.values().filter(|t| t.closed_at.is_none()).count();
        let closed_tabs = total_tabs - open_tabs;
        (total_tabs, open_tabs, closed_tabs)
    }

    /// Sync with actual Chrome tabs - remove tabs that no longer exist in Chrome
    /// Takes a list of currently open tab IDs from Chrome
    pub fn sync_with_chrome_tabs(&mut self, chrome_tab_ids: &[i64]) -> usize {
        let chrome_set: std::collections::HashSet<i64> = chrome_tab_ids.iter().cloned().collect();

        // Find open tabs in storage that are NOT in Chrome anymore
        let stale_tabs: Vec<i64> = self
            .tabs
            .iter()
            .filter(|(_, tab)| {
                // Only check tabs that are still "open" in storage
                tab.closed_at.is_none() && !chrome_set.contains(&tab.id)
            })
            .map(|(id, _)| *id)
            .collect();

        let count = stale_tabs.len();

        // Mark them as closed (or remove if they have no useful data)
        let now = chrono::Utc::now().timestamp_millis();
        for tab_id in &stale_tabs {
            if let Some(tab) = self.tabs.get_mut(tab_id) {
                // If tab has no snapshot or suggestion, just remove it
                if tab.snapshot.is_none() && tab.suggestion.is_none() {
                    self.tabs.remove(tab_id);
                    self.delete_screenshot(*tab_id);
                } else {
                    // Otherwise mark as closed
                    tab.closed_at = Some(now);
                    tab.is_active = false;
                }
            }
        }

        if count > 0 {
            println!(
                "[Storage] Synced {} stale tabs (no longer in Chrome)",
                count
            );
        }

        count
    }

    /// Save screenshot for a tab. Only ONE screenshot per tab ID is kept (overwrites old one).
    pub fn save_screenshot(
        &self,
        tab_id: i64,
        base64_data: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let bytes = base64::engine::general_purpose::STANDARD.decode(base64_data)?;

        // Use fixed filename per tab ID (will overwrite old screenshot)
        let filename = format!("{}.jpg", tab_id);
        let path = self.screenshots_dir.join(&filename);

        // Delete old screenshot if exists (no-op if not exists)
        let _ = fs::remove_file(&path);

        // Write new screenshot
        let mut file = fs::File::create(&path)?;
        file.write_all(&bytes)?;

        Ok(path.to_string_lossy().to_string())
    }

    /// Delete screenshot for a tab (called when tab is closed)
    pub fn delete_screenshot(&self, tab_id: i64) {
        let filename = format!("{}.jpg", tab_id);
        let path = self.screenshots_dir.join(&filename);
        let _ = fs::remove_file(&path);
    }

    // Persistence methods
    fn tabs_path(&self) -> PathBuf {
        self.data_dir.join("tabs.json")
    }

    fn settings_path(&self) -> PathBuf {
        self.data_dir.join("settings.json")
    }

    fn report_path(&self) -> PathBuf {
        self.data_dir.join("report.json")
    }

    pub fn save_tabs(&self) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(&self.tabs)?;
        fs::write(self.tabs_path(), json)?;
        Ok(())
    }

    fn load_tabs(&mut self) {
        if let Ok(data) = fs::read_to_string(self.tabs_path()) {
            if let Ok(tabs) = serde_json::from_str(&data) {
                self.tabs = tabs;
            }
        }
    }

    pub fn save_settings(&self) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(&self.settings)?;
        fs::write(self.settings_path(), json)?;
        Ok(())
    }

    fn load_settings(&mut self) {
        if let Ok(data) = fs::read_to_string(self.settings_path()) {
            if let Ok(settings) = serde_json::from_str(&data) {
                self.settings = settings;
            }
        }
    }

    pub fn save_report(&self) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(&self.report)?;
        fs::write(self.report_path(), json)?;
        Ok(())
    }

    fn load_report(&mut self) {
        if let Ok(data) = fs::read_to_string(self.report_path()) {
            if let Ok(report) = serde_json::from_str(&data) {
                self.report = report;
            }
        }
    }

    fn user_decisions_path(&self) -> PathBuf {
        self.data_dir.join("user_decisions.json")
    }

    pub fn save_user_decisions(&self) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(&self.user_decisions)?;
        fs::write(self.user_decisions_path(), json)?;
        Ok(())
    }

    fn load_user_decisions(&mut self) {
        if let Ok(data) = fs::read_to_string(self.user_decisions_path()) {
            if let Ok(decisions) = serde_json::from_str(&data) {
                self.user_decisions = decisions;
            }
        }
    }

    /// Record a user decision for learning preferences
    pub fn record_user_decision(&mut self, tab_id: i64, user_decision: &str) {
        if let Some(tab) = self.tabs.get(&tab_id) {
            let ai_suggestion = tab.suggestion.as_ref().map(|s| s.decision.clone());
            let category = tab.suggestion.as_ref().and_then(|s| s.category.clone());
            let agreed = ai_suggestion.as_ref().map(|s| s == user_decision).unwrap_or(false);

            let domain = tab.url.as_ref().and_then(|u| {
                url::Url::parse(u).ok().map(|parsed| {
                    parsed.host_str().unwrap_or("unknown").replace("www.", "")
                })
            });

            let now = chrono::Utc::now().timestamp_millis();
            let tab_age = now - tab.created_at;

            let decision = UserDecision {
                tab_id,
                url: tab.url.clone(),
                domain,
                title: tab.title.clone(),
                category,
                ai_suggestion,
                user_decision: user_decision.to_string(),
                agreed_with_ai: agreed,
                active_time_ms: tab.total_active_ms,
                tab_age_ms: tab_age,
                decided_at: now,
            };

            self.user_decisions.push(decision);

            // Keep only last 1000 decisions to avoid unbounded growth
            if self.user_decisions.len() > 1000 {
                self.user_decisions = self.user_decisions.split_off(self.user_decisions.len() - 1000);
            }
        }
    }

    /// Get user decision patterns for AI prompt optimization
    pub fn get_decision_patterns(&self) -> DecisionPatterns {
        let mut patterns = DecisionPatterns::default();

        if self.user_decisions.is_empty() {
            return patterns;
        }

        // Calculate agreement rate
        let total = self.user_decisions.len();
        let agreed = self.user_decisions.iter().filter(|d| d.agreed_with_ai).count();
        patterns.ai_agreement_rate = (agreed as f32 / total as f32) * 100.0;

        // Find domains user tends to keep
        let mut domain_keep_count: HashMap<String, u32> = HashMap::new();
        let mut domain_close_count: HashMap<String, u32> = HashMap::new();

        for d in &self.user_decisions {
            if let Some(domain) = &d.domain {
                if d.user_decision == "keep" {
                    *domain_keep_count.entry(domain.clone()).or_insert(0) += 1;
                } else {
                    *domain_close_count.entry(domain.clone()).or_insert(0) += 1;
                }
            }
        }

        // Domains kept 3+ times more than closed
        patterns.preferred_domains = domain_keep_count
            .iter()
            .filter(|(domain, keep_count)| {
                let close_count = domain_close_count.get(*domain).unwrap_or(&0);
                **keep_count >= 3 && **keep_count > *close_count * 2
            })
            .map(|(domain, _)| domain.clone())
            .collect();

        // Domains closed 3+ times more than kept
        patterns.avoided_domains = domain_close_count
            .iter()
            .filter(|(domain, close_count)| {
                let keep_count = domain_keep_count.get(*domain).unwrap_or(&0);
                **close_count >= 3 && **close_count > *keep_count * 2
            })
            .map(|(domain, _)| domain.clone())
            .collect();

        // Calculate average active time for kept vs closed tabs
        let kept_tabs: Vec<_> = self.user_decisions.iter().filter(|d| d.user_decision == "keep").collect();
        let closed_tabs: Vec<_> = self.user_decisions.iter().filter(|d| d.user_decision == "close").collect();

        if !kept_tabs.is_empty() {
            patterns.avg_kept_active_time_ms = kept_tabs.iter().map(|d| d.active_time_ms).sum::<i64>() / kept_tabs.len() as i64;
        }

        if !closed_tabs.is_empty() {
            patterns.avg_closed_active_time_ms = closed_tabs.iter().map(|d| d.active_time_ms).sum::<i64>() / closed_tabs.len() as i64;
        }

        patterns.total_decisions = total;

        patterns
    }
}

/// Patterns learned from user decisions
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DecisionPatterns {
    pub total_decisions: usize,
    pub ai_agreement_rate: f32,
    pub preferred_domains: Vec<String>,
    pub avoided_domains: Vec<String>,
    pub avg_kept_active_time_ms: i64,
    pub avg_closed_active_time_ms: i64,
}
