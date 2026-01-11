# Bookmark Manager Chrome Extension

A modern, feature-rich bookmark management extension for Chrome with theming, tagging, search overlay, and customizable new tab page.

## ✨ Features

- **📚 Bookmark Explorer** - Browse, organize, and manage your bookmarks with drag-and-drop
- **🏷️ Tag System** - Tag bookmarks for better organization and filtering
- **🔍 Universal Search** - Quick search overlay (Cmd/Ctrl+Shift+E) for bookmarks, tabs, history, and more
- **🎨 8 Vibrant Themes** - Slack-inspired color themes (Electric Blue, Jazzy Yellow, Neon Pink, etc.)
- **🖼️ Custom Backgrounds** - Solid colors, uploaded images, or Unsplash integration
- **📊 Tab Groups** - View and manage browser tab groups
- **🏠 Custom New Tab** - Beautiful homepage with widgets, bookmarks, and daily quotes
- **💾 Undo/Redo** - Easily undo deletions and changes

## 🚀 Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the project folder

## 📖 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes
- [.github/docs/](/.github/docs/) - Technical specs and debug docs

## 🗺️ Roadmap & Tasks

Feature development is tracked in [Linear](https://linear.app/test-lior). Recent features added:
- 11+ planned features converted to Linear issues
- Priority-based task management
- Detailed implementation specs per feature

## 🛠️ Development

```bash
# Load extension in Chrome
chrome://extensions -> Load unpacked

# View background service worker logs
chrome://extensions -> Service worker (inspect views)

# View content script logs
Open DevTools on any webpage
```

## 📂 Project Structure

```
bookmark-manager-main/
├── core/                      # Main UI (new tab page)
├── services/                  # Business logic (bookmarks, tags, themes)
├── utils/                     # Reusable utilities (modals, storage)
├── service-search-engine/     # Search overlay system
├── modals/                    # Modal components
└── content/                   # Content scripts
```

## 🎯 Version

**Current:** v0.2.0

## 📄 License

See LICENSE file for details.
