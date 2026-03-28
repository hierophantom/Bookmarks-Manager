# Universal Search Overlay (TES-13) - Architecture Document

## Overview

The Universal Search Overlay is a command palette-style interface that provides quick access to bookmarks, tabs, history, settings, and extension actions. It's injected as an overlay on the active tab and communicates with the background service worker to aggregate results from multiple Chrome APIs.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Browser                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐          ┌──────────────────────┐    │
│  │  Content Script      │          │  Web Page DOM        │    │
│  │  (bridge-inject.js)  │◄────────►│                      │    │
│  │                      │          │  ┌────────────────┐  │    │
│  │  • Injects Overlay   │          │  │ Overlay UI     │  │    │
│  │  • Listens to events │          │  │ (positioned)   │  │    │
│  │  • Handles keyboard  │          │  └────────────────┘  │    │
│  └──────────────────────┘          └──────────────────────┘    │
│           │                                                      │
│           │ chrome.runtime.sendMessage()                        │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │        Background Service Worker (background.js)     │       │
│  │                                                       │       │
│  │  • Aggregates search results from:                   │       │
│  │    - chrome.history API                             │       │
│  │    - chrome.tabs API                                │       │
│  │    - chrome.bookmarks API                           │       │
│  │    - chrome.management API (extensions)             │       │
│  │    - chrome.downloads API                           │       │
│  │    - Extension settings/actions                      │       │
│  │                                                       │       │
│  │  • Ranks and filters results                         │       │
│  │  • Executes actions (tab close, bookmark, etc.)     │       │
│  │  • Manages search engine configuration              │       │
│  └──────────────────────────────────────────────────────┘       │
│           ▲                                                      │
│           │ chrome.storage API                                  │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │        Chrome Storage (Persistent Data)              │       │
│  │                                                       │       │
│  │  • Overlay position (x, y)                           │       │
│  │  • User preferences (search engine, shortcuts)       │       │
│  │  • Cached recent searches                            │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. **Content Script** (`service-search-engine/content-bridge.js`)

**Responsibilities:**
- Inject overlay HTML into the DOM
- Listen for keyboard shortcuts
- Handle overlay positioning and dragging
- Relay messages between overlay UI and background service worker
- Manage overlay visibility state

**Key Functions:**
- `injectOverlay()` - Creates and inserts overlay into DOM
- `handleKeyboardShortcut(event)` - Detects Ctrl/Cmd+Shift+K
- `restoreOverlayPosition()` - Loads saved position from storage
- `handleOverlayDrag(event)` - Implements draggable overlay

---

### 2. **Overlay UI** (`service-search-engine/overlay/overlay.html` + `overlay.js`)

**Responsibilities:**
- Render input field and results list
- Handle keyboard navigation (Arrow Up/Down, Enter, Esc)
- Display results grouped by category
- Show "Show more" buttons for categories with many results
- Communicate user input to background service worker

**Key Components:**
- Input field (auto-focused)
- Results container with categories:
  - Extension Actions
  - Active Tabs
  - Bookmarks
  - History
  - Extensions
  - Downloads
- Each result displays icon, primary label, secondary label

---

### 3. **Background Service Worker** (`background.js` + `service-search-engine/bridge.js`)

**Responsibilities:**
- Listen for search queries from content script
- Aggregate results from 8 sources
- Rank results by relevance
- Execute actions (tab close, bookmark creation, etc.)
- Manage search engine preferences

**Result Aggregation Flow:**
```
Query received
    ↓
├─ Search History (title + URL match)
├─ Search Tabs (title + URL match)
├─ Search Bookmarks (title match)
├─ Search Folders (title match)
├─ Search Settings (keyword match)
├─ Search Extensions (name match)
├─ Search Downloads (filename match)
└─ Extension Actions (contextual)
    ↓
Merge & Deduplicate
    ↓
Rank by relevance (see ranking algorithm)
    ↓
Limit to 10 per category + "Show More" buttons
    ↓
Return results to overlay
```

---

## Data Structures

### Search Result Object

```javascript
{
  id: "unique-id",                    // For deduplication
  type: "bookmark|tab|history|action|setting|extension|download|folder",
  title: "Result Title",
  description: "Secondary info (URL, path, etc.)",
  icon: "url or data:image",
  metadata: {
    url: "https://example.com",       // For tabs, bookmarks, history
    bookmarkId: "123",                // For bookmarks
    tabId: 456,                       // For tabs
    extensionId: "abcdef...",         // For extensions
    downloadId: 789,                  // For downloads
    action: "close-tab|bookmark|remove-bookmark|toggle-setting"
  },
  rank: 0.85                          // Score for sorting
}
```

### Extension State Object

```javascript
{
  overlayOpen: false,
  selectedIndex: 0,
  query: "",
  results: [],
  overlayPosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  searchEngine: "google",             // "google" | "bing" | "yahoo"
  recentSearches: [],
  currentTabBookmarked: false
}
```

---

## Ranking Algorithm

Results are ranked by a multi-factor relevance score (0-1):

```
relevance_score = (title_match_weight × 0.5) +
                  (description_match_weight × 0.3) +
                  (recency_weight × 0.2)

title_match_weight = {
  1.0 if exact match
  0.8 if starts with query
  0.5 if contains query (substring)
  0.0 if no match
}

description_match_weight = {
  0.7 if URL/path starts with query
  0.4 if URL/path contains query
  0.0 if no match
}

recency_weight = {
  1.0 if last used < 1 hour
  0.8 if < 1 day
  0.6 if < 1 week
  0.4 if < 1 month
  0.2 if older
}

// Type-specific bonuses/penalties
active_tab_bonus: +0.15
bookmarked_bonus: +0.10
frequently_visited_penalty: -0.05 (to avoid cluttering results)
```

