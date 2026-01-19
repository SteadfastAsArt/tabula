use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tokio::fs::File;
use tokio::sync::broadcast;
use tokio_util::io::ReaderStream;
use tower_http::cors::{Any, CorsLayer};

use crate::{storage::{TabRecord, TabSnapshot}, AppState};

const SERVER_PORT: u16 = 21890;

// Channel for sending commands to connected extensions
pub type CommandSender = broadcast::Sender<String>;

#[derive(Clone)]
struct ServerState {
    storage: AppState,
    app_handle: AppHandle,
    command_tx: CommandSender,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct TabData {
    pub id: i64,
    #[serde(rename = "windowId")]
    pub window_id: Option<i64>,
    pub url: Option<String>,
    pub title: Option<String>,
    #[serde(rename = "favIconUrl")]
    pub fav_icon_url: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "lastActiveAt")]
    pub last_active_at: Option<i64>,
    #[serde(rename = "totalActiveMs")]
    pub total_active_ms: i64,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "closedAt")]
    pub closed_at: Option<i64>,
    // Track if Chrome discarded this tab to save memory
    #[serde(default)]
    pub discarded: Option<bool>,
    // Track when last screenshot was taken
    #[serde(rename = "lastScreenshotAt")]
    pub last_screenshot_at: Option<i64>,
    // Rich description extracted from page meta/content
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CapturePayload {
    pub tab: TabData,
    #[serde(rename = "screenshotBase64")]
    pub screenshot_base64: Option<String>,
    #[serde(rename = "capturedAt")]
    pub captured_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct TabEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub tab: TabData,
    pub timestamp: i64,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
}

// Store the command sender globally so it can be accessed from Tauri commands
static COMMAND_SENDER: std::sync::OnceLock<CommandSender> = std::sync::OnceLock::new();

pub fn get_command_sender() -> Option<&'static CommandSender> {
    COMMAND_SENDER.get()
}

pub async fn start_server(storage: AppState, app_handle: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Create broadcast channel for commands (capacity 16)
    let (command_tx, _) = broadcast::channel::<String>(16);
    
    // Store the sender globally
    let _ = COMMAND_SENDER.set(command_tx.clone());
    
    let state = ServerState { storage, app_handle, command_tx };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/capture", post(handle_capture))
        .route("/event", post(handle_event))
        .route("/sync", post(handle_sync))
        .route("/screenshot/:filename", get(serve_screenshot))
        .route("/ws", get(websocket_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], SERVER_PORT));
    println!("Extension server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

// WebSocket handler for bidirectional communication with extension
async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<ServerState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_websocket(socket, state))
}

async fn handle_websocket(socket: WebSocket, state: ServerState) {
    let (mut sender, mut receiver) = socket.split();
    let mut command_rx = state.command_tx.subscribe();
    
    // Task to forward commands from broadcast channel to WebSocket
    let send_task = tokio::spawn(async move {
        while let Ok(cmd) = command_rx.recv().await {
            if sender.send(Message::Text(cmd.into())).await.is_err() {
                break;
            }
        }
    });
    
    // Task to receive messages from extension (for acknowledgments, etc.)
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(_)) => {
                    // Acknowledgment received
                }
                Ok(Message::Close(_)) => {
                    break;
                }
                Err(_) => {
                    break;
                }
                _ => {}
            }
        }
    });
    
    // Wait for either task to complete
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }
}

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: "0.1.0".to_string(),
    })
}

async fn handle_capture(
    State(state): State<ServerState>,
    Json(payload): Json<CapturePayload>,
) -> StatusCode {
    let mut storage = state.storage.write().await;
    
    // Save screenshot to disk if present
    let screenshot_path = if let Some(base64_data) = &payload.screenshot_base64 {
        match storage.save_screenshot(payload.tab.id, base64_data) {
            Ok(path) => Some(path),
            Err(_) => None
        }
    } else {
        None
    };

    // Update or create tab record
    let tab = storage.tabs.entry(payload.tab.id).or_insert_with(|| TabRecord {
        id: payload.tab.id,
        window_id: payload.tab.window_id,
        url: payload.tab.url.clone(),
        title: payload.tab.title.clone(),
        fav_icon_url: payload.tab.fav_icon_url.clone(),
        created_at: payload.tab.created_at,
        last_active_at: payload.tab.last_active_at,
        total_active_ms: payload.tab.total_active_ms,
        is_active: payload.tab.is_active,
        closed_at: None,
        description: payload.tab.description.clone(),
        snapshot: None,
        suggestion: None,
    });

    // Update snapshot
    tab.snapshot = Some(TabSnapshot {
        screenshot_path,
        captured_at: payload.captured_at,
    });

    // Update other fields
    tab.url = payload.tab.url;
    tab.title = payload.tab.title;
    tab.last_active_at = payload.tab.last_active_at;
    tab.total_active_ms = payload.tab.total_active_ms;
    tab.is_active = payload.tab.is_active;
    // Update description if provided
    if payload.tab.description.is_some() {
        tab.description = payload.tab.description;
    }

    // Save to disk
    if let Err(e) = storage.save_tabs() {
        eprintln!("Failed to save tabs: {}", e);
    }

    // Emit event to frontend
    let _ = state.app_handle.emit("tab-captured", payload.tab.id);

    StatusCode::OK
}

