# Tabula — Data Models

This document describes the data structures used throughout Tabula.

## Table of Contents

- [Core Types](#core-types)
- [AI Types](#ai-types)
- [Settings](#settings)
- [Storage Format](#storage-format)
- [Rust Equivalents](#rust-equivalents)

---

## Core Types

### TabData

Base tab information collected by the extension.

```typescript
interface TabData {
  id: number;                    // Chrome tab ID
  windowId?: number;             // Chrome window ID
  url?: string;                  // Page URL
  title?: string;                // Page title
  favIconUrl?: string;           // Favicon URL
  createdAt: number;             // Creation timestamp (ms)
  lastActiveAt?: number;         // Last active timestamp (ms)
  totalActiveMs: number;         // Accumulated active time (ms)
  isActive: boolean;             // Currently active tab
  closedAt?: number;             // Close timestamp (if closed)
  discarded?: boolean;           // Chrome memory-saving state
  lastScreenshotAt?: number;     // Last screenshot timestamp
  description?: string;          // Rich content description (max 8000 words)
}
```

### TabRecord

Complete tab record stored in the desktop app (extends TabData).

```typescript
interface TabRecord {
  id: number;
  window_id?: number;
  url?: string;
  title?: string;
  fav_icon_url?: string;
  created_at: number;
  last_active_at?: number;
  total_active_ms: number;
  is_active: boolean;
  closed_at?: number;
  description?: string;          // Rich content from page meta/headings/content
  snapshot?: TabSnapshot;        // Screenshot info
  suggestion?: TabSuggestion;    // AI analysis result
}
```

### TabSnapshot

Screenshot capture information.

```typescript
interface TabSnapshot {
  screenshot_path?: string;      // Local file path to JPEG
  captured_at: number;           // Capture timestamp (ms)
}
```

---

## AI Types

### TabSuggestion

AI analysis result for a tab.

```typescript
interface TabSuggestion {
  decision: "keep" | "close" | "unsure";
  reason: string;                // Brief explanation
  category?: TabCategory;        // Detected category
  scored_at: number;             // Analysis timestamp (ms)
}
```

### TabCategory

Tab classification categories.

```typescript
type TabCategory =
  | "work"           // 💼 Work-related tasks, projects
  | "research"       // 📚 Learning, tutorials, documentation
  | "communication"  // 💬 Email, chat, social media
  | "entertainment"  // 🎮 Videos, games, news
  | "shopping"       // 🛒 E-commerce, product research
  | "reference"      // 📌 Bookmarked pages, tools
  | "utility"        // ⚙️ Settings, admin panels
  | "uncategorized"; // 📋 Default
```

### DailyReport

AI-generated daily summary.

```typescript
interface DailyReport {
  date: string;          // "YYYY-MM-DD"
  content: string;       // Markdown report content
  generated_at: number;  // Generation timestamp (ms)
}
```

---

## Settings

User configuration.

```typescript
interface Settings {
  openai_api_key?: string;       // OpenAI API key
  base_url?: string;             // Custom API endpoint (default: api.openai.com/v1)
  model?: string;                // Model name (default: gpt-4o-mini)
  user_context?: string;         // User's work context for AI
  analyze_batch_size?: number;   // Tabs per batch (default: 30)
}
```

---

## Storage Format

### File Locations

| OS | Path |
|----|------|
| **macOS** | `~/Library/Application Support/com.tabula.app/` |
| **Linux** | `~/.local/share/com.tabula.app/` |
| **Windows** | `%APPDATA%/com.tabula.app/` |

### Directory Structure

```
com.tabula.app/
├── tabs.json           # All tab records (HashMap<id, TabRecord>)
├── settings.json       # User settings
├── report.json         # Latest daily report
└── screenshots/        # JPEG screenshots
    ├── 12345.jpg       # Named by tab ID
    ├── 67890.jpg
    └── ...
```

### tabs.json Example

```json
{
  "12345": {
    "id": 12345,
    "window_id": 1,
    "url": "https://github.com/example/repo",
    "title": "GitHub - example/repo",
    "fav_icon_url": "https://github.githubassets.com/favicons/favicon.svg",
    "created_at": 1705500000000,
    "last_active_at": 1705550000000,
    "total_active_ms": 120000,
    "is_active": false,
    "closed_at": null,
    "description": "[GitHub] | Build software better, together | ## Code • Issues • Pull requests | ...",
    "snapshot": {
      "screenshot_path": "/Users/.../screenshots/12345.jpg",
      "captured_at": 1705540000000
    },
    "suggestion": {
      "decision": "keep",
      "reason": "Active development repository",
      "category": "work",
      "scored_at": 1705545000000
    }
  }
}
```

### settings.json Example

```json
{
  "openai_api_key": "sk-...",
  "base_url": "https://api.openai.com/v1",
  "model": "gpt-4o-mini",
  "user_context": "I'm a software developer working on React projects.",
  "analyze_batch_size": 30
}
```

---

## Rust Equivalents

Rust types mirror TypeScript with snake_case naming. Serde handles JSON serialization:

```rust
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
    pub description: Option<String>,
    pub snapshot: Option<TabSnapshot>,
    pub suggestion: Option<TabSuggestion>,
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
    pub scored_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub openai_api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub user_context: Option<String>,
    pub analyze_batch_size: Option<u32>,
}
```

---

## Description Field

The `description` field contains rich content extracted from web pages:

### Extraction Priority

1. **meta description** — Page's meta description tag
2. **og:description** — Open Graph description
3. **og:site_name** — Site name (wrapped in brackets)
4. **Headings** — h1/h2 tags (joined with •)
5. **Main content** — Article/main element text

### Format Example

```
[GitHub] | Build and ship software on a single, collaborative platform | ## Code • Issues • Pull requests | GitHub is where over 100 million developers shape the future of software...
```

### Limits

- Maximum **8000 words**
- Extracted on page load (`status === "complete"`)
- Updated on page navigation

---

## Data Retention

| Data Type | Retention |
|-----------|-----------|
| Open tabs | Until closed |
| Closed tabs (today) | Kept for daily report |
| Closed tabs (old) | Auto-cleanup after 7 days |
| Screenshots | Deleted when tab is removed or cleaned up |
