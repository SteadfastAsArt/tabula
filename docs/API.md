# Tabula — API Reference

This document describes the APIs used for communication between Tabula components.

## Table of Contents

- [HTTP Endpoints](#http-endpoints)
- [WebSocket Commands](#websocket-commands)
- [Tauri Commands](#tauri-commands)

---

## HTTP Endpoints

The desktop app runs an HTTP server on port `21890` for extension communication.

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

---

### Capture Tab

Receives tab data with screenshot and content.

```
POST /capture
Content-Type: application/json
```

**Request Body:**
```typescript
interface CapturePayload {
  tab: TabData;
  screenshotBase64?: string;  // Base64-encoded JPEG
  capturedAt: number;         // Unix timestamp (ms)
}
```

**Response:** `200 OK`

---

### Tab Event

Receives tab lifecycle events.

```
POST /event
Content-Type: application/json
```

**Request Body:**
```typescript
interface TabEvent {
  type: "created" | "updated" | "activated" | "removed";
  tab: TabData;
  timestamp: number;
}
```

**Response:** `200 OK`

---

### Sync Tabs

Synchronize tab IDs to clean up stale data.

```
POST /sync
Content-Type: application/json
```

**Request Body:**
```json
{
  "tab_ids": [12345, 67890, ...]
}
```

**Response:** `200 OK`

---

### Serve Screenshot

Returns a stored screenshot image.

```
GET /screenshot/:filename
```

**Parameters:**
- `filename`: Screenshot filename (e.g., `12345.jpg`)

**Response:** `image/jpeg` with `no-cache` headers

---

### WebSocket

Bidirectional communication channel.

```
WS /ws
```

See [WebSocket Commands](#websocket-commands) below.

---

## WebSocket Commands

Commands sent from Desktop → Extension via WebSocket.

| Command | Format | Description |
|---------|--------|-------------|
| **refresh_all** | `"refresh_all"` | Trigger extension to resync all tabs and capture screenshots |
| **close_tab** | `"close_tab:{tabId}"` | Close a specific Chrome tab |

### Example

```javascript
// Desktop sends
ws.send("close_tab:12345");

// Extension receives and closes tab ID 12345
chrome.tabs.remove(12345);
```

---

## Tauri Commands

Frontend → Backend commands via Tauri's invoke API.

### Tab Management

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `get_tabs` | — | `TabRecord[]` | Get all open tabs |
| `get_closed_tabs` | — | `TabRecord[]` | Get today's closed tabs |
| `close_tab` | `tab_id: number` | — | Close tab (Chrome + storage) |
| `mark_keep` | `tab_id: number` | — | Mark tab as "keep" |

### AI Analysis

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `analyze_tabs` | — | `TabRecord[]` | Analyze all open tabs |
| `analyze_batch` | `limit: number` | `[TabRecord[], count]` | Analyze up to N unanalyzed tabs |
| `generate_report` | — | `DailyReport` | Generate AI daily summary |

### Settings

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `get_settings` | — | `Settings` | Get user settings |
| `save_settings` | `settings: Settings` | — | Save settings |

### Data Management

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `clear_suggestions` | — | — | Clear all AI suggestions |
| `clear_data` | — | — | Clear all data |
| `cleanup_old_tabs` | `days?: number` | `count` | Remove closed tabs older than N days |
| `sync_tabs` | `chrome_tab_ids: number[]` | `count` | Sync with Chrome tab IDs |
| `get_storage_stats` | — | `[total, open, closed]` | Get storage statistics |

### Extension Control

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `trigger_refresh` | — | — | Send refresh command to extension |

---

## Usage Examples

### Frontend (TypeScript)

```typescript
import { invoke } from "@tauri-apps/api/core";

// Get all tabs
const tabs = await invoke<TabRecord[]>("get_tabs");

// Analyze unanalyzed tabs
const [updatedTabs, count] = await invoke<[TabRecord[], number]>(
  "analyze_batch", 
  { limit: 30 }
);

// Close a tab
await invoke("close_tab", { tabId: 12345 });

// Save settings
await invoke("save_settings", {
  settings: {
    openai_api_key: "sk-...",
    model: "gpt-4o-mini",
  }
});
```

### Extension (TypeScript)

```typescript
// Send tab event
await fetch("http://localhost:21890/event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "activated",
    tab: tabData,
    timestamp: Date.now(),
  }),
});

// WebSocket connection
const ws = new WebSocket("ws://localhost:21890/ws");
ws.onmessage = (event) => {
  const cmd = event.data;
  if (cmd === "refresh_all") {
    syncAllTabs();
  } else if (cmd.startsWith("close_tab:")) {
    const tabId = parseInt(cmd.split(":")[1]);
    chrome.tabs.remove(tabId);
  }
};
```