async fn handle_event(
    State(state): State<ServerState>,
    Json(event): Json<TabEvent>,
) -> StatusCode {
    let mut storage = state.storage.write().await;

    match event.event_type.as_str() {
        "created" | "updated" | "activated" => {
            let existing = storage.tabs.get(&event.tab.id);
            let prev_active_ms = existing.map(|t| t.total_active_ms).unwrap_or(0);
            let prev_snapshot = existing.and_then(|t| t.snapshot.clone());
            let prev_suggestion = existing.and_then(|t| t.suggestion.clone());
            let prev_description = existing.and_then(|t| t.description.clone());
            
            let tab = storage.tabs.entry(event.tab.id).or_insert_with(|| TabRecord {
                id: event.tab.id,
                window_id: event.tab.window_id,
                url: event.tab.url.clone(),
                title: event.tab.title.clone(),
                fav_icon_url: event.tab.fav_icon_url.clone(),
                created_at: event.tab.created_at,
                last_active_at: event.tab.last_active_at,
                total_active_ms: 0,
                is_active: event.tab.is_active,
                closed_at: None,
                description: event.tab.description.clone(),
                snapshot: None,
                suggestion: None,
            });

            // Update fields
            tab.url = event.tab.url;
            tab.title = event.tab.title;
            tab.fav_icon_url = event.tab.fav_icon_url;
            tab.last_active_at = event.tab.last_active_at;
            tab.is_active = event.tab.is_active;
            
            // Update description if provided, otherwise preserve existing
            if event.tab.description.is_some() {
                tab.description = event.tab.description;
            } else if tab.description.is_none() {
                tab.description = prev_description;
            }
            
            // Accumulate active time - take max of existing and incoming
            // Extension sends accumulated time, so take the larger value
            tab.total_active_ms = prev_active_ms.max(event.tab.total_active_ms);
            
            // Preserve existing snapshot and suggestion
            if tab.snapshot.is_none() {
                tab.snapshot = prev_snapshot;
            }
            if tab.suggestion.is_none() {
                tab.suggestion = prev_suggestion;
            }
        }
        "removed" => {
            if let Some(tab) = storage.tabs.get_mut(&event.tab.id) {
                tab.closed_at = Some(event.timestamp);
                tab.is_active = false;
                
                // Only delete screenshot if the tab is NOT from today
                // (keep today's data for daily report)
                let now = chrono::Local::now();
                let today_start = now.date_naive()
                    .and_hms_opt(0, 0, 0)
                    .map(|dt| dt.and_local_timezone(chrono::Local).unwrap().timestamp_millis())
                    .unwrap_or(0);
                
                let is_today = tab.created_at >= today_start
                    || tab.last_active_at.map(|la| la >= today_start).unwrap_or(false);
                
                if !is_today {
                    // Delete screenshot for old tabs to save disk space
                    storage.delete_screenshot(event.tab.id);
                }
            }
        }
        _ => {}
    }

    if let Err(e) = storage.save_tabs() {
        eprintln!("Failed to save tabs: {}", e);
    }

    // Emit event to frontend
    let _ = state.app_handle.emit("tab-event", &event.event_type);

    StatusCode::OK
}

#[derive(Debug, Deserialize)]
pub struct SyncPayload {
    pub tab_ids: Vec<i64>,
}

async fn handle_sync(
    State(state): State<ServerState>,
    Json(payload): Json<SyncPayload>,
) -> StatusCode {
    let mut storage = state.storage.write().await;
    let count = storage.sync_with_chrome_tabs(&payload.tab_ids);
    
    if count > 0 {
        if let Err(e) = storage.save_tabs() {
            eprintln!("Failed to save tabs after sync: {}", e);
        }
    }

    // Emit event to frontend to refresh
    let _ = state.app_handle.emit("tab-event", "sync");

    StatusCode::OK
}

async fn serve_screenshot(
    State(state): State<ServerState>,
    Path(filename): Path<String>,
) -> impl IntoResponse {
    // Get screenshots directory from app data path
    let screenshots_dir = state
        .app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("screenshots");

    let file_path = screenshots_dir.join(&filename);

    // Security check: ensure the path is within screenshots directory
    if !file_path.starts_with(&screenshots_dir) {
        return Err((StatusCode::FORBIDDEN, "Access denied"));
    }

    // Open the file
    let file = match File::open(&file_path).await {
        Ok(f) => f,
        Err(_) => {
            return Err((StatusCode::NOT_FOUND, "Screenshot not found"));
        }
    };

    // Create a stream from the file
    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    // Determine content type based on file extension
    let content_type = if filename.ends_with(".jpg") || filename.ends_with(".jpeg") {
        "image/jpeg"
    } else if filename.ends_with(".png") {
        "image/png"
    } else {
        "application/octet-stream"
    };

    Ok(Response::builder()
        .header(header::CONTENT_TYPE, content_type)
        // Disable caching so refreshed screenshots are always shown
        .header(header::CACHE_CONTROL, "no-cache, no-store, must-revalidate")
        .header(header::PRAGMA, "no-cache")
        .header(header::EXPIRES, "0")
        .body(body)
        .unwrap())
}
