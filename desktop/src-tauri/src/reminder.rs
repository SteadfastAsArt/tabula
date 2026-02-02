/**
 * Tabula - Smart Reminder System
 *
 * Provides proactive reminders to help users manage their tabs:
 * - Time-based: Before lunch, before end of day
 * - Threshold-based: When tab count exceeds limit
 * - Interval-based: Periodic reminders
 * - Auto report generation at end of day
 */

use chrono::{Local, NaiveTime, Timelike};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;
use tokio::time::{interval, Duration};

use crate::ai;
use crate::report;
use crate::storage::ReminderConfig;
use crate::AppState;

// Track last reminder times to avoid duplicate notifications
static LAST_LUNCH_REMINDER: AtomicU64 = AtomicU64::new(0);
static LAST_EVENING_REMINDER: AtomicU64 = AtomicU64::new(0);
static LAST_THRESHOLD_REMINDER: AtomicU64 = AtomicU64::new(0);
static LAST_INTERVAL_REMINDER: AtomicU64 = AtomicU64::new(0);
static LAST_AUTO_REPORT: AtomicU64 = AtomicU64::new(0);

// Minimum time between same type of reminders (in seconds)
const REMINDER_COOLDOWN_SECS: u64 = 3600; // 1 hour

fn parse_time(time_str: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(time_str, "%H:%M").ok()
}

fn should_remind(last_reminder: &AtomicU64) -> bool {
    let now = Local::now().timestamp() as u64;
    let last = last_reminder.load(Ordering::Relaxed);
    now - last > REMINDER_COOLDOWN_SECS
}

fn mark_reminded(last_reminder: &AtomicU64) {
    let now = Local::now().timestamp() as u64;
    last_reminder.store(now, Ordering::Relaxed);
}

async fn send_notification(app_handle: &AppHandle, title: &str, body: &str) {
    // Use Tauri notification plugin
    if let Err(e) = app_handle
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show()
    {
        eprintln!("[Reminder] Failed to send notification: {}", e);
    }

    // Also emit event to frontend for in-app notification
    let _ = app_handle.emit("reminder", serde_json::json!({
        "title": title,
        "body": body,
        "timestamp": Local::now().timestamp_millis()
    }));
}

async fn check_time_reminders(app_handle: &AppHandle, config: &ReminderConfig, open_tab_count: usize) {
    let now = Local::now();
    let current_time = now.time();

    // Lunch reminder - check if we're within 5 minutes before lunch time
    if config.lunch_reminder {
        if let Some(lunch_time) = parse_time(&config.lunch_time) {
            let minutes_until = (lunch_time.hour() * 60 + lunch_time.minute()) as i32
                - (current_time.hour() * 60 + current_time.minute()) as i32;

            if minutes_until >= 0 && minutes_until <= 5 && should_remind(&LAST_LUNCH_REMINDER) {
                mark_reminded(&LAST_LUNCH_REMINDER);
                send_notification(
                    app_handle,
                    "Lunch Break Reminder",
                    &format!(
                        "You have {} open tabs. Take a moment to review and close unnecessary tabs before your break!",
                        open_tab_count
                    ),
                )
                .await;
            }
        }
    }

    // Evening reminder - check if we're within 5 minutes before end of day
    if config.evening_reminder {
        if let Some(evening_time) = parse_time(&config.evening_time) {
            let minutes_until = (evening_time.hour() * 60 + evening_time.minute()) as i32
                - (current_time.hour() * 60 + current_time.minute()) as i32;

            if minutes_until >= 0 && minutes_until <= 5 && should_remind(&LAST_EVENING_REMINDER) {
                mark_reminded(&LAST_EVENING_REMINDER);
                send_notification(
                    app_handle,
                    "End of Day Reminder",
                    &format!(
                        "Time to wrap up! You have {} open tabs. Close what you don't need before leaving.",
                        open_tab_count
                    ),
                )
                .await;
            }
        }
    }
}

async fn check_threshold_reminder(app_handle: &AppHandle, config: &ReminderConfig, open_tab_count: usize) {
    if !config.tab_threshold_reminder {
        return;
    }

    if open_tab_count >= config.tab_threshold as usize && should_remind(&LAST_THRESHOLD_REMINDER) {
        mark_reminded(&LAST_THRESHOLD_REMINDER);
        send_notification(
            app_handle,
            "Tab Overload Alert",
            &format!(
                "You have {} open tabs (threshold: {}). Consider closing some to stay focused!",
                open_tab_count, config.tab_threshold
            ),
        )
        .await;
    }
}

