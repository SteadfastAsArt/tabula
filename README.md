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

[Features](#-features) · [Installation](#-installation) · [Usage](#-usage) · [Configuration](#-configuration) · [Documentation](#-documentation)

<br>

---

<br>

</div>

## 🌟 What is Tabula?

**Tabula** uses AI to understand your browsing context and intelligently manage your tabs. It captures screenshots, extracts page content, tracks your activity, and suggests which tabs to keep or close — all while keeping your data completely private on your machine.

> *"Tabula rasa"* — a clean slate. That's what your browser deserves.

<br>

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 AI-Powered Analysis
GPT-4 analyzes your tabs based on:
- Page content and metadata
- Time since last activity  
- Your personal work context

</td>
<td width="50%">

### 📸 Smart Capture
Auto-captures when you stay 3+ seconds:
- Page screenshots (JPEG)
- Rich content extraction (meta, headings, text)
- Favicon and metadata

</td>
</tr>
<tr>
<td width="50%">

### 📊 Daily Reports
AI-generated summaries including:
- Main themes of the day
- Key activities and progress
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

### 🗂️ Smart Organization

| View Mode | Description |
|-----------|-------------|
| **📋 List View** | Sort by last active, age, title, active time |
| **📁 Category** | Group by AI-detected category (Work, Research, Entertainment...) |
| **🌐 Domain** | Group by website domain |

All group views are **collapsible** — click headers to expand/collapse.

<br>

### 🏷️ Tab Categories

| 💼 Work | 📚 Research | 💬 Communication | 🎮 Entertainment | 🛒 Shopping | 📌 Reference | ⚙️ Utility |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|

<br>

---

<br>

## 🚀 Installation

### Prerequisites

- **Node.js 18+**
- **Rust** (for building desktop app)
- **Chrome Browser**

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

### Step 1: Install Chrome Extension

```bash
cd extension
npm install
npm run build
```

Then load in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/dist` folder

<br>

### Step 2: Install Desktop App

```bash
cd desktop
npm install
npm run tauri dev      # For development
npm run tauri build    # For production build
```

<br>

### Step 3: Configure

1. Open the desktop app
2. Go to **Settings**
3. Enter your **OpenAI API key**
4. (Optional) Add your work context for better AI suggestions
5. Save and start browsing!

<br>

---

<br>

## 📖 Usage

### Main Dashboard

The **Tabs** view shows all your open tabs with:
- Screenshot preview (if captured)
- AI suggestion (Keep/Close/Unsure)
- Category badge
- Active time tracking

### Actions

| Button | Action |
|--------|--------|
| **Analyze Next N** | Run AI analysis on unanalyzed tabs |
| **Refresh** | Sync with Chrome and capture new screenshots |
| **Reset** | Clear all AI suggestions to re-analyze |

### Tab Actions

- **✓ Keep** — Mark tab as important (won't suggest closing)
- **✕ Close** — Close tab in Chrome and archive it

### Group Views

Switch between viewing modes:
- **None** — Flat list with sorting and pagination
- **Category** — Grouped by AI category (collapsible)
- **Domain** — Grouped by website (collapsible)

<br>

---

<br>

## ⚙️ Configuration

### Settings

| Setting | Description | Default |
|---------|-------------|:-------:|
| **API Key** | Your OpenAI API key | *required* |
| **Base URL** | Custom API endpoint (for proxies) | `api.openai.com/v1` |
| **Model** | GPT model to use | `gpt-4o-mini` |
| **Batch Size** | Tabs to analyze per batch | `30` |
| **User Context** | Your work description for AI | — |

<br>

### 💡 User Context Example

The user context helps AI understand what's important to you:

```
I'm a software developer working on a React project.

KEEP: React, TypeScript, Node.js documentation, GitHub PRs
CLOSE: Social media idle >30min, news sites, shopping

IMPORTANT: tabula project, client-dashboard
```

<br>

---

<br>

## 📚 Documentation

For technical details, see the docs folder:

| Document | Description |
|----------|-------------|
| **[Architecture](docs/ARCHITECTURE.md)** | System overview, tech stack, module breakdown |
| **[API Reference](docs/API.md)** | HTTP endpoints, WebSocket commands, Tauri commands |
| **[Data Models](docs/DATA-MODELS.md)** | TypeScript/Rust type definitions, storage format |

<br>

---

<br>

## 🤝 Contributing

Contributions are welcome! See our **[Contributing Guide](CONTRIBUTING.md)**.

```bash
# Clone
git clone https://github.com/SteadfastAsArt/tabula.git

# Development
cd extension && npm run watch    # Extension with hot reload
cd desktop && npm run tauri dev  # Desktop with hot reload
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
