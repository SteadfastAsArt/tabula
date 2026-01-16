# Shared Types

This directory contains TypeScript type definitions shared between the Chrome Extension and Desktop App.

## Usage

### In Extension

```typescript
import type { TabData, CapturePayload, TabEvent } from "../../shared/types";
```

### In Desktop App

```typescript
import type { TabRecord, Settings, DailyReport } from "../../shared/types";
```

## Types Overview

| Type | Description | Used By |
|------|-------------|---------|
| `TabData` | Core tab data with tracking metadata | Extension, Desktop |
| `CapturePayload` | Tab capture with screenshot and text | Extension → Desktop |
| `TabEvent` | Tab lifecycle events | Extension → Desktop |
| `TabRecord` | Complete tab record with snapshot and suggestion | Desktop |
| `TabSuggestion` | AI analysis result | Desktop |
| `Settings` | User configuration | Desktop |
| `DailyReport` | Generated browsing report | Desktop |
| `StoredState` | Extension persistent state | Extension |

## Note

The Desktop backend (Rust) has its own type definitions in `storage.rs` that mirror these TypeScript types. When modifying shared types, ensure both are updated:

- TypeScript: `shared/types.ts`
- Rust: `desktop/src-tauri/src/storage.rs`

The field naming conventions differ:
- TypeScript: camelCase (`createdAt`, `totalActiveMs`)
- Rust/Serde: snake_case (`created_at`, `total_active_ms`)

The Rust backend uses `#[serde(rename = "camelCase")]` for JSON serialization to maintain compatibility.
