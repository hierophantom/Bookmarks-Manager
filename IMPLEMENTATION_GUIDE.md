# Universal Search Overlay (TES-13) - Implementation Guide

## Quick Start

This guide walks through the implementation of the Universal Search Overlay feature for the Bookmark Manager extension.

---

## Architecture Overview

The feature consists of four main components:

### 1. **Content Bridge** (`service-search-engine/content-bridge.js`)
- Injects the overlay UI into web pages
- Handles keyboard shortcut detection (Ctrl/Cmd+Shift+K)
- Manages overlay positioning and dragging
- Routes user input to the background service worker

**Key Class:** `OverlayManager`

### 2. **Result Aggregator** (`service-search-engine/result-aggregator.js`)
- Fetches results from 8 sources simultaneously
- Deduplicates and ranks results by relevance
- Handles caching for performance

**Key Class:** `ResultAggregator`

### 3. **Background Bridge** (`service-search-engine/bridge.js`)
- Listens for messages from content scripts
- Coordinates result aggregation
- Executes actions (open tab, bookmark, etc.)
- Manages configuration (search engine preference)

**Key Functions:**
- `handleSearch()` - Process search queries
- `handleExecuteResult()` - Execute selected result action
- `handleWebSearch()` - Perform web search with configured engine

### 4. **Manifest Configuration** (`manifest.json`)
- Declares required permissions
- Registers keyboard shortcut
- Configures content script injection

---

## Setup Instructions

### Step 1: Load the Extension

```bash
# 1. Navigate to chrome://extensions/
# 2. Enable "Developer mode" (top right)
# 3. Click "Load unpacked"
# 4. Select the bookmark-manager directory
```

### Step 2: Verify Installation

```bash
# Test the keyboard shortcut:
# Windows/Linux: Ctrl+Shift+K
# Mac: Cmd+Shift+K

# Expected behavior:
# - Overlay appears in center of screen
# - Input field is focused
# - Results show default actions, tabs, and recent history
```

### Step 3: Test Search Functionality

```bash
# 1. With overlay open, type in the search input
# 2. Results should appear in real-time
# 3. Use arrow keys to navigate results
# 4. Press Enter to select a result
# 5. Press Esc to close overlay
```

---

## API Reference

### OverlayManager

```javascript
// Methods
overlayManager.toggle()              // Toggle overlay visibility
overlayManager.open()                // Open overlay
overlayManager.close()               // Close overlay
overlayManager.handleSearch(query)   // Search with query
overlayManager.displayResults(results) // Display results
```

### ResultAggregator

```javascript
// Main method
const results = await aggregator.aggregateResults(query);
// Returns: { 'Category': [result1, result2, ...], ... }

// Individual search methods
await aggregator.searchBookmarks(query)
await aggregator.searchHistory(query)
await aggregator.searchTabs(query)
await aggregator.searchExtensions(query)
await aggregator.searchDownloads(query)
await aggregator.searchSettings(query)
await aggregator.searchFolders(query)
```

### Result Object Structure

```javascript
{
  id: "bookmark-123",                    // Unique identifier
  type: "bookmark|tab|history|action|extension|download|folder|setting",
  title: "Example Title",
  description: "https://example.com",
  icon: "https://favicon.url or emoji",
  metadata: {
    url: "https://example.com",
    bookmarkId: "123",                   // For bookmarks
    tabId: 456,                          // For tabs
    action: "open-bookmark|close-tab|etc"
  },
  rank: 0.85                             // Relevance score (0-1)
}
```

### Message Protocol

**From Content Script to Background:**
```javascript
// Search request
chrome.runtime.sendMessage({
  type: 'SEARCH',
  query: 'example'
}, (response) => {
  console.log(response.results); // Grouped results
});

// Execute result
chrome.runtime.sendMessage({
  type: 'EXECUTE_RESULT',
  resultId: 'bookmark-123',
  action: 'open-bookmark'
});

// Web search
chrome.runtime.sendMessage({
  type: 'WEB_SEARCH',
  query: 'search term'
});
```

---

## Configuration

### Search Engine Preference

Users can configure their preferred search engine via storage:

```javascript
// Set preference
await chrome.storage.sync.set({ searchEngine: 'google' | 'bing' | 'yahoo' });

// Get preference
const { searchEngine } = await chrome.storage.sync.get(['searchEngine']);
```

### Overlay Position

Position is automatically persisted:

```javascript
// Automatically saved when user drags overlay
await chrome.storage.sync.set({
  overlayPosition: { x: 100, y: 200 }
});
```

---

## Ranking Algorithm

Results are ranked by a weighted formula:

```
relevance_score = (title_match × 0.5) + (description_match × 0.3) + (recency × 0.2)

Title Match Weights:
- Exact match: 1.0
- Starts with query: 0.8
- Contains query: 0.5
- No match: 0.0

Description Match Weights:
- Starts with query: 0.4
- Contains query: 0.2
- No match: 0.0

Recency Bonus:
- < 1 hour: 0.15
- < 1 day: 0.10
- < 1 week: 0.05

Type Bonuses:
- Active tab: +0.15
- Bookmarked: +0.10
```

---

## Keyboard Navigation

```
ArrowUp/ArrowDown    - Navigate results
Enter                - Select result or perform web search
Esc                  - Close overlay
?                    - Show help panel
Cmd/Ctrl+Shift+K     - Toggle overlay
```

---

## Common Tasks

### Add a New Result Source

1. **Create a search function in `ResultAggregator`:**

```javascript
async searchMySource(query) {
  const results = await fetchMyResults(query);
  return results
    .map(item => this.createMySourceResult(item, query))
    .filter(r => this.matchesQuery(r, query));
}
```

