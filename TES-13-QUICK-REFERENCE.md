# TES-13 Quick Reference Card

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+Shift+K** | Toggle overlay (Windows/Linux) |
| **Cmd+Shift+K** | Toggle overlay (Mac) |
| **↑ / ↓** | Navigate results (cycles) |
| **Enter** | Execute selected result or web search |
| **Esc** | Close overlay |
| **?** | Show help panel |

---

## Result Types

| Type | Source | Action |
|------|--------|--------|
| 📄 Bookmark | `chrome.bookmarks` | Open in current tab |
| 🗂️ Folder | `chrome.bookmarks` | Open all bookmarks |
| 📜 History | `chrome.history` | Open in current tab |
| 📑 Tab | `chrome.tabs` | Focus tab |
| ⚙️ Setting | Chrome Settings | Open settings page |
| 🧩 Extension | `chrome.management` | Open extension page |
| 📥 Download | `chrome.downloads` | Show in folder |
| ⭐ Action | Custom | Execute action |

---

## Default Actions (Before Typing)

1. **Close Current Tab** - Closes active tab
2. **Close All Except Current** - Closes other tabs
3. **Save to Favorites** - Bookmark current tab (if not already)
4. **Remove from Favorites** - Delete bookmark (if exists)
5. **Open Settings** - Open extension settings

---

## Search Examples

```
# Find bookmarks
"github"
"stripe"
"documentation"

# Find recent pages
"wikipedia"
"stack overflow"
"medium"

# Find open tabs
"gmail"
"slack"
"notion"

# Find settings
"clear data"
"privacy"
"extensions"

# Web search (type + enter, no selection)
"weather today"
"recipe for pasta"
"javascript array methods"
```

---

## Configuration

### Set Search Engine
```javascript
// Options: "google" | "bing" | "yahoo"
chrome.storage.sync.set({ searchEngine: "google" });
```

### Get Overlay Position
```javascript
chrome.storage.sync.get(['overlayPosition'], (result) => {
  console.log(result.overlayPosition); // { x: 100, y: 200 }
});
```

---

## Ranking Factors

Results ranked by:
1. **Title match** (50% weight)
   - Exact match: 1.0
   - Starts with: 0.8
   - Contains: 0.5

2. **URL/Description match** (30% weight)
   - Starts with: 0.4
   - Contains: 0.2

3. **Recency** (20% weight)
   - < 1 hour: 0.15
   - < 1 day: 0.10
   - < 1 week: 0.05

4. **Type bonuses**
   - Active tab: +0.15
   - Bookmark: +0.10

---

## File Quick Reference

| File | Purpose | Key Classes |
|------|---------|-------------|
| **content-bridge.js** | UI & keyboard handling | `OverlayManager` |
| **result-aggregator.js** | Data fetching & ranking | `ResultAggregator` |
| **bridge.js** | Message routing & actions | `handleSearchMessage()` |
| **manifest.json** | Extension config | Permissions, shortcuts |
| **ARCHITECTURE.md** | Technical specification | Full system design |
| **IMPLEMENTATION_GUIDE.md** | Step-by-step guide | Setup, API, debugging |

---

## Chrome APIs Used

- `chrome.bookmarks.search()` - Find bookmarks
- `chrome.bookmarks.getChildren()` - Get folder contents
- `chrome.history.search()` - Find history items
- `chrome.tabs.query()` - Get open tabs
- `chrome.tabs.update()` - Focus tab
- `chrome.tabs.remove()` - Close tab
- `chrome.tabs.create()` - Open new tab
- `chrome.extensions.management.getAll()` - List extensions
- `chrome.downloads.search()` - Find downloads
- `chrome.downloads.show()` - Reveal download
- `chrome.storage.sync` - Persist settings
- `chrome.commands` - Register keyboard shortcuts
- `chrome.runtime.sendMessage()` - Message passing

---

## Performance Tips

### Searching is Fast Because:
- ✅ 100ms debounce prevents excessive API calls
- ✅ Results limited to 10 per category
- ✅ Parallel API fetching (not sequential)
- ✅ Smart deduplication
- ✅ Efficient ranking algorithm

### Optimize Large Collections:
- Search within specific categories
- Use more specific queries
- Clear browser history periodically

---

## Common Issues & Solutions

