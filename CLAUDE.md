# Tabula

AI-powered browser tab manager - Chrome Extension + Tauri Desktop App

## Architecture

```
tabula/
├── extension/          # Chrome Extension (MV3, TypeScript)
│   └── src/
│       ├── background.ts    # Service worker
│       ├── content.ts       # Page content extraction
│       └── modules/         # Tab handlers, screenshot, websocket
│
├── desktop/            # Tauri Desktop App
│   ├── src/            # Frontend (TypeScript + Vite)
│   │   ├── main.ts
│   │   ├── views/      # TabsView, StatsView, SettingsView...
│   │   └── components/
│   └── src-tauri/src/  # Backend (Rust)
│       ├── main.rs     # Tauri commands
│       ├── server.rs   # HTTP + WebSocket server (Axum)
│       ├── storage.rs  # JSON file persistence
│       └── ai.rs       # OpenAI API integration
│
└── docs/               # Documentation
```

## Communication

- **Extension → Desktop:** HTTP POST to `localhost:21890` (`/capture`, `/event`, `/sync`)
- **Desktop → Extension:** WebSocket (`refresh_all`, `close_tab:{id}`)
- **Frontend → Backend:** Tauri invoke API

## Development

```bash
# Extension
cd extension && npm install && npm run watch

# Desktop
cd desktop && npm install && npm run tauri dev
```

## Preferences

- Commit messages: no Co-Authored-By
- Language: Chinese for communication, English for code/commits