2. **Add to `aggregateResults()`:**

```javascript
const myResults = await this.searchMySource(query);
if (myResults.length > 0) results['My Source'] = myResults;
```

3. **Create result object builder:**

```javascript
createMySourceResult(item, query) {
  return {
    id: `my-source-${item.id}`,
    type: 'my-source',
    title: item.name,
    description: item.description,
    icon: '🎯',
    metadata: { action: 'my-action', ...item },
    rank: 0
  };
}
```

### Add a New Action

1. **Handle in `executeGenericAction()`:**

```javascript
case 'my-action':
  // Perform action
  await doSomething(request.metadata);
  return true;
```

2. **Add to result metadata:**

```javascript
metadata: {
  action: 'my-action',
  // ... relevant data
}
```

### Customize Styling

Edit the CSS in `OverlayManager.injectStyles()`:

```javascript
// Modify overlay dimensions
.bm-overlay {
  width: 700px;        // Change from 600px
  max-height: 700px;   // Change from 600px
}

// Change colors
.bm-overlay-input:focus {
  border-color: #your-color;
  box-shadow: 0 0 0 3px rgba(your-color, 0.1);
}
```

---

## Performance Considerations

### Debouncing

Search requests are debounced by 100ms to avoid excessive API calls:

```javascript
// In handleSearch()
searchDebounceTimer = setTimeout(async () => {
  // Perform search after 100ms of no input
}, 100);
```

### Caching

The `ResultAggregator` includes a cache system (not yet implemented in this version):

```javascript
this.cache = {
  bookmarks: null,
  history: null,
  tabs: null,
  timestamp: 0
};
this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

### Limiting Results

Results are limited to 10 per category with "Show more" buttons:

```javascript
results.slice(0, 10)  // Limit to 10 items per category
```

---

## Debugging

### Enable Console Logging

In `content-bridge.js` and `bridge.js`, console.log messages are included for debugging:

```javascript
console.log('Overlay opened in tab:', sender.tab.id);
console.error('Search error:', error);
```

### Chrome DevTools

1. **For content script:** Right-click → Inspect → Console (filter by content script)
2. **For background service worker:** chrome://extensions/ → Click "Details" → "Service Worker"

### Test Messages

Send test messages from DevTools console:

```javascript
// Test search
chrome.runtime.sendMessage({
  type: 'SEARCH',
  query: 'test'
}, (response) => {
  console.log(response);
});
```

---

## Known Limitations & Future Improvements

### Current Limitations

1. **History Search**: Limited to last 30 days (configurable)
2. **Downloads**: Only shows recent downloads (last 100)
3. **Extensions**: Only shows enabled extensions
4. **Settings**: Limited set of Chrome settings (expandable)

### Planned Improvements

- [ ] Fuzzy matching for typo tolerance
- [ ] Custom command aliases (e.g., `:clear-tabs`)
- [ ] Plugin system for third-party integrations
- [ ] Advanced filtering (date range, domain, type)
- [ ] Recent searches history
- [ ] Search analytics

---

## Troubleshooting

### Overlay Not Appearing

```bash
# 1. Check if content script is injected
# - Open DevTools (F12)
# - Go to Console
# - Check for errors

# 2. Verify manifest.json content_scripts
# - Must have correct "matches" pattern

# 3. Reload extension
# - chrome://extensions/ → Click refresh icon
```

### Search Not Working

```bash
# 1. Check permissions in manifest.json
# - "permissions": ["history", "bookmarks", "tabs", "downloads", "management"]

# 2. Verify background.js is loaded
# - chrome://extensions/ → Details → Service Worker (should say "Inactive")

# 3. Check for Chrome API errors
# - DevTools → Service Worker console
```

### Overlay Position Not Persisting

```bash
# 1. Check chrome.storage.sync is working
# - Run in DevTools console:
chrome.storage.sync.get(['overlayPosition'], (result) => {
  console.log(result);
});

# 2. Verify sync is enabled
# - chrome://settings/privacy (ensure sync is on)
```

---

## Testing Checklist

- [ ] Keyboard shortcut opens overlay (Ctrl/Cmd+Shift+K)
- [ ] Input field is auto-focused
- [ ] Default actions visible before typing
- [ ] Search returns results in real-time
- [ ] Arrow keys navigate results
- [ ] Enter key selects result
- [ ] Esc key closes overlay
- [ ] Web search works (type query + Enter)
- [ ] Overlay position persists
- [ ] Different search engines work (Google, Bing, Yahoo)
- [ ] Results grouped by category
- [ ] "Show more" buttons work
- [ ] Results ranked by relevance

---

## Code Examples

### Example: Creating Custom Result

```javascript
const customResult = {
  id: 'custom-123',
  type: 'custom',
  title: 'My Custom Result',
  description: 'A description',
  icon: '🎯',
  metadata: {
    action: 'custom-action',
    customData: { /* ... */ }
  },
  rank: 0.75
};
```

### Example: Handling Custom Action

```javascript
// In bridge.js
case 'custom-action':
  console.log('Executing custom action', request.metadata);
  // Perform custom logic
  return true;
```

### Example: Filtering Results

```javascript
// In result-aggregator.js
const filtered = results.filter(r => {
  return r.type === 'bookmark' && r.metadata.url.includes('github');
});
```

---

## Resources

- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome APIs Documentation](https://developer.chrome.com/docs/extensions/reference/)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review console errors in DevTools
3. Check the [Architecture Document](./ARCHITECTURE.md)
4. Create an issue in the Linear project
