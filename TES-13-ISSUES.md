# TES-13 Universal Search Overlay - Outstanding Issues

**Date:** January 8, 2026  
**Status:** BLOCKED - Multiple integration issues

---

## Current Problems

### 1. Content Script Not Loading on HTTP/HTTPS Tabs
**Error:** `Could not establish connection. Receiving end does not exist.`

**Location:** `service-search-engine/bridge.js:114`

**Symptoms:**
- Keyboard shortcut (Cmd/Ctrl+Shift+E) pressed on http/https pages
- Background service tries to send `TOGGLE_OVERLAY` message via `chrome.tabs.sendMessage()`
- Message fails because content script not loaded/initialized

**Current State:**
- Manifest sets `run_at: "document_idle"` for content scripts
- Content script has initialization logs but they may not be firing
- Even after page refresh, content script may not be loading

### 2. Empty Search Response
**Error:** `[OverlayManager] Empty or failed search response: [object Object]`

**Location:** `service-search-engine/content-bridge.js:708`

**Symptoms:**
- When overlay does open (on main.html), search returns no results
- Response object exists but has no valid result keys
- `response.success` may be true but `response.results` is empty or malformed

**Current State:**
- Background service logs show aggregator is being called
- Response validation checks for `undefined`, `null`, and empty results
- Issue appears to be in result aggregation or response structure

---

## Architecture Overview

### Content Script Injection
**File:** `manifest.json` - content_scripts configuration
```json
"content_scripts": [
  {
    "matches": ["http://*/*","https://*/*"],
    "js": ["service-search-engine/content-bridge.js"],
    "run_at": "document_idle",
    "all_frames": false
  }
]
```

### Message Flow
1. **Keyboard Shortcut** → `chrome.commands` listener in background
2. **Background** → `toggleSearchOverlay()` finds active tab
3. **Background** → `chrome.tabs.sendMessage()` sends `TOGGLE_OVERLAY`
4. **Content Script** → Receives message, calls `this.toggle()`
5. **Content Script** → Opens overlay, user types query
6. **Content Script** → Sends `SEARCH` message with `{ query, tabId, pageUrl }`
7. **Background** → `handleSearch()` gets contextTab
8. **Background** → Calls `aggregator.aggregateResults()`
9. **Background** → Sends response back to content script
10. **Content Script** → Displays results

### Tab Context Resolution
**Primary:** `request.tabId` (explicit from content script)  
**Fallback 1:** `sender.tab` (Chrome provides for content scripts)  
**Fallback 2:** Query for active http/https tab (extension pages)

---

## What We've Tried

