# Universal Search Engine

A comprehensive search overlay system for Chrome extensions that provides instant access to bookmarks, history, open tabs, downloads, extensions, Chrome settings, and more.

## Features

### Search Sources
- **Bookmarks** - Search your saved bookmarks
- **History** - Search browsing history (5 most recent shown by default)
- **Open Tabs** - Find and switch between open tabs
- **Downloads** - Search downloaded files
- **Extensions** - Search installed extensions with quick links
- **Chrome Settings** - Quick access to Chrome settings pages
- **Calculator** - Math expressions (e.g., `2+2`, `(10*5)/2`)

### Keyboard Shortcuts
- `Cmd+Shift+E` (Mac) / `Ctrl+Shift+E` (Windows/Linux) - Toggle search overlay

### Actions
Available context-aware actions:
- **New Tab** - Open a new tab
- **New Window** - Open a new window
- **Close Tab** - Close current tab (available when on a webpage)
- **Add to Favorites** - Bookmark current page (appears when not bookmarked)
- **Remove from Favorites** - Remove bookmark (appears when already bookmarked)
- **Web Search** - Search the web for entered query

### Zero State
When opening the overlay with empty search, displays:
- Available actions
- Current open tabs
- 5 most recent history items

### Result Truncation
Results are limited to 5 items per category with "show more" buttons linking to:
- History → `chrome://history`
- Downloads → `chrome://downloads`
- Bookmarks → `chrome://bookmarks`
- Extensions → `chrome://extensions`
- Chrome Settings → `chrome://settings`

## Architecture

### Components

#### `shared/search-engine.js`
Core search engine used by both overlays:
- Aggregates results from all sources
- Executes actions via Chrome APIs
- Provides context-aware action generation
- Safe math expression evaluator (CSP compliant)

#### `main-overlay/overlay.js`
Search overlay for the new tab page (`core/main.html`):
- Standalone implementation
- Direct access to all Chrome APIs
- Keyboard navigation support
- Mouse hover selection

#### `content-overlay/overlay.js`
Search overlay for regular HTTP/HTTPS pages:
- Injected as content script
- Communicates with background service worker for restricted operations
- Handles local result execution (opening URLs, switching tabs)
- Routes actions through background for execution

#### `bridge.js`
Background service worker:
- Routes search requests from content scripts
- Executes actions (bookmarking, tab management, web search)
- Enriches tab data from content script requests
- Manages result execution

### Data Flow

#### Search Flow
1. User types in overlay input
2. Request sent to background (content overlay) or handled locally (main overlay)
3. SearchEngine aggregates results from:
   - `searchBookmarks(query)`
   - `searchHistory(query)`
   - `searchTabs(query)`
   - `searchDownloads(query)`
   - `searchChromeSettings(query)`
   - `searchExtensions(query)`
   - `evaluateCalculator(query)`
   - `getActions(query, context)`
4. Results grouped by category and returned

#### Execution Flow
1. User selects result
2. Result type determines execution path:
   - **Calculator** → Copy to clipboard
   - **Action** → Execute via `executeAction()`
   - **Tab** → Switch and focus window
   - **HTTP URLs** → Open in new tab (content overlay only)
   - **Chrome URLs** → Route through background
3. Overlay closes on success

## Implementation Details

### Keyboard Navigation
- Arrow keys (up/down) - Navigate results
- Enter - Select highlighted result
- Escape - Close overlay
- Show-more buttons included in navigation cycle

### Event Delegation
Results use event delegation with `.closest()` for efficient click handling:
- Single listener on modal element
- Checks for both result items and show-more buttons
- Proper handling of nested HTML structure

### Content Security Policy
- Calculator uses safe tokenizer/parser (no `eval()`)
- No `unsafe-eval` required
- Compatible with strict CSP directives

### Metadata Handling
Action items include metadata context:
- `url` - Current page URL (for bookmarking)
- `title` - Current page title
- `tabId` - Current tab ID
- Passed separately to execution to avoid type confusion

## File Structure

```
service-search-engine/
├── bridge.js                 # Background service worker
├── shared/
│   ├── search-engine.js      # Core search logic
│   └── math.min.js           # Math.js library (optional)
├── main-overlay/
│   └── overlay.js            # New tab page overlay
├── content-overlay/
│   └── overlay.js            # HTTP page overlay
└── README.md
```

## Testing

### On New Tab Page (`core/main.html`)
1. Press Cmd+Shift+E
2. Type to search bookmarks, history, tabs
3. Test actions (New Tab, Close Tab, Add to Favorites)
4. Test math: type `2+2`, `(10*5)/2`

### On HTTP Pages
1. Navigate to any HTTP/HTTPS website
2. Press Cmd+Shift+E
3. Verify overlay appears
4. Test all search sources
5. Test "Add to Favorites" action
6. Verify results execute correctly

## Future Improvements
- Advanced math.js functions (when loaded in service worker context)
- Custom search filters
- Bookmark folder navigation
- Search history/suggestions
- Customizable keyboard shortcuts
