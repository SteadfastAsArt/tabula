# Tabula — Architecture

This document provides a technical overview of Tabula's architecture.

## Table of Contents

- [System Overview](#system-overview)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Module Breakdown](#module-breakdown)
- [Data Flow](#data-flow)
- [Configuration](#configuration)
- [Security](#security)

---

## System Overview

Tabula is a two-component system:

| Component | Role | Tech |
|-----------|------|------|
| **Chrome Extension** | Data collector — tracks tabs, captures screenshots & content | TypeScript, Chrome APIs |
| **Desktop App** | AI analysis engine — processes data, provides UI, stores state | Rust (Tauri) + TypeScript |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Tabula System                                 │
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

## Project Structure

```
tabula/
│
├── extension/                    # Chrome Extension (MV3)
│   ├── src/
│   │   ├── background.ts         # Service Worker entry point
│   │   ├── content.ts            # DOM content extraction
│   │   ├── popup.ts              # Extension popup UI
│   │   └── modules/
│   │       ├── config.ts         # Configuration constants
│   │       ├── state.ts          # chrome.storage state management
│   │       ├── handlers.ts       # Tab event handlers
│   │       ├── screenshot.ts     # Screenshot capture logic
│   │       ├── timer.ts          # Active time tracking
│   │       ├── server.ts         # HTTP client
│   │       ├── websocket.ts      # WebSocket client
│   │       ├── sync.ts           # Tab synchronization
│   │       ├── types.ts          # Type definitions
│   │       └── utils.ts          # Utility functions
│   └── manifest.json
│
├── desktop/                      # Tauri Desktop Application
│   ├── src/                      # Frontend (TypeScript + Vite)
│   │   ├── main.ts               # Entry point & event handlers
│   │   ├── api.ts                # Tauri invoke wrappers
│   │   ├── state.ts              # Frontend state
│   │   ├── types.ts              # Type definitions
│   │   ├── utils.ts              # Utility functions
│   │   ├── style.css             # Styles
│   │   ├── views/                # Page views
│   │   │   ├── TabsView.ts       # Main tab list (list/category/domain grouping)
│   │   │   ├── StatsView.ts      # Statistics dashboard
│   │   │   ├── HistoryView.ts    # Closed tabs history
│   │   │   ├── ReportView.ts     # AI daily report
│   │   │   └── SettingsView.ts   # Configuration
│   │   └── components/
│   │       ├── Sidebar.ts        # Navigation
│   │       └── TabCard.ts        # Tab display card
│   │
│   └── src-tauri/src/            # Backend (Rust)
│       ├── main.rs               # Tauri commands & setup
│       ├── server.rs             # HTTP + WebSocket server (Axum)
│       ├── storage.rs            # File-based persistence
│       └── ai.rs                 # OpenAI API integration
│
├── shared/                       # Shared TypeScript types
│   └── types.ts
│
└── docs/                         # Documentation
    ├── ARCHITECTURE.md           # This file
    ├── API.md                    # API reference
    └── DATA-MODELS.md            # Data structures
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
| Framework | **Tauri 2.0** | Lightweight native app |
| Backend | **Rust** | High-performance, memory-safe |
| Frontend | **TypeScript + Vite 6** | Modern frontend tooling |
| HTTP Server | **Axum 0.7** | Async Rust web framework |
| WebSocket | **tokio-tungstenite** | Bidirectional communication |
| AI | **OpenAI API** | GPT-4o-mini for analysis |
| Storage | **JSON files** | Simple file-based persistence |

### Key Dependencies

**Rust (Cargo.toml):**
```toml
tauri = "2"
axum = "0.7"
tokio = "1"
reqwest = "0.12"
serde = "1"
chrono = "0.4"
```

**TypeScript (package.json):**
```json
"@tauri-apps/api": "^2"
"vite": "^6"
"typescript": "^5.6"
```

---

## Module Breakdown

### Extension Modules

| Module | Responsibility |
|--------|----------------|
| **config** | Server URLs, timing constants |
| **state** | chrome.storage persistence |
| **handlers** | Tab lifecycle events (create/update/activate/remove) |
| **screenshot** | Capture visible tab, JPEG compression |
| **timer** | Track active time per tab |
| **server** | HTTP POST to desktop app |
| **websocket** | Receive commands from desktop |
| **sync** | Tab state synchronization |

### Desktop Backend (Rust)

| Module | Responsibility |
|--------|----------------|
| **main** | Tauri commands, app lifecycle |
| **server** | HTTP endpoints, WebSocket handler |
| **storage** | Tab records, settings, screenshots persistence |
| **ai** | OpenAI API calls, prompt engineering |

### Desktop Frontend Views

| View | Description |
|------|-------------|
| **Tabs** | Grid of open tabs with sorting and grouping |
| **Stats** | Statistics dashboard |
| **History** | Today's closed tabs |
| **Report** | AI-generated daily summary |
| **Settings** | API key, model, user context |

---

## Data Flow

### Tab Capture Flow

```
User stays on tab 3+ seconds
        │
        ▼
┌───────────────────┐
│    Extension      │
│  captureVisibleTab│
│  extractContent   │
└─────────┬─────────┘
          │ POST /capture
          ▼
┌───────────────────┐
│   Desktop Server  │
│  Save screenshot  │
│  Update TabRecord │
│  Emit event       │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   Frontend UI     │
│   Refresh view    │
└───────────────────┘
```

### AI Analysis Flow

```
User clicks "Analyze"
        │
        ▼
┌───────────────────┐
│   Frontend        │
│  invoke("analyze_│
│  batch", limit)   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   AI Module       │
│  Build prompt     │
│  + tab info       │
│  + screenshots    │
│  + user context   │
└─────────┬─────────┘
          │ POST /chat/completions
          ▼
┌───────────────────┐
│   OpenAI API      │
│   GPT-4o-mini     │
└─────────┬─────────┘
          │ JSON response
          ▼
┌───────────────────┐
│   Storage         │
│  Update tabs with │
│  suggestions      │
└───────────────────┘
```

---

## Configuration

### Constants

| Constant | Value | Location | Description |
|----------|-------|----------|-------------|
| `SERVER_PORT` | `21890` | server.rs | HTTP/WS server port |
| `SCREENSHOT_DELAY_MS` | `3000` | config.ts | Wait before capture |
| `SYNC_INTERVAL_MS` | `10000` | config.ts | State sync interval |
| `WS_RECONNECT_DELAY_MS` | `5000` | config.ts | WebSocket reconnect |
| `DEFAULT_BATCH_SIZE` | `30` | storage.rs | Default AI batch size |

### File Locations

| OS | Data Directory |
|----|----------------|
| macOS | `~/Library/Application Support/com.tabula.app/` |
| Linux | `~/.local/share/com.tabula.app/` |
| Windows | `%APPDATA%/com.tabula.app/` |

---

## Security

1. **API Key Storage**: Stored locally in plain JSON (user's machine only)
2. **Network**: Only localhost communication (127.0.0.1:21890)
3. **Screenshots**: Stored locally, never uploaded externally
4. **OpenAI API**: User provides their own key; data sent to OpenAI for analysis
5. **CORS**: Permissive for localhost only

---

## Performance Notes

- **Screenshot capture**: Throttled (3s delay) to avoid overwhelming Chrome
- **Batch analysis**: Configurable batch size to balance speed vs. token limits
- **File I/O**: Async (tokio) for non-blocking operations
- **WebSocket**: Single persistent connection with auto-reconnect
- **Extension state**: Uses chrome.storage.local for MV3 service worker persistence

---

## Related Documentation

- **[API Reference](API.md)** — HTTP endpoints, WebSocket commands, Tauri commands
- **[Data Models](DATA-MODELS.md)** — TypeScript/Rust types, storage format