### Attempt 1: Explicit Tab ID Capture
- Content script captures `this.myTabId` on init
- Extension pages use `chrome.tabs.getCurrent()`
- Regular content scripts send `tabId: null` (don't have chrome.tabs API)
- Background uses `sender.tab` as fallback
- **Result:** Content script still not loading

### Attempt 2: Remove Ready Check
- Background was checking `readyTabs.has(tabId)` before sending toggle
- Removed blocking check, always attempt to send message
- Added warning logs
- **Result:** Still getting "connection" error

### Attempt 3: Change Content Script Timing
- Changed from `document_start` to `document_idle`
- Added comprehensive initialization logging
- Added `all_frames: false`
- **Result:** Content script still not loading reliably

### Attempt 4: Improved Error Handling
- Better response validation in content script
- Check for undefined/null responses
- Better error messages
- **Result:** Errors are clearer but problems persist

---

## Diagnostic Information Needed

### From Service Worker Console (chrome://extensions → service worker)

When pressing Cmd/Ctrl+Shift+E on http:// tab:
```
[Bridge] === TOGGLE OVERLAY CALLED ===
[Bridge] Active tab: { id, url }
[Bridge] Ready tabs: [...]
[Bridge] Tab ready check: true/false
[Bridge] Sending TOGGLE_OVERLAY to tab: X
```

### From Page Console (on http:// tab with DevTools open)

Should see on page load:
```
[OverlayManager] initOverlaySingleton called, readyState: ...
[OverlayManager] Creating new instance
[OverlayManager] Initializing on: ...
[OverlayManager] Content script - tab ID will be provided by background
[OverlayManager] Injecting overlay HTML
[OverlayManager] Setting up keyboard listeners
[OverlayManager] Setting up message listeners
[OverlayManager] Sending OVERLAY_READY
[OverlayManager] Initialization complete
```

**If these logs are MISSING:** Content script is not loading at all.

### From Main.html Console (chrome-extension://...)

When pressing Cmd/Ctrl+Shift+K on main.html, should see:
```
[OverlayManager] Extension page - got tab ID: X
[OverlayManager] Initialized: { myTabId: X, isExtensionPage: true }
Local toggle shortcut (K) detected on extension page; toggling overlay
[OverlayManager] Sending SEARCH: { query, tabId, url }
[OverlayManager] Response: { success, hasResults, resultKeys, error }
```

---

## Next Steps to Investigate

### Priority 1: Why Content Script Not Loading
1. Check if content script file exists and is valid JavaScript
2. Verify no syntax errors preventing script execution
3. Test on brand new http:// page after extension reload
4. Check browser console for any script loading errors
5. Verify manifest permissions are correct
6. Try simple `console.log('CONTENT SCRIPT LOADED')` at top of file

### Priority 2: Why Results Are Empty
1. Add logging at TOP of `handleSearch()` before any logic
2. Log the full aggregator response structure
3. Check if `aggregator.aggregateResults()` is actually being called
4. Verify the response is being sent with `sendResponse()`
5. Check if message channel closes before response sent (async issue)

### Priority 3: Separation of Concerns
**Main.html should be completely independent:**
- Local keyboard shortcut handler (Cmd/Ctrl+Shift+K) ✓
- Local overlay toggle ✓
- Sends SEARCH to background with its own tabId ✓
- Background recognizes extension page context ✓

**HTTP/HTTPS tabs should work via content script:**
- Global keyboard shortcut (Cmd/Ctrl+Shift+E) via chrome.commands
- Background sends TOGGLE_OVERLAY via tabs.sendMessage
- Content script handles local overlay
- Sends SEARCH with sender.tab as context

---

## Code Locations

### Key Files
- **Background Service:** `service-search-engine/bridge.js` (637 lines)
- **Content Script:** `service-search-engine/content-bridge.js` (1076 lines)
- **Aggregator:** `service-search-engine/result-aggregator.js` (672 lines)
- **Manifest:** `manifest.json`

### Critical Functions
- `toggleSearchOverlay()` - bridge.js:67-118
- `handleSearch()` - bridge.js:201-298
- `OverlayManager.init()` - content-bridge.js:25-66
- `OverlayManager.handleSearch()` - content-bridge.js:684-709
- `setupMessageListeners()` - content-bridge.js:1001-1028
- `initOverlaySingleton()` - content-bridge.js:1033-1059

---

## Hypothesis

**Content Script Loading Issue:**
The content script may not be executing at all, possibly due to:
1. Extension not properly reloaded after manifest changes
2. Content script has a top-level error preventing execution
3. Timing issue with `document_idle` on certain pages
4. Browser caching old version of content script

**Empty Results Issue:**
The background may be:
1. Finding wrong contextTab (extension page instead of http page)
2. Aggregator returning empty object legitimately
3. Response getting lost due to async sendResponse timing
4. Results object structure not matching what content script expects

---

## Recommended Debug Session

1. **Full extension reload:** chrome://extensions → Remove → Add unpacked again
2. **Open fresh http:// tab:** Navigate to simple page like example.com
3. **Open DevTools on page BEFORE pressing shortcut**
4. **Check console for content script init logs**
5. **If no logs:** Content script not loading - investigate why
6. **If logs present:** Press shortcut and check both consoles
7. **Service worker console:** See if toggle message sent
8. **Page console:** See if toggle message received

---

## Commit History Reference

- `4153101` - Fix content script loading and response validation
- `8e7ed1e` - Add comprehensive response logging
- `bf8b668` - Content scripts don't have chrome.tabs API access
- `7e5b52a` - Complete overlay context isolation with explicit tab IDs
- `5f9d9e0` - Add message receipt logging at entry point
- `dbb9e9e` - Add domain-level matching for pageUrl fallback

---

## Questions to Answer Tomorrow

1. Does content script file load at all? (Check Sources tab in DevTools)
2. Are there any top-level JavaScript errors in content script?
3. What does `chrome://extensions` show for content script injection?
4. If script loads, why isn't message listener working?
5. If overlay opens, what exactly is in the response object?
6. Is `sendResponse()` being called before async operation completes?
7. Should we use `return true` to keep message channel open?

---

**Status:** Needs fresh debugging session with clean extension reload and systematic console monitoring.
