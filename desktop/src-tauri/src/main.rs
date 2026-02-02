// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod reminder;
mod report;
mod rules;
mod server;
mod storage;

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;

pub type AppState = Arc<RwLock<storage::Storage>>;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Initialize storage
            let storage = storage::Storage::new(&app_handle);
            let state: AppState = Arc::new(RwLock::new(storage));

            // Store state in app
            app.manage(state.clone());

            // Cleanup old tabs on startup (older than 7 days)
            let cleanup_state = state.clone();
            tauri::async_runtime::spawn(async move {
                let mut storage = cleanup_state.write().await;
                let count = storage.cleanup_old_tabs(7);
                if count > 0 {
                    let _ = storage.save_tabs();
                    println!("[Startup] Cleaned up {} old tabs", count);
                }
                let (total, open, closed) = storage.get_stats();
                println!(
                    "[Startup] Storage stats: {} total, {} open, {} closed tabs",
                    total, open, closed
                );
            });

            // Start HTTP server for extension communication
            let server_state = state.clone();
            let server_app_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = server::start_server(server_state, server_app_handle).await {
                    eprintln!("Server error: {}", e);
                }
            });

            // Start reminder service
            let reminder_state = state.clone();
            let reminder_app_handle = app_handle.clone();
            reminder::start_reminder_service(reminder_state, reminder_app_handle);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tabs,
            get_closed_tabs,
            get_settings,
            get_report,
            save_settings,
            analyze_tabs,
            analyze_batch,
            analyze_with_rules,
            generate_report,
            close_tab,
            close_tabs_batch,
            mark_keep,
            clear_suggestions,
            clear_data,
            trigger_refresh,
            cleanup_old_tabs,
            get_storage_stats,
            sync_tabs,
            get_recently_closed_tabs,
            restore_tab,
            get_decision_patterns,
            mark_disagree,
            confirm_all_suggestions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn get_tabs(state: tauri::State<'_, AppState>) -> Result<Vec<storage::TabRecord>, String> {
    let storage = state.read().await;
    Ok(storage.get_open_tabs())
}

