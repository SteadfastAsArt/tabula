# Tab Cleanser - Technical Architecture

> AI-powered browser tab management system

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Technology Stack](#technology-stack)
- [Module Breakdown](#module-breakdown)
- [Data Flow](#data-flow)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Storage & Persistence](#storage--persistence)

---

## System Overview

Tab Cleanser is a two-component system:

| Component | Role | Tech |
|-----------|------|------|
| **Chrome Extension** | Data collector - tracks tabs, captures screenshots & content | TypeScript, Chrome APIs |
| **Desktop App** | AI analysis engine - processes data, provides UI, stores state | Rust (Tauri) + TypeScript |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Tab Cleanser System                              │
├─────────────────────────────┬───────────────────────────────────────────────┤
│      Chrome Extension       │             Tauri Desktop App                 │
│   ┌─────────────────────┐   │   ┌─────────────────┐   ┌─────────────────┐  │
│   │  Tab Event Monitor  │   │   │   HTTP Server   │◄──│   AI Analysis   │  │
│   │  Screenshot Capture │──────►│   WebSocket     │   │   (OpenAI API)  │  │
│   │  Content Extraction │   │   │   Storage       │   └─────────────────┘  │
│   └─────────────────────┘   │   └─────────────────┘                        │
│                             │           │                                   │
│                             │           ▼                                   │
│                             │   ┌─────────────────┐                        │
│                             │   │  Frontend UI    │                        │
│                             │   │  (Vite + TS)    │                        │
│                             │   └─────────────────┘                        │
└─────────────────────────────┴───────────────────────────────────────────────┘
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                    PROJECT STRUCTURE                                 │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  tab_cleanser/                                                                       │
│  │                                                                                   │
│  ├── extension/                    # Chrome Extension (MV3)                          │
│  │   ├── src/                                                                        │
│  │   │   ├── background.ts         # Service Worker entry point                      │
│  │   │   ├── content.ts            # DOM content extraction                          │
│  │   │   ├── popup.ts              # Extension popup UI                              │
│  │   │   └── modules/                                                                │
│  │   │       ├── config.ts         # Configuration constants                         │
│  │   │       ├── state.ts          # In-memory & chrome.storage state                │
│  │   │       ├── handlers.ts       # Chrome tab event handlers                       │
│  │   │       ├── screenshot.ts     # Tab screenshot capture logic                    │
│  │   │       ├── timer.ts          # Active time tracking                            │
│  │   │       ├── server.ts         # HTTP client for desktop communication           │
│  │   │       ├── websocket.ts      # WebSocket client for commands                   │
│  │   │       └── sync.ts           # Tab state synchronization                       │
│  │   └── manifest.json             # Chrome Extension manifest (MV3)                 │
│  │                                                                                   │
│  ├── desktop/                      # Tauri Desktop Application                       │
│  │   ├── src/                      # Frontend (TypeScript + Vite)                    │
│  │   │   ├── main.ts               # Application entry & event handlers              │
│  │   │   ├── api.ts                # Tauri invoke wrappers                           │
│  │   │   ├── state.ts              # Frontend state management                       │
│  │   │   ├── views/                # Page components                                 │
│  │   │   │   ├── TabsView.ts       # Main tab list view                              │
│  │   │   │   ├── HistoryView.ts    # Closed tabs history                             │
│  │   │   │   ├── ReportView.ts     # AI-generated daily report                       │
│  │   │   │   └── SettingsView.ts   # Configuration panel                             │
│  │   │   └── components/           # Reusable UI components                          │
│  │   │       ├── Sidebar.ts        # Navigation sidebar                              │
│  │   │       └── TabCard.ts        # Tab display card                                │
│  │   │                                                                               │
│  │   └── src-tauri/src/            # Backend (Rust)                                  │
│  │       ├── main.rs               # Tauri commands & app setup                      │
│  │       ├── server.rs             # HTTP + WebSocket server (Axum)                  │
│  │       ├── storage.rs            # File-based data persistence                     │
│  │       └── ai.rs                 # OpenAI API integration                          │
│  │                                                                                   │
│  └── shared/                       # Shared TypeScript type definitions              │
│      └── types.ts                  # Common interfaces for Extension ↔ Desktop       │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Chrome Extension

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | **Chrome Extension MV3** | Modern extension platform |
| Language | **TypeScript 5.6** | Type-safe JavaScript |
| Build | **esbuild** | Fast bundling |
| APIs | `chrome.tabs`, `chrome.scripting`, `chrome.storage` | Tab monitoring, screenshot, persistence |

### Desktop Application

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | **Tauri 2.0** | Lightweight native app framework |
| Backend | **Rust** | High-performance, memory-safe backend |
| Frontend | **TypeScript + Vite 6** | Modern frontend tooling |
| HTTP Server | **Axum 0.7** | Async Rust web framework |
| WebSocket | **tokio-tungstenite** (via Axum) | Bidirectional communication |
| AI | **OpenAI API** (via reqwest) | GPT-4o-mini for tab analysis |
| Storage | **JSON files** | Simple file-based persistence |
| Serialization | **serde** | Rust JSON serialization |

### Key Dependencies

```toml
# Rust (Cargo.toml)
tauri = "2"
axum = "0.7"
tokio = "1"
reqwest = "0.12"
serde = "1"
chrono = "0.4"
```

```json
// TypeScript (package.json)
"@tauri-apps/api": "^2"
"vite": "^6.0.0"
"typescript": "^5.6.3"
```

---

## Module Breakdown

### Extension Modules

| Module | File | Responsibility |
|--------|------|----------------|
| **Config** | `config.ts` | Server URLs, timing constants |
| **State** | `state.ts` | In-memory tab state, chrome.storage sync |
| **Handlers** | `handlers.ts` | Tab lifecycle event handlers (create/update/activate/remove) |
| **Screenshot** | `screenshot.ts` | Capture visible tab, compress JPEG, queue management |
| **Timer** | `timer.ts` | Track active time per tab |
| **Server** | `server.ts` | HTTP POST to desktop app |
| **WebSocket** | `websocket.ts` | Receive commands from desktop (close tab, refresh) |
| **Sync** | `sync.ts` | Periodic state synchronization |

### Desktop Backend Modules (Rust)

| Module | File | Responsibility |
|--------|------|----------------|
| **Main** | `main.rs` | Tauri commands, app lifecycle |
| **Server** | `server.rs` | HTTP endpoints, WebSocket handler |
| **Storage** | `storage.rs` | Tab records, settings, screenshots persistence |
| **AI** | `ai.rs` | OpenAI API calls, prompt engineering |

### Desktop Frontend Views

| View | File | Description |
|------|------|-------------|
| **Tabs** | `TabsView.ts` | Grid of open tabs with AI suggestions |
| **History** | `HistoryView.ts` | Today's closed tabs |
| **Report** | `ReportView.ts` | AI-generated daily summary |
| **Settings** | `SettingsView.ts` | API key, model, batch size configuration |

---

## Data Flow

### Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               DATA FLOW DIAGRAM                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

  CHROME BROWSER                        DESKTOP APP
  ══════════════                        ═══════════

  ┌─────────────┐                      ┌─────────────────────────────────────────────┐
  │   User      │                      │              RUST BACKEND                   │
  │  Browses    │                      │  ┌─────────────────────────────────────┐   │
  └──────┬──────┘                      │  │         HTTP Server (Axum)          │   │
         │                             │  │         Port 21890                   │   │
         ▼                             │  └─────────────────────────────────────┘   │
  ┌─────────────┐   Tab Events         │              │           │                 │
  │  Extension  │──────────────────────┼──────────────┤           │                 │
  │  Background │   POST /event        │              ▼           │                 │
  │             │                      │  ┌─────────────────┐     │                 │
  │             │   Tab + Screenshot   │  │    Storage      │     │                 │
  │             │──────────────────────┼─►│  (JSON files)   │     │                 │
  │             │   POST /capture      │  │                 │     │                 │
  │             │                      │  │  • tabs.json    │     │                 │
  │             │◄─────────────────────┼──│  • settings.json│     │                 │
  │             │   WebSocket commands │  │  • screenshots/ │     │                 │
  │             │   (close_tab, etc)   │  └────────┬────────┘     │                 │
  └─────────────┘                      │           │              │                 │
         ▲                             │           ▼              ▼                 │
         │                             │  ┌─────────────────────────────────────┐   │
  ┌──────┴──────┐                      │  │          AI Module                  │   │
  │   Content   │                      │  │   • Analyze tabs (suggest_tabs)     │   │
  │   Script    │                      │  │   • Generate report                 │   │
  │             │                      │  │   • OpenAI API calls                │   │
  │  Extracts   │                      │  └─────────────────────────────────────┘   │
  │  page text  │                      │                                            │
  └─────────────┘                      │              │                             │
                                       │              │ Tauri Events                │
                                       │              ▼                             │
                                       │  ┌─────────────────────────────────────┐   │
                                       │  │       TYPESCRIPT FRONTEND           │   │
                                       │  │                                     │   │
                                       │  │  ┌─────────┐  ┌─────────┐          │   │
                                       │  │  │  Tabs   │  │ History │          │   │
                                       │  │  │  View   │  │  View   │          │   │
                                       │  │  └─────────┘  └─────────┘          │   │
                                       │  │                                     │   │
                                       │  │  ┌─────────┐  ┌──────────┐         │   │
                                       │  │  │ Report  │  │ Settings │         │   │
                                       │  │  │  View   │  │   View   │         │   │
                                       │  │  └─────────┘  └──────────┘         │   │
                                       │  └─────────────────────────────────────┘   │
                                       └────────────────────────────────────────────┘
```

### Event Sequence Diagrams

#### 1. Tab Capture Flow

```
┌──────────┐     ┌───────────┐     ┌────────────┐     ┌─────────┐     ┌─────────┐
│  User    │     │ Extension │     │   Content  │     │ Desktop │     │ Storage │
│ Browser  │     │Background │     │   Script   │     │ Server  │     │  (Rust) │
└────┬─────┘     └─────┬─────┘     └──────┬─────┘     └────┬────┘     └────┬────┘
     │                 │                  │                │               │
     │ Switch to tab   │                  │                │               │
     │────────────────►│                  │                │               │
     │                 │                  │                │               │
     │                 │  Wait 3 seconds  │                │               │
     │                 │ ─ ─ ─ ─ ─ ─ ─ ─ ►│                │               │
     │                 │                  │                │               │
     │                 │ captureVisibleTab│                │               │
     │                 │◄─────────────────│                │               │
     │                 │                  │                │               │
     │                 │ Extract content  │                │               │
     │                 │─────────────────►│                │               │
     │                 │                  │                │               │
     │                 │     text content │                │               │
     │                 │◄─────────────────│                │               │
     │                 │                  │                │               │
     │                 │    POST /capture (tab + screenshot + text)        │
     │                 │─────────────────────────────────►│               │
     │                 │                  │                │               │
     │                 │                  │                │  Save to disk │
     │                 │                  │                │──────────────►│
     │                 │                  │                │               │
     │                 │                  │    emit "tab-captured"         │
     │                 │                  │                │◄──────────────│
     │                 │                  │                │               │
     └─────────────────┴──────────────────┴────────────────┴───────────────┘
```

#### 2. AI Analysis Flow

```
┌──────────┐     ┌──────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│   User   │     │ Frontend │     │  Tauri  │     │   AI    │     │ OpenAI  │
│          │     │    UI    │     │Commands │     │ Module  │     │   API   │
└────┬─────┘     └────┬─────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │                │                │               │               │
     │ Click Analyze  │                │               │               │
     │───────────────►│                │               │               │
     │                │                │               │               │
     │                │ invoke("analyze_batch", limit) │               │
     │                │───────────────►│               │               │
     │                │                │               │               │
     │                │                │ suggest_tabs()│               │
     │                │                │──────────────►│               │
     │                │                │               │               │
     │                │                │               │ POST /chat/completions
     │                │                │               │──────────────►│
     │                │                │               │               │
     │                │                │               │  JSON response│
     │                │                │               │◄──────────────│
     │                │                │               │               │
     │                │                │ TabSuggestions│               │
     │                │                │◄──────────────│               │
     │                │                │               │               │
     │                │  Updated tabs  │               │               │
     │                │◄───────────────│               │               │
     │                │                │               │               │
     │   Re-render UI │                │               │               │
     │◄───────────────│                │               │               │
     │                │                │               │               │
     └────────────────┴────────────────┴───────────────┴───────────────┘
```

---

## API Reference

### HTTP Endpoints (Port 21890)

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/health` | GET | Health check | - | `{ status, version }` |
| `/capture` | POST | Receive tab capture | `CapturePayload` | `200 OK` |
| `/event` | POST | Receive tab event | `TabEvent` | `200 OK` |
| `/sync` | POST | Sync tab IDs | `{ tab_ids: number[] }` | `200 OK` |
| `/screenshot/:filename` | GET | Serve screenshot | - | `image/jpeg` |
| `/ws` | WebSocket | Bidirectional commands | - | - |

### WebSocket Commands (Desktop → Extension)

| Command | Format | Description |
|---------|--------|-------------|
| `refresh_all` | `"refresh_all"` | Trigger extension to resync all tabs |
| `close_tab` | `"close_tab:{tabId}"` | Close specific Chrome tab |

### Tauri Commands (Frontend → Backend)

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `get_tabs` | - | `TabRecord[]` | Get all open tabs |
| `get_closed_tabs` | - | `TabRecord[]` | Get today's closed tabs |
| `get_settings` | - | `Settings` | Get user settings |
| `save_settings` | `Settings` | - | Save settings |
| `analyze_batch` | `limit: number` | `[TabRecord[], count]` | AI analyze unanalyzed tabs |
| `generate_report` | - | `DailyReport` | Generate daily summary |
| `close_tab` | `tab_id: number` | - | Close tab (Chrome + storage) |
| `mark_keep` | `tab_id: number` | - | Mark tab as "keep" |
| `clear_data` | - | - | Clear all data |
| `cleanup_old_tabs` | `days?: number` | `count` | Remove tabs older than N days |

---

## Data Models

### Core Types (TypeScript)

```typescript
// Tab data collected by extension
interface TabData {
  id: number;
  windowId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  createdAt: number;           // Unix timestamp (ms)
  lastActiveAt?: number;
  totalActiveMs: number;       // Accumulated active time
  isActive: boolean;
  discarded?: boolean;         // Chrome memory-saving state
}

// Complete tab record with AI analysis
interface TabRecord extends TabData {
  closedAt?: number;
  snapshot?: TabSnapshot;
  suggestion?: TabSuggestion;
}

// AI analysis result
interface TabSuggestion {
  decision: "keep" | "close" | "unsure";
  reason: string;
  category?: TabCategory;
  scoredAt: number;
}

// Tab categories for classification
type TabCategory = 
  | "work" | "research" | "communication" 
  | "entertainment" | "shopping" | "reference" | "utility";

// User settings
interface Settings {
  openaiApiKey?: string;
  baseUrl?: string;            // Custom API endpoint
  model?: string;              // e.g., "gpt-4o-mini"
  userContext?: string;        // Work context for AI
  analyzeBatchSize?: number;   // Tabs per analysis batch
}
```

### Rust Equivalents

Rust types mirror TypeScript with snake_case naming. Serde handles JSON serialization with camelCase for API compatibility:

```rust
#[derive(Serialize, Deserialize)]
pub struct TabRecord {
    pub id: i64,
    #[serde(rename = "windowId")]
    pub window_id: Option<i64>,
    // ... other fields
}
```

---

## Storage & Persistence

### File Locations

```
~/.local/share/tab-cleanser/        # Linux
~/Library/Application Support/tab-cleanser/  # macOS
%APPDATA%/tab-cleanser/             # Windows

├── tabs.json           # Tab records
├── settings.json       # User configuration
├── report.json         # Latest daily report
└── screenshots/        # JPEG screenshots
    ├── 12345_1705123456.jpg
    └── ...
```

### Data Retention

| Data Type | Retention Policy |
|-----------|------------------|
| Open tabs | Kept until closed |
| Closed tabs (today) | Kept for daily report |
| Closed tabs (old) | Auto-cleanup after 7 days |
| Screenshots (old closed tabs) | Deleted when tab removed |

### Screenshot Storage

- Format: JPEG (quality 80%)
- Filename: `{tabId}_{timestamp}.jpg`
- Compression: Done in extension before sending
- Cleanup: Old screenshots deleted automatically

---

## Configuration Constants

| Constant | Value | Location | Description |
|----------|-------|----------|-------------|
| `SERVER_PORT` | `21890` | `server.rs` | HTTP/WS server port |
| `SCREENSHOT_DELAY_MS` | `3000` | `config.ts` | Delay before capture |
| `SYNC_INTERVAL_MS` | `10000` | `config.ts` | State sync interval |
| `WS_RECONNECT_DELAY_MS` | `5000` | `config.ts` | WebSocket reconnect delay |
| `DEFAULT_BATCH_SIZE` | `30` | `storage.rs` | Default AI batch size |

---

## Security Considerations

1. **API Key Storage**: Stored locally in plain JSON (user's machine only)
2. **Network**: Only localhost communication (127.0.0.1)
3. **Screenshots**: Stored locally, never uploaded externally
4. **OpenAI API**: User provides their own key; data sent to OpenAI for analysis
5. **CORS**: Permissive for localhost only

---

## Performance Notes

- **Screenshot capture**: Throttled to avoid overwhelming Chrome
- **Batch analysis**: Configurable batch size to balance speed vs. token limits
- **File I/O**: Async (tokio) for non-blocking operations
- **WebSocket**: Single connection with reconnect logic
- **Memory**: Extension uses chrome.storage for persistence across restarts
