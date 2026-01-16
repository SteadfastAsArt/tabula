<p align="center">
  <img src="extension/icons/icon-128.png" alt="Tab Cleanser Logo" width="80" height="80">
</p>

<h1 align="center">Tab Cleanser</h1>

<p align="center">
  <strong>AI-powered browser tab management</strong><br>
  Automatically analyze, categorize, and clean up your Chrome tabs with GPT-4
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Tab Analysis** | GPT-4 analyzes your tabs and suggests which to keep or close |
| 📸 **Smart Screenshots** | Auto-captures tab screenshots when you stay 3+ seconds |
| ⏱️ **Activity Tracking** | Tracks time spent on each tab |
| 📊 **Daily Reports** | AI-generated summaries of your browsing activity |
| 🏷️ **Auto-Categorization** | Classifies tabs: work, research, entertainment, etc. |
| 🔒 **Privacy-First** | All data stays on your machine; you use your own OpenAI key |

<p align="center">
  <img src="docs/screenshot-tabs.png" alt="Tab Cleanser Screenshot" width="800">
</p>

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Rust** (for Tauri): [Install Rust](https://www.rust-lang.org/tools/install)
- **Tauri prerequisites**: [Platform-specific setup](https://tauri.app/start/prerequisites/)
- **Chrome Browser**

### 1. Build the Chrome Extension

```bash
cd extension
npm install
npm run build
```

Load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder

### 2. Build and Run the Desktop App

```bash
cd desktop
npm install
npm run tauri dev    # Development mode
```

For production build:
```bash
npm run tauri build
```

### 3. Configure

1. Open the desktop app
2. Go to **Settings**
3. Enter your **OpenAI API key**
4. (Optional) Add your work context to improve AI suggestions
5. Click **Save**

---

## 🔄 How It Works

```
┌─────────────────┐         ┌────────────────────────────────────────┐
│  Chrome Browser │         │          Desktop App (Tauri)           │
│                 │         │                                        │
│  ┌───────────┐  │   HTTP  │  ┌──────────┐  ┌─────────┐  ┌──────┐  │
│  │ Extension │──┼────────►│  │  Server  │─►│ Storage │─►│  AI  │  │
│  │           │◄─┼─WebSocket│  └──────────┘  └─────────┘  └──────┘  │
│  └───────────┘  │         │                      │                │
│                 │         │              ┌───────▼───────┐        │
│                 │         │              │   Frontend    │        │
│                 │         │              │   (Web UI)    │        │
└─────────────────┘         └──────────────┴───────────────┴────────┘
```

1. **Extension tracks** tab events (open, switch, close)
2. **Auto-captures** screenshots + page content after 3s on a tab
3. **Sends data** to local desktop app via HTTP
4. **Desktop stores** everything locally in JSON files
5. **AI analyzes** tabs on demand using your OpenAI API key
6. **WebSocket** allows desktop to send commands back (close tabs)

---

## ⚙️ Configuration

### Settings Panel

| Setting | Description | Default |
|---------|-------------|---------|
| **OpenAI API Key** | Your API key for GPT-4 | Required |
| **Base URL** | Custom API endpoint (for proxies) | `https://api.openai.com/v1` |
| **Model** | OpenAI model to use | `gpt-4o-mini` |
| **Batch Size** | Tabs to analyze per batch | `30` |
| **User Context** | Your work context for better AI suggestions | - |

### User Context Example

```
I'm a software developer working on a React project.
Keep tabs related to: React, TypeScript, Node.js documentation
Close tabs: social media, news sites idle for >30min
Important projects: tab-cleanser, my-portfolio
```

---

## 🏗️ Project Structure

```
tab_cleanser/
├── extension/          # Chrome Extension (TypeScript)
│   ├── src/
│   │   ├── background.ts    # Service worker
│   │   ├── content.ts       # Content extraction
│   │   └── modules/         # Feature modules
│   └── manifest.json
│
├── desktop/            # Tauri Desktop App
│   ├── src/            # Frontend (TypeScript + Vite)
│   │   ├── views/      # UI pages
│   │   └── components/ # UI components
│   └── src-tauri/src/  # Backend (Rust)
│       ├── server.rs   # HTTP + WebSocket server
│       ├── storage.rs  # Data persistence
│       └── ai.rs       # OpenAI integration
│
├── shared/             # Shared TypeScript types
└── docs/               # Documentation
```

> 📖 See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed technical documentation.

---

## 📡 API Endpoints

The desktop app runs a local server on port `21890`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/capture` | POST | Receive tab capture |
| `/event` | POST | Receive tab events |
| `/screenshot/:filename` | GET | Serve screenshots |
| `/ws` | WebSocket | Bidirectional commands |

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/tab-cleanser.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

### Development

```bash
# Extension (with watch mode)
cd extension && npm run watch

# Desktop (with hot reload)
cd desktop && npm run tauri dev
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Desktop app framework
- [OpenAI](https://openai.com/) - AI analysis
- [Axum](https://github.com/tokio-rs/axum) - Rust web framework

---

<p align="center">
  <sub>Built with ❤️ for tab hoarders everywhere</sub>
</p>
