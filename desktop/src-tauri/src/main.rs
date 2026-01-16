// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod server;
mod storage;
mod ai;

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;

pub type AppState = Arc<RwLock<storage::Storage>>;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
                println!("[Startup] Storage stats: {} total, {} open, {} closed tabs", total, open, closed);
            });
            
            // Start HTTP server for extension communication
            let server_state = state.clone();
            let server_app_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = server::start_server(server_state, server_app_handle).await {
                    eprintln!("Server error: {}", e);
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_tabs,
            get_closed_tabs,
            get_settings,
            save_settings,
            analyze_tabs,
            analyze_batch,
            generate_report,
            close_tab,
            mark_keep,
            clear_suggestions,
            clear_data,
            trigger_refresh,
            cleanup_old_tabs,
            get_storage_stats,
            sync_tabs,
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
async fn get_closed_tabs(state: tauri::State<'_, AppState>) -> Result<Vec<storage::TabRecord>, String> {
    let storage = state.read().await;
    Ok(storage.get_today_closed_tabs())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, AppState>) -> Result<storage::Settings, String> {
    let storage = state.read().await;
    Ok(storage.settings.clone())
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
async fn analyze_tabs(state: tauri::State<'_, AppState>) -> Result<Vec<storage::TabRecord>, String> {
    let storage = state.read().await;
    let tabs = storage.get_open_tabs();
    let settings = storage.settings.clone();
    drop(storage);
    
    let suggestions = ai::suggest_tabs(&tabs, &settings).await.map_err(|e| e.to_string())?;
    
    let mut storage = state.write().await;
    for (tab_id, suggestion) in suggestions {
        storage.update_suggestion(tab_id, suggestion);
    }
    storage.save_tabs().map_err(|e| e.to_string())?;
    
    Ok(storage.get_open_tabs())
}

#[tauri::command]
async fn analyze_batch(state: tauri::State<'_, AppState>, limit: usize) -> Result<(Vec<storage::TabRecord>, usize), String> {
    let storage = state.read().await;
    let all_tabs = storage.get_open_tabs();
    let settings = storage.settings.clone();
    
    // Filter to only tabs without suggestions
    let unanalyzed: Vec<_> = all_tabs.iter()
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
    
    let suggestions = ai::suggest_tabs(&to_analyze, &settings).await.map_err(|e| e.to_string())?;
    
    let mut storage = state.write().await;
    for (tab_id, suggestion) in suggestions {
        storage.update_suggestion(tab_id, suggestion);
    }
    storage.save_tabs().map_err(|e| e.to_string())?;
    
    Ok((storage.get_open_tabs(), analyze_count))
}

#[tauri::command]
async fn generate_report(state: tauri::State<'_, AppState>) -> Result<storage::DailyReport, String> {
    let storage = state.read().await;
    let tabs = storage.get_today_tabs();
    let settings = storage.settings.clone();
    drop(storage);
    
    let content = ai::generate_daily_report(&tabs, &settings).await.map_err(|e| e.to_string())?;
    
    let report = storage::DailyReport {
        date: chrono::Local::now().format("%Y-%m-%d").to_string(),
        content,
        generated_at: chrono::Utc::now().timestamp_millis(),
    };
    
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
    
    // Then mark as closed in storage
    let mut storage = state.write().await;
    storage.close_tab(tab_id);
    storage.save_tabs().map_err(|e| e.to_string())
}

#[tauri::command]
async fn mark_keep(state: tauri::State<'_, AppState>, tab_id: i64) -> Result<(), String> {
    let mut storage = state.write().await;
    // Preserve existing category if any
    let existing_category = storage.tabs.get(&tab_id)
        .and_then(|t| t.suggestion.as_ref())
        .and_then(|s| s.category.clone());
    
    storage.update_suggestion(tab_id, storage::TabSuggestion {
        decision: "keep".to_string(),
        reason: "Marked as keep by user".to_string(),
        category: existing_category,
        scored_at: chrono::Utc::now().timestamp_millis(),
    });
    storage.save_tabs().map_err(|e| e.to_string())
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
        sender.send("refresh_all".to_string())
            .map_err(|e| format!("Failed to send refresh command: {}", e))?;
        Ok(())
    } else {
        Err("Command sender not initialized".to_string())
    }
}

#[tauri::command]
async fn cleanup_old_tabs(state: tauri::State<'_, AppState>, days: Option<i64>) -> Result<usize, String> {
    let days_old = days.unwrap_or(7); // Default to 7 days
    let mut storage = state.write().await;
    let count = storage.cleanup_old_tabs(days_old);
    if count > 0 {
        storage.save_tabs().map_err(|e| e.to_string())?;
    }
    Ok(count)
}

#[tauri::command]
async fn get_storage_stats(state: tauri::State<'_, AppState>) -> Result<(usize, usize, usize), String> {
    let storage = state.read().await;
    Ok(storage.get_stats())
}

/// Sync storage with actual Chrome tabs - removes tabs that no longer exist
#[tauri::command]
async fn sync_tabs(state: tauri::State<'_, AppState>, chrome_tab_ids: Vec<i64>) -> Result<usize, String> {
    let mut storage = state.write().await;
    let count = storage.sync_with_chrome_tabs(&chrome_tab_ids);
    if count > 0 {
        storage.save_tabs().map_err(|e| e.to_string())?;
    }
    Ok(count)
}
