use base64::Engine;
use chrono::{Local, TimeZone};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

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
    pub digest: Option<String>,  // AI-generated brief summary of the tab content
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyReport {
    pub date: String,
    pub content: String,
    pub generated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub openai_api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub user_context: Option<String>,  // User's work habits, goals, preferences
    pub analyze_batch_size: Option<u32>,  // Number of tabs to analyze at once (default: 30)
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            openai_api_key: None,
            base_url: Some("https://api.openai.com/v1".to_string()),
            model: Some("gpt-4o-mini".to_string()),
            user_context: None,
            analyze_batch_size: Some(30),
        }
    }
}

pub struct Storage {
    pub tabs: HashMap<i64, TabRecord>,
    pub settings: Settings,
    pub report: Option<DailyReport>,
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
            data_dir,
            screenshots_dir,
        };

        // Load existing data
        storage.load_tabs();
        storage.load_settings();
        storage.load_report();
        
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
                    || t.last_active_at.map(|la| la >= start_of_day).unwrap_or(false)
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
        
        let tabs_to_remove: Vec<i64> = self.tabs
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
        let stale_tabs: Vec<i64> = self.tabs
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
            println!("[Storage] Synced {} stale tabs (no longer in Chrome)", count);
        }
        
        count
    }

    /// Save screenshot for a tab. Only ONE screenshot per tab ID is kept (overwrites old one).
    pub fn save_screenshot(&self, tab_id: i64, base64_data: &str) -> Result<String, Box<dyn std::error::Error>> {
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
}