async fn check_interval_reminder(app_handle: &AppHandle, config: &ReminderConfig, open_tab_count: usize, close_suggested: usize) {
    if !config.interval_reminder || config.interval_hours == 0 {
        return;
    }

    let now = Local::now().timestamp() as u64;
    let last = LAST_INTERVAL_REMINDER.load(Ordering::Relaxed);
    let interval_secs = (config.interval_hours as u64) * 3600;

    if now - last >= interval_secs {
        LAST_INTERVAL_REMINDER.store(now, Ordering::Relaxed);

        let message = if close_suggested > 0 {
            format!(
                "Quick check-in: {} open tabs, {} suggested for closing. Take a moment to tidy up!",
                open_tab_count, close_suggested
            )
        } else {
            format!(
                "Quick check-in: You have {} open tabs. Everything looking organized?",
                open_tab_count
            )
        };

        send_notification(app_handle, "Tab Check-in", &message).await;
    }
}

/// Auto-generate daily report at evening time
async fn check_auto_report(app_handle: &AppHandle, config: &ReminderConfig, storage: &AppState) {
    if !config.auto_report {
        return;
    }

    let now = Local::now();
    let current_time = now.time();

    // Generate report at evening time
    if let Some(evening_time) = parse_time(&config.evening_time) {
        let minutes_since = (current_time.hour() * 60 + current_time.minute()) as i32
            - (evening_time.hour() * 60 + evening_time.minute()) as i32;

        // Generate report within 10 minutes after evening time
        if minutes_since >= 0 && minutes_since <= 10 && should_remind(&LAST_AUTO_REPORT) {
            mark_reminded(&LAST_AUTO_REPORT);

            // Generate the report
            let storage_guard = storage.read().await;
            let tabs = storage_guard.get_today_tabs();
            let settings = storage_guard.settings.clone();
            drop(storage_guard);

            // Try to generate AI content
            let ai_content = match ai::generate_daily_report(&tabs, &settings).await {
                Ok(content) => content,
                Err(e) => {
                    eprintln!("[AutoReport] AI generation failed: {}, using fallback", e);
                    format!(
                        "# Daily Summary\n\n\
                         Today you worked with {} tabs.\n\n\
                         *Note: AI summary generation failed. Please check your API key settings.*",
                        tabs.len()
                    )
                }
            };

            // Generate enhanced report with visualization data
            let storage_guard = storage.read().await;
            let report = report::generate_enhanced_report(&storage_guard, ai_content);
            drop(storage_guard);

            // Save report
            let mut storage_guard = storage.write().await;
            storage_guard.report = Some(report);
            if let Err(e) = storage_guard.save_report() {
                eprintln!("[AutoReport] Failed to save report: {}", e);
            }
            drop(storage_guard);

            // Send notification
            send_notification(
                app_handle,
                "Daily Report Ready",
                "Your daily browsing summary has been generated. Check the Report tab to view it!",
            )
            .await;

            // Emit event to frontend
            let _ = app_handle.emit("report_generated", ());
        }
    }
}

/// Start the reminder background task
pub fn start_reminder_service(storage: AppState, app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        // Check every minute
        let mut timer = interval(Duration::from_secs(60));

        loop {
            timer.tick().await;

            let storage_guard = storage.read().await;
            let config = storage_guard
                .settings
                .reminders
                .clone()
                .unwrap_or_default();

            if !config.enabled {
                continue;
            }

            // Count open tabs and close suggestions
            let open_tabs: Vec<_> = storage_guard
                .tabs
                .values()
                .filter(|t| t.closed_at.is_none())
                .collect();
            let open_tab_count = open_tabs.len();
            let close_suggested = open_tabs
                .iter()
                .filter(|t| {
                    t.suggestion
                        .as_ref()
                        .map(|s| s.decision == "close")
                        .unwrap_or(false)
                })
                .count();

            drop(storage_guard);

            // Check all reminder types
            check_time_reminders(&app_handle, &config, open_tab_count).await;
            check_threshold_reminder(&app_handle, &config, open_tab_count).await;
            check_interval_reminder(&app_handle, &config, open_tab_count, close_suggested).await;

            // Check auto report generation
            check_auto_report(&app_handle, &config, &storage).await;
        }
    });
}