---

## Keyboard Navigation Flow

```
Overlay Opens (Esc or Cmd+Shift+K)
    ↓
Input field focused, suggestions shown
    ↓
┌─────────────────────────┐
│ User Presses Key        │
└─────────────────────────┘
    ↓
    ├─ ArrowDown: Move selection down (cycle to top if at bottom)
    ├─ ArrowUp: Move selection up (cycle to bottom if at top)
    ├─ Enter:
    │   ├─ If suggestion selected → Execute action
    │   └─ If no suggestion → Web search with query
    ├─ Esc: Close overlay
    ├─ Typing: Update results in real-time
    └─ Tab: (Optional) Jump to next category
```

---

## Extension Actions (Command Palette)

### Always Available (Before Typing)

1. **Close Current Tab** - `chrome.tabs.remove(activeTabId)`
2. **Close All Except Current** - `chrome.tabs.query()` then remove others
3. **Save Tab to Favorites** - Opens bookmark modal (if not already bookmarked)
4. **Remove from Favorites** - `chrome.bookmarks.remove(bookmarkId)` (if bookmarked)
5. **Open Settings** - Opens extension settings page
6. **View Bookmarks** - Opens main extension page

### Contextual Actions (Based on Query)

- "Open Downloads" - Shown when query matches "download", "downloads"
- "Open History" - Shown when query matches "history"
- "Open Settings" - Shown when query matches "settings"

---

## Configuration & Storage Schema

### chrome.storage.sync (Cross-Device)

```javascript
{
  overlayShortcut: "Ctrl+Shift+K",          // Default
  searchEngine: "google",                   // "google" | "bing" | "yahoo"
  overlayPosition: { x: 0, y: 0 },         // Persisted position
  recentSearches: [],                       // Last 10 searches
  resultsPerCategory: 10
}
```

### chrome.storage.local (Device-Specific)

```javascript
{
  overlayTheme: "dark",                     // Match extension theme
  categoryDefaults: {
    showExtensions: true,
    showDownloads: true,
    showSettings: true,
    showHistory: true
  }
}
```

---

## Manifest V3 Configuration

See [manifest.json updates](#manifest-updates) below.

Key additions:
- `host_permissions`: `<all_urls>` (for content script injection)
- `permissions`: `["tabs", "bookmarks", "history", "downloads", "management"]`
- `commands`: Keyboard shortcut registration
- `content_scripts`: Overlay injection
- `background.service_worker`: Background logic

---

## Edge Cases & UX Considerations

### 1. **Multiple Windows/Tabs**
- Overlay only appears on active tab
- Actions (close tab, etc.) target active tab
- Bookmarks shared across all windows

### 2. **Empty Results**
- Show "No results found" message
- Suggest opening history or bookmarks page
- Allow user to refine query

### 3. **Very Long Titles/URLs**
- Truncate with ellipsis
- Show full text on hover (title attribute)

### 4. **Large Number of Results**
- Limit to 10 per category
- Add "Show more X" button at bottom
- Clicking shows full list in new tab/modal

### 5. **Performance with Large History**
- Cache history results (update every session)
- Use debounce for real-time search (100ms)
- Limit history search to last 30 days by default

### 6. **Deduplication**
- Same URL bookmarked + in history = show once (prioritize bookmark)
- Same tab in multiple windows = show once

### 7. **Search Engine Configuration**
- User can set default search engine in settings
- Search URLs:
  - Google: `https://www.google.com/search?q={query}`
  - Bing: `https://www.bing.com/search?q={query}`
  - Yahoo: `https://search.yahoo.com/search?p={query}`

---

## Future Extensibility

### Plugin System (v2.0)
Allow third-party extensions to register custom actions/results:

```javascript
// Extension registers with search overlay
chrome.runtime.sendMessage(
  BOOKMARK_MANAGER_ID,
  { type: 'REGISTER_PLUGIN', plugin: {...} }
);
```

### Advanced Filtering (v2.0)
- Filter by date range: `after:2024-01-01`
- Filter by domain: `site:github.com`
- Filter by type: `type:bookmark`

### Fuzzy Search (v2.0)
- Implement fuzzy matching for typo tolerance
- Example: "gool" matches "Google"

### Command Aliases (v2.0)
- Allow users to create custom shortcuts
- Example: `:clear-tabs` → Close all except current

---

## Files to Create/Modify

```
service-search-engine/
├── bridge.js (NEW)                    # Message handling, result aggregation
├── search-ranker.js (NEW)             # Ranking algorithm
├── result-aggregator.js (NEW)         # Aggregates from multiple sources
├── content-bridge.js (NEW)            # Content script for injection
├── overlay/
│   ├── overlay.html (NEW)             # Overlay UI markup
│   ├── overlay.js (MODIFY)            # Add keyboard nav, state management
│   └── overlay.css (NEW)              # Overlay styling

manifest.json (MODIFY)                 # Add permissions, commands, content scripts
background.js (MODIFY)                 # Add message handlers
ARCHITECTURE.md (NEW)                  # This document
```

---

## Implementation Phases

### Phase 1: MVP (Week 1)
- Overlay injection + basic UI
- Keyboard shortcut registration
- Search bookmarks + active tabs
- Basic ranking

### Phase 2: Extended Results (Week 2)
- History search
- Downloads + Settings
- Extensions search
- "Show more" functionality

### Phase 3: Polish (Week 3)
- Performance optimization
- Position persistence
- Theme integration
- Drag-to-reposition
- Edge case handling

---

## Testing Strategy

- **Unit Tests**: Result ranking, deduplication logic
- **Integration Tests**: Message passing between content script and background
- **E2E Tests**: Keyboard navigation, overlay injection
- **Performance Tests**: Search latency with 10K+ bookmarks/history