#[tauri::command]
async fn get_closed_tabs(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<storage::TabRecord>, String> {
    let storage = state.read().await;
    Ok(storage.get_today_closed_tabs())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<storage::Settings, String> {
    let storage = state.read().await;
    Ok(storage.settings.clone())
}

#[tauri::command]
async fn get_report(
    state: tauri::State<'_, AppState>,
) -> Result<Option<storage::DailyReport>, String> {
    let storage = state.read().await;
    Ok(storage.report.clone())
}

#[tauri::command]
async fn save_settings(
    state: tauri::State<'_, AppState>,
    settings: storage::Settings,
) -> Result<(), String> {
    let mut storage = state.write().await;
    storage.settings = settings;
    storage.save_settings().map_err(|e| e.to_string())
}

#[tauri::command]
async fn analyze_tabs(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<storage::TabRecord>, String> {
    let storage = state.read().await;
    let tabs = storage.get_open_tabs();
    let settings = storage.settings.clone();
    let patterns = storage.get_decision_patterns();
    drop(storage);

    let suggestions = ai::suggest_tabs(&tabs, &settings, Some(&patterns))
        .await
        .map_err(|e| e.to_string())?;

    let mut storage = state.write().await;
    for (tab_id, suggestion) in suggestions {
        storage.update_suggestion(tab_id, suggestion);
    }
    storage.save_tabs().map_err(|e| e.to_string())?;

    Ok(storage.get_open_tabs())
}

#[tauri::command]
async fn analyze_batch(
    state: tauri::State<'_, AppState>,
    limit: usize,
) -> Result<(Vec<storage::TabRecord>, usize), String> {
    let storage = state.read().await;
    let all_tabs = storage.get_open_tabs();
    let settings = storage.settings.clone();
    let patterns = storage.get_decision_patterns();

    // Filter to only tabs without suggestions
    let unanalyzed: Vec<_> = all_tabs
        .iter()
        .filter(|t| t.suggestion.is_none())
        .cloned()
        .collect();

    let to_analyze: Vec<_> = unanalyzed.into_iter().take(limit).collect();
    let analyze_count = to_analyze.len();

    drop(storage);

    if to_analyze.is_empty() {
        let storage = state.read().await;
        return Ok((storage.get_open_tabs(), 0));
    }

    let suggestions = ai::suggest_tabs(&to_analyze, &settings, Some(&patterns))
        .await
        .map_err(|e| e.to_string())?;

    let mut storage = state.write().await;
    for (tab_id, suggestion) in suggestions {
        storage.update_suggestion(tab_id, suggestion);
    }
    storage.save_tabs().map_err(|e| e.to_string())?;

    Ok((storage.get_open_tabs(), analyze_count))
}

/// Analyze tabs using rule-based heuristics (no AI required)
#[tauri::command]
async fn analyze_with_rules(
    state: tauri::State<'_, AppState>,
) -> Result<(Vec<storage::TabRecord>, usize), String> {
    let storage = state.read().await;
    let all_tabs = storage.get_open_tabs();
    let settings = storage.settings.clone();
    drop(storage);

    // Get rule config or use default
    let rule_config = settings.rules.unwrap_or_default();

    // Run rule-based analysis
    let suggestions = rules::analyze_tabs_with_rules(&all_tabs, &rule_config);
    let analyze_count = suggestions.len();

    if suggestions.is_empty() {
        let storage = state.read().await;
        return Ok((storage.get_open_tabs(), 0));
    }

    // Save suggestions
    let mut storage = state.write().await;
    for (tab_id, suggestion) in suggestions {
        storage.update_suggestion(tab_id, suggestion);
    }
    storage.save_tabs().map_err(|e| e.to_string())?;

    Ok((storage.get_open_tabs(), analyze_count))
}

#[tauri::command]
async fn generate_report(
    state: tauri::State<'_, AppState>,
) -> Result<storage::DailyReport, String> {
    let storage = state.read().await;
    let tabs = storage.get_today_tabs();
    let settings = storage.settings.clone();
    drop(storage);

    // Generate AI content for the report
    let ai_content = ai::generate_daily_report(&tabs, &settings)
        .await
        .map_err(|e| e.to_string())?;

    // Generate enhanced report with visualization data
    let storage = state.read().await;
    let report = report::generate_enhanced_report(&storage, ai_content);
    drop(storage);

    // Save report
    let mut storage = state.write().await;
    storage.report = Some(report.clone());
    storage.save_report().map_err(|e| e.to_string())?;

    Ok(report)
}

#[tauri::command]
async fn close_tab(state: tauri::State<'_, AppState>, tab_id: i64) -> Result<(), String> {
    // First, send command to extension to close the actual Chrome tab
    if let Some(sender) = server::get_command_sender() {
        let _ = sender.send(format!("close_tab:{}", tab_id));
    }

    // Record user decision and mark as closed in storage
    let mut storage = state.write().await;
    storage.record_user_decision(tab_id, "close");
    storage.close_tab(tab_id);
    storage.save_tabs().map_err(|e| e.to_string())?;
    storage.save_user_decisions().map_err(|e| e.to_string())
}

/// Close multiple tabs at once (batch operation)
#[tauri::command]
async fn close_tabs_batch(state: tauri::State<'_, AppState>, tab_ids: Vec<i64>) -> Result<usize, String> {
    let count = tab_ids.len();

    // Send close commands to extension for each tab
    if let Some(sender) = server::get_command_sender() {
        for tab_id in &tab_ids {
            let _ = sender.send(format!("close_tab:{}", tab_id));
        }
    }

    // Record decisions and mark all as closed in storage
    let mut storage = state.write().await;
    for tab_id in &tab_ids {
        storage.record_user_decision(*tab_id, "close");
        storage.close_tab(*tab_id);
    }
    storage.save_tabs().map_err(|e| e.to_string())?;
    storage.save_user_decisions().map_err(|e| e.to_string())?;

    Ok(count)
}

#[tauri::command]
async fn mark_keep(state: tauri::State<'_, AppState>, tab_id: i64) -> Result<(), String> {
    let mut storage = state.write().await;

    // Record user decision
    storage.record_user_decision(tab_id, "keep");

    // Preserve existing category and digest if any
    let existing = storage
        .tabs
        .get(&tab_id)
        .and_then(|t| t.suggestion.as_ref());
    let existing_category = existing.and_then(|s| s.category.clone());
    let existing_digest = existing.and_then(|s| s.digest.clone());

    storage.update_suggestion(
        tab_id,
        storage::TabSuggestion {
            decision: "keep".to_string(),
            reason: "Marked as keep by user".to_string(),
            category: existing_category,
            digest: existing_digest,
            scored_at: chrono::Utc::now().timestamp_millis(),
        },
    );
    storage.save_tabs().map_err(|e| e.to_string())?;
    storage.save_user_decisions().map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_suggestions(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut storage = state.write().await;
    for tab in storage.tabs.values_mut() {
        tab.suggestion = None;
    }
    storage.save_tabs().map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_data(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut storage = state.write().await;
    storage.clear();
    storage.save_tabs().map_err(|e| e.to_string())?;
    storage.save_report().map_err(|e| e.to_string())
}

#[tauri::command]
async fn trigger_refresh() -> Result<(), String> {
    // Send refresh command to connected extensions via WebSocket
    if let Some(sender) = server::get_command_sender() {
        sender
            .send("refresh_all".to_string())
            .map_err(|e| format!("Failed to send refresh command: {}", e))?;
        Ok(())
    } else {
        Err("Command sender not initialized".to_string())
    }
}

#[tauri::command]
async fn cleanup_old_tabs(
    state: tauri::State<'_, AppState>,
    days: Option<i64>,
) -> Result<usize, String> {
    let days_old = days.unwrap_or(7); // Default to 7 days
    let mut storage = state.write().await;
    let count = storage.cleanup_old_tabs(days_old);
    if count > 0 {
        storage.save_tabs().map_err(|e| e.to_string())?;
    }
    Ok(count)
}

#[tauri::command]
async fn get_storage_stats(
    state: tauri::State<'_, AppState>,
) -> Result<(usize, usize, usize), String> {
    let storage = state.read().await;
    Ok(storage.get_stats())
}

/// Sync storage with actual Chrome tabs - removes tabs that no longer exist
#[tauri::command]
async fn sync_tabs(
    state: tauri::State<'_, AppState>,
    chrome_tab_ids: Vec<i64>,
) -> Result<usize, String> {
    let mut storage = state.write().await;
    let count = storage.sync_with_chrome_tabs(&chrome_tab_ids);
    if count > 0 {
        storage.save_tabs().map_err(|e| e.to_string())?;
    }
    Ok(count)
}

/// Get recently closed tabs (sorted by closed_at, most recent first)
#[tauri::command]
async fn get_recently_closed_tabs(
    state: tauri::State<'_, AppState>,
    limit: Option<usize>,
) -> Result<Vec<storage::TabRecord>, String> {
    let storage = state.read().await;
    let max_tabs = limit.unwrap_or(50);
    Ok(storage.get_recently_closed_tabs(max_tabs))
}

/// Mark disagree with AI suggestion (flip the decision)
#[tauri::command]
async fn mark_disagree(
    state: tauri::State<'_, AppState>,
    tab_id: i64,
    current_decision: String,
) -> Result<(), String> {
    let mut storage = state.write().await;

    // Flip the decision: keep -> close, close -> keep
    let new_decision = if current_decision == "keep" {
        "close"
    } else {
        "keep"
    };

    // Record that user disagreed
    storage.record_user_decision(tab_id, new_decision);

    // Update the suggestion
    let existing = storage
        .tabs
        .get(&tab_id)
        .and_then(|t| t.suggestion.as_ref());
    let existing_category = existing.and_then(|s| s.category.clone());
    let existing_digest = existing.and_then(|s| s.digest.clone());

    storage.update_suggestion(
        tab_id,
        storage::TabSuggestion {
            decision: new_decision.to_string(),
            reason: format!("User corrected from {} to {}", current_decision, new_decision),
            category: existing_category,
            digest: existing_digest,
            scored_at: chrono::Utc::now().timestamp_millis(),
        },
    );

    storage.save_tabs().map_err(|e| e.to_string())?;
    storage.save_user_decisions().map_err(|e| e.to_string())
}

/// Confirm all suggestions: close tabs suggested for closing
#[tauri::command]
async fn confirm_all_suggestions(
    state: tauri::State<'_, AppState>,
) -> Result<usize, String> {
    let storage = state.read().await;
    let close_tabs: Vec<i64> = storage
        .tabs
        .values()
        .filter(|t| {
            t.closed_at.is_none()
                && t.suggestion
                    .as_ref()
                    .map(|s| s.decision == "close")
                    .unwrap_or(false)
        })
        .map(|t| t.id)
        .collect();

    let count = close_tabs.len();
    drop(storage);

    if count == 0 {
        return Ok(0);
    }

    // Send close commands to extension
    if let Some(sender) = server::get_command_sender() {
        for tab_id in &close_tabs {
            let _ = sender.send(format!("close_tab:{}", tab_id));
        }
    }

    // Record decisions and close tabs
    let mut storage = state.write().await;
    for tab_id in &close_tabs {
        storage.record_user_decision(*tab_id, "close");
        storage.close_tab(*tab_id);
    }
    storage.save_tabs().map_err(|e| e.to_string())?;
    storage.save_user_decisions().map_err(|e| e.to_string())?;

    Ok(count)
}

/// Get user decision patterns for AI optimization
#[tauri::command]
async fn get_decision_patterns(
    state: tauri::State<'_, AppState>,
) -> Result<storage::DecisionPatterns, String> {
    let storage = state.read().await;
    Ok(storage.get_decision_patterns())
}

/// Restore a closed tab by opening its URL in Chrome
#[tauri::command]
async fn restore_tab(
    state: tauri::State<'_, AppState>,
    tab_id: i64,
) -> Result<(), String> {
    // Get the tab's URL from storage
    let storage = state.read().await;
    let tab = storage.tabs.get(&tab_id);

    let url = tab
        .and_then(|t| t.url.clone())
        .ok_or_else(|| "Tab not found or has no URL".to_string())?;

    drop(storage);

    // Send command to extension to open the URL
    if let Some(sender) = server::get_command_sender() {
        sender
            .send(format!("restore_tab:{}:{}", tab_id, url))
            .map_err(|e| format!("Failed to send restore command: {}", e))?;
    } else {
        return Err("Extension not connected".to_string());
    }

    // Mark as restored in storage (will be updated with new tab ID when extension reports)
    let mut storage = state.write().await;
    storage.mark_tab_restored(tab_id);
    storage.save_tabs().map_err(|e| e.to_string())?;

    Ok(())
}
