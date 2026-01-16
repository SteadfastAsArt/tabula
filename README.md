<!-- ═══════════════════════════════════════════════════════════════════════════════ -->
<!--                                   TABULA                                       -->
<!--                         AI-Powered Tab Intelligence                            -->
<!-- ═══════════════════════════════════════════════════════════════════════════════ -->

<div align="center">

<br>

```
████████╗ █████╗ ██████╗ ██╗   ██╗██╗      █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║   ██║██║     ██╔══██╗
   ██║   ███████║██████╔╝██║   ██║██║     ███████║
   ██║   ██╔══██║██╔══██╗██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██████╔╝╚██████╔╝███████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝
```

<br>

**Your AI-powered second brain for browser tabs**

*Analyze • Categorize • Declutter*

<br>

[Features](#-features) · [Quick Start](#-quick-start) · [How It Works](#-how-it-works) · [Configuration](#-configuration) · [Contributing](#-contributing)

<br>

---

<br>

</div>

## 🌟 What is Tabula?

**Tabula** uses GPT-4 to understand your browsing context and intelligently manage your tabs. It captures screenshots, tracks your activity, and suggests which tabs to keep or close — all while keeping your data completely private on your machine.

> *"Tabula rasa"* — a clean slate. That's what your browser deserves.

<br>

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 AI-Powered Analysis
GPT-4 analyzes your tabs based on:
- Content relevance to your work
- Time since last activity  
- Your personal context & goals

</td>
<td width="50%">

### 📸 Smart Capture
Auto-captures when you stay 3+ seconds:
- Page screenshots (JPEG)
- Text content extraction
- Favicon and metadata

</td>
</tr>
<tr>
<td width="50%">

### 📊 Daily Reports
AI-generated summaries including:
- Main themes of the day
- Completed work detection
- Suggested follow-ups

</td>
<td width="50%">

### 🔒 Privacy-First
Your data stays yours:
- 100% local storage
- Your own OpenAI API key
- No external servers

</td>
</tr>
</table>

<br>

### Tab Categories

| 🏢 Work | 🔬 Research | 💬 Communication | 🎮 Entertainment | 🛒 Shopping | 📚 Reference | ⚙️ Utility |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|

<br>

---

<br>

## 🚀 Quick Start

### Prerequisites

```
Node.js 18+  •  Rust  •  Chrome Browser
```

<details>
<summary><b>📦 Platform-specific setup</b></summary>

**macOS:**
```bash
xcode-select --install
```

**Ubuntu/Debian:**
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

**Windows:**
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

</details>

<br>

### Step 1: Chrome Extension

```bash
cd extension
npm install && npm run build
```

Then load in Chrome:

```
chrome://extensions → Developer mode → Load unpacked → Select extension/dist
```

<br>

### Step 2: Desktop App

```bash
cd desktop
npm install
npm run tauri dev      # Development
npm run tauri build    # Production
```

<br>

### Step 3: Configure

1. Open the desktop app → **Settings**
2. Enter your **OpenAI API key**
3. Add your work context *(optional but recommended)*
4. Save & start browsing!

<br>

---

<br>

## 🔄 How It Works

<div align="center">

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ┌─────────────────┐                    ┌─────────────────────────────┐   ║
║    │  CHROME         │                    │  TABULA DESKTOP             │   ║
║    │  ┌───────────┐  │    Screenshots     │  ┌─────────┐   ┌────────┐  │   ║
║    │  │ Extension │──┼───────────────────►│  │ Storage │──►│   AI   │  │   ║
║    │  │           │  │    Tab Events      │  └─────────┘   └────────┘  │   ║
║    │  │           │◄─┼────────────────────│       │                     │   ║
║    │  └───────────┘  │    Commands        │       ▼                     │   ║
║    │                 │                    │  ┌─────────────────────┐   │   ║
║    │                 │                    │  │    Dashboard UI     │   │   ║
║    └─────────────────┘                    │  └─────────────────────┘   │   ║
║                                           └─────────────────────────────┘   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

</div>

<br>

| Step | Action |
|:----:|--------|
| **1** | Extension monitors tab events (open, switch, close) |
| **2** | After 3s on a tab, captures screenshot + content |
| **3** | Data sent to local desktop app via HTTP |
| **4** | Desktop stores everything in local JSON files |
| **5** | On-demand AI analysis using your OpenAI key |
| **6** | WebSocket enables closing tabs from desktop |

<br>

---

<br>

## ⚙️ Configuration

### Settings

| Setting | Description | Default |
|---------|-------------|:-------:|
| **API Key** | Your OpenAI API key | *required* |
| **Base URL** | Custom endpoint (proxies) | `api.openai.com/v1` |
| **Model** | GPT model to use | `gpt-4o-mini` |
| **Batch Size** | Tabs per analysis batch | `30` |
| **User Context** | Your work context | — |

<br>

### 💡 User Context Example

```
I'm a software developer working on a React project.

KEEP: React, TypeScript, Node.js documentation, GitHub PRs
CLOSE: Social media idle >30min, news sites, shopping

IMPORTANT: tabula project, client-dashboard
```

<br>

---

<br>

## 🏗️ Architecture

```
tabula/
├── extension/              # Chrome Extension (MV3)
│   ├── src/
│   │   ├── background.ts       # Service worker
│   │   ├── content.ts          # DOM extraction
│   │   └── modules/            # Feature modules
│   └── manifest.json
│
├── desktop/                # Tauri Desktop App
│   ├── src/                    # Frontend (Vite + TS)
│   └── src-tauri/src/          # Backend (Rust)
│       ├── server.rs               # HTTP + WebSocket
│       ├── storage.rs              # Persistence
│       └── ai.rs                   # OpenAI integration
│
├── shared/                 # Shared TypeScript types
└── docs/
    └── ARCHITECTURE.md     # Full technical docs
```

> 📖 **[Read the full architecture documentation →](docs/ARCHITECTURE.md)**

<br>

---

<br>

## 📡 API Reference

Local server runs on port `21890`:

| Endpoint | Method | Description |
|----------|:------:|-------------|
| `/health` | `GET` | Health check |
| `/capture` | `POST` | Receive tab capture |
| `/event` | `POST` | Receive tab events |
| `/screenshot/:file` | `GET` | Serve screenshots |
| `/ws` | `WS` | Bidirectional commands |

<br>

---

<br>

## 🤝 Contributing

Contributions are welcome! See our **[Contributing Guide](CONTRIBUTING.md)**.

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/tabula.git

# Create branch
git checkout -b feature/your-feature

# Commit (conventional commits)
git commit -m "feat: add amazing feature"

# Push & PR
git push origin feature/your-feature
```

<br>

### Development

```bash
# Extension with hot reload
cd extension && npm run watch

# Desktop with hot reload  
cd desktop && npm run tauri dev
```

<br>

---

<br>

## 📄 License

MIT License — see **[LICENSE](LICENSE)** for details.

<br>

---

<br>

<div align="center">

### 🙏 Acknowledgments

**[Tauri](https://tauri.app)** · **[OpenAI](https://openai.com)** · **[Axum](https://github.com/tokio-rs/axum)**

<br>

---

<br>

<sub>

*Built for tab hoarders who dream of a clean browser*

**[⬆ Back to top](#)**

</sub>

</div>