### Issue: Overlay not appearing
**Solution:** 
1. Check Ctrl/Cmd+Shift+K is not bound elsewhere
2. Reload extension (chrome://extensions → refresh)
3. Check console for errors

### Issue: Slow search with many bookmarks
**Solution:**
1. Search is debounced at 100ms - normal
2. Can increase debounce in bridge.js if needed
3. For v2.0: implement lazy loading

### Issue: Search engine preference not working
**Solution:**
1. Check chrome.storage.sync is enabled
2. Verify storage set successfully:
   ```javascript
   chrome.storage.sync.get(['searchEngine'], console.log);
   ```

### Issue: Overlay position reset
**Solution:**
1. Clear storage: `chrome.storage.sync.clear()`
2. Drag overlay to new position
3. Position will persist on next load

---

## Debugging

### View Console Logs
```javascript
// Open DevTools (F12)
// Go to Console tab
// Filter by content script (if needed)
```

### Test Message Passing
```javascript
// From DevTools console
chrome.runtime.sendMessage({
  type: 'SEARCH',
  query: 'github'
}, (response) => {
  console.log('Results:', response.results);
});
```

### Check Background Service Worker
1. Go to chrome://extensions
2. Click "Details" on extension
3. Scroll to "Background Service Worker"
4. Click "Inspect" to open DevTools

---

## Keyboard Navigation Demo

```
1. Press Ctrl/Shift+K (or Cmd/Shift+K on Mac)
   → Overlay opens, input focused

2. Type "github"
   → Results appear in real-time

3. Press ↓ to select first result
   → Result highlighted

4. Press ↓ again to move to next result
   → Highlight moves

5. Press Enter to select
   → Result executes, overlay closes

6. Or press Esc to cancel
   → Overlay closes without action
```

---

## UI Components

### Overlay Panel
- 600px wide (responsive to 90vw on mobile)
- Centered on screen (draggable)
- Dark mode aware
- Max 600px height with scrolling

### Input Field
- Auto-focused on open
- Full width of overlay
- Supports all keyboard shortcuts
- Placeholder: "Type to search bookmarks, tabs, history..."

### Results
- Grouped by category (Bookmarks, History, Tabs, etc.)
- Category headers show type
- Each result shows: icon, title, subtitle
- "Show more X" buttons for additional results
- Selected item highlighted

### Default State
- 3-5 Extension Actions
- 5 Active Tabs
- 5 Recent History Items

---

## Feature Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Overlay UI | ✅ Complete | Styled, responsive |
| Keyboard Shortcut | ✅ Complete | Configurable |
| Real-time Search | ✅ Complete | 100ms debounce |
| Result Ranking | ✅ Complete | Multi-factor |
| 8 Result Sources | ✅ Complete | All integrated |
| Web Search | ✅ Complete | Google, Bing, Yahoo |
| Position Persistence | ✅ Complete | Uses sync storage |
| Dark Mode | ✅ Complete | CSS media query |
| Keyboard Navigation | ✅ Complete | Full support |
| Action Execution | ✅ Complete | All result types |
| Accessibility | 🔄 In Progress | ARIA labels needed |
| Fuzzy Matching | 📋 Planned | v2.0 feature |
| Custom Aliases | 📋 Planned | v2.0 feature |
| Plugin System | 📋 Planned | v2.0 feature |

---

## Next Steps Checklist

- [ ] Load extension in Chrome
- [ ] Press Ctrl/Cmd+Shift+K to test
- [ ] Search for each result type
- [ ] Test keyboard navigation
- [ ] Test web search (type + enter)
- [ ] Drag overlay to new position
- [ ] Reload extension, verify position persists
- [ ] Test on dark mode
- [ ] Check for console errors
- [ ] Review IMPLEMENTATION_GUIDE.md for details

---

## Links & Resources

- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Guide:** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **Summary:** [TES-13-IMPLEMENTATION-SUMMARY.md](./TES-13-IMPLEMENTATION-SUMMARY.md)
- **Chrome Docs:** https://developer.chrome.com/docs/extensions/mv3/
- **Linear Issue:** TES-13 (Universal Search Overlay)
- **GitHub:** https://github.com/hierophantom/Bookmarks-Manager

---

## Statistics

| Metric | Value |
|--------|-------|
| Lines of Code | ~2000 |
| Files Created | 3 core + 2 docs |
| Result Sources | 8 |
| Chrome APIs | 12+ |
| Keyboard Shortcuts | 7 |
| Result Types | 8 |
| Performance Target | <500ms |
| Debounce Time | 100ms |
| Results per Category | 10 |

---

*Version 1.0 - January 7, 2026*
*Universal Search Overlay - Ready for Testing*
