# Bookmark Manager - Development Roadmap

This document outlines the planned features and improvements for the Bookmark Manager Chrome Extension, organized by priority and implementation phase.

---

## ✅ Completed (as of January 5, 2026)

### Phase 1: Core Functionality
- [x] Bookmarks Explorer - Browse bookmark tree
- [x] Drag & Drop Ordering - Reorder bookmarks
- [x] Modal-based CRUD - Add/edit/delete operations
- [x] Widgets & Shortcuts - Configurable widget grid

### Phase 2: Advanced Features
- [x] Tab Groups Integration - Display and manage browser tab groups
- [x] Tab Group Editing - Change name and color
- [x] Undo/Redo System - Delete with undo snapshots
- [x] Tag Management - Tag bookmarks (basic implementation)

### Phase 3: Theming & Personalization
- [x] 8 Vibrant Color Themes - Slack-inspired design system
- [x] Solid Color Backgrounds - Pick any color
- [x] Custom Image Upload - Upload personal images with validation
- [x] Unsplash Integration - Random images with category selection
- [x] Theme-aware UI - Consistent theming across all modals and components
- [x] Settings Persistence - Cross-device sync via `chrome.storage.sync`

---

## 🚀 Planned (Next Priorities)

### Phase 4: Homepage & New Tab (Priority: HIGH)

#### P4.1 - New Tab Override
**Status**: Not Started  
**Priority**: HIGH  
**Estimated Effort**: 1-2 hours  
**Description**: Replace browser new-tab with extension homepage  

**Implementation Details**:
- Listen to `chrome.tabs.onCreated` event
- Check if new tab has default about:blank or pending URL
- Update tab to `chrome.runtime.getURL('core/main.html')`
- Add fallback for browsers that don't support override
- Settings: Toggle to enable/disable new-tab override

**Files Needed**:
- Update `background.js` with tab listener
- Add settings UI to Personalize modal

**Testing**:
- Open new tab with Ctrl+T / Cmd+T
- Verify it loads extension homepage
- Test with incognito mode (may not work)

---

#### P4.2 - Daily Quote / Inspirational Content
**Status**: Not Started  
**Priority**: HIGH  
**Estimated Effort**: 2-3 hours  
**Description**: Show rotating daily quote on homepage  

**Implementation Details**:
- Create `core/daily-quote.js` service
- Fetch quotes from free API (ZenQuotes, Quotable, etc.)
- Cache quote in `chrome.storage.local` with date key
- Show different quote each day automatically
- Manual refresh button
- Display quote with author attribution
- Styling to match selected theme
- Option to hide quotes in settings

**Suggested APIs**:
- ZenQuotes (free, no key needed) - https://zenquotes.io/api/random
- Quotable - https://api.quotable.io/quotes

**Files Needed**:
- `core/daily-quote.js` - Quote fetching and caching
- Update `core/main.html` - Add quote container
- Update `core/styles.css` - Quote styling
- Update `core/main.js` - Initialize quote on load

**Features**:
- Show quote + author
- Refresh button with loading state
- Caching to reduce API calls
- Fallback quote if API fails
- Theme-aware text color

---

### Phase 5: Search & Discovery (Priority: MEDIUM)

#### P5.1 - Universal Search Overlay
**Status**: Not Started  
**Priority**: MEDIUM  
**Estimated Effort**: 6-8 hours  
**Description**: Global search across bookmarks, tags, and open tabs  

**Implementation Details**:
- Keyboard shortcut: Ctrl/Cmd+Shift+K to toggle
- Modal overlay with search input
- Real-time filtering of:
  - Bookmarks by title and URL
  - Tags matching search term
  - Open tabs in current window
- Search results grouped by type
- Click result to open bookmark or focus tab
- Highlight matching terms
- Recent searches history (optional)

**Files Needed**:
- `service-search-engine/search-service.js` - Core search logic
- `service-search-engine/overlay/overlay.js` - Overlay UI
- `service-search-engine/overlay/overlay.html` - Modal markup
- `service-search-engine/overlay/overlay.css` - Styling
- Update `background.js` - Register shortcut handler
- Update `core/main.js` - Search integration

**Implementation Phases**:
1. Basic search over bookmarks
2. Add tags search
3. Add tabs search
4. Results grouping and display
5. Keyboard navigation (arrow keys, enter)
6. Recent searches

**Testing**:
- Test keyboard shortcut on different page types
- Test with various search terms
- Test result clicking
- Test with large bookmark trees (performance)

---

#### P5.2 - Search Bridge for Web Pages
**Status**: Not Started  
**Priority**: MEDIUM (depends on P5.1)  
**Estimated Effort**: 4-5 hours  
**Description**: Access search overlay from web pages  

**Implementation Details**:
- Inject content script into http/https pages
- Define `window.chromeExtensionBridge.sendMessage()` function
- Validate message origin and type
- Route messages to background script
- Support opening bookmarks and tabs from web context
- Security: Only allow specific actions (no arbitrary script execution)

**Files Needed**:
- `service-search-engine/content-controller.js` - Content script
- `service-search-engine/bridge.js` - Message bridge
- Update `manifest.json` - Add content scripts and web accessible resources
- Update `background.js` - Handle bridge messages

**Security Considerations**:
- Validate origin (only from extension or specific domains)
- Allowlist specific message types
- Never execute arbitrary code from page context
- Rate limit API calls
- Log suspicious activity

---

### Phase 6: Export & Backup (Priority: MEDIUM)

#### P6.1 - Export Bookmarks
**Status**: Not Started  
**Priority**: MEDIUM  
**Estimated Effort**: 3-4 hours  
**Description**: Export bookmarks to HTML or JSON  

**Formats**:
- **HTML**: Netscape bookmark format (compatible with Chrome import)
- **JSON**: Structured format with metadata (tags, timestamps)

**Features**:
- Export all bookmarks or selected folder
- Include/exclude tags in export
- Download file with timestamp
- Preview before download

**Files Needed**:
- `services/export-service.js` - Export logic
- Update `core/main.html` - Export button
- Update `core/main.js` - Export handler

---

#### P6.2 - Import Bookmarks
**Status**: Not Started  
**Priority**: MEDIUM (depends on P6.1)  
**Estimated Effort**: 3-4 hours  
**Description**: Import bookmarks from files or other sources  

**Formats**:
- HTML (Netscape format)
- JSON (from export)

**Features**:
- File picker for import
- Preview imported bookmarks
- Conflict resolution (duplicate handling)
- Merge into existing folder
- Progress indicator
- Undo import

---

### Phase 7: Advanced Organization (Priority: LOW)

#### P7.1 - Collections / Smart Folders
**Status**: Not Started  
**Priority**: LOW  
**Estimated Effort**: 5-6 hours  
**Description**: Group bookmarks across folders with smart collections  

**Features**:
- Create collection from tag
- Create collection from search criteria
- Save searches as collections
- Collections update dynamically
- Manage collection membership

---

#### P7.2 - Bookmark Syncing from Other Devices
**Status**: Not Started  
**Priority**: LOW  
**Estimated Effort**: 4-5 hours  
**Description**: View and sync bookmarks from other synced devices  

**Features**:
- Fetch bookmarks from other devices (if available via Chrome Sync)
- Display device-specific bookmarks
- Cross-device bookmark stats

**Note**: Requires Chrome Sync API investigation

---

### Phase 8: Polish & Optimization (Priority: ONGOING)

#### P8.1 - Performance Optimization
**Status**: Not Started  
**Priority**: ONGOING  
**Estimated Effort**: Variable  

**Tasks**:
- [ ] Lazy load bookmarks for large trees
- [ ] Virtualize bookmark list (show only visible items)
- [ ] Cache bookmark tree
- [ ] Optimize search for 10K+ bookmarks
- [ ] Profile memory usage
- [ ] Reduce initial load time

---

#### P8.2 - Keyboard Shortcuts
**Status**: Partial (only Ctrl+Shift+K planned)  
**Priority**: ONGOING  
**Estimated Effort**: 2-3 hours  

**Shortcuts to Implement**:
- [ ] Ctrl/Cmd+Shift+K - Toggle search (P5.1)
- [ ] Ctrl/Cmd+B - Focus first bookmark
- [ ] Ctrl/Cmd+N - New bookmark
- [ ] Ctrl/Cmd+F - Filter by tag
- [ ] / - Quick search on homepage
- [ ] ? - Show shortcuts help

---

#### P8.3 - Accessibility (a11y)
**Status**: Not Started  
**Priority**: ONGOING  
**Estimated Effort**: 3-4 hours  

**Tasks**:
- [ ] Add ARIA labels to modals
- [ ] Keyboard navigation in lists
- [ ] Focus management in modals
- [ ] Screen reader testing
- [ ] Color contrast verification
- [ ] Tab order review

---

#### P8.4 - Unit & Integration Tests
**Status**: Not Started  
**Priority**: ONGOING  
**Estimated Effort**: Variable  

**Test Coverage**:
- [ ] Bookmark CRUD operations
- [ ] Drag & drop reordering
- [ ] Tag filtering
- [ ] Search functionality
- [ ] Storage persistence
- [ ] Theme switching
- [ ] Undo/Redo system

---

## 📋 Implementation Phase Timeline

### Sprint 1 (Week 1-2): Homepage Essentials
- [x] Theming & Personalization (COMPLETED)
- [ ] New Tab Override (P4.1)
- [ ] Daily Quote (P4.2)

### Sprint 2 (Week 3-4): Search
- [ ] Universal Search Overlay (P5.1)
- [ ] Search Bridge (P5.2)

### Sprint 3 (Week 5-6): Import/Export
- [ ] Export Bookmarks (P6.1)
- [ ] Import Bookmarks (P6.2)

### Sprint 4 (Week 7+): Polish & Advanced
- [ ] Performance Optimization (P8.1)
- [ ] Keyboard Shortcuts (P8.2)
- [ ] Accessibility (P8.3)
- [ ] Testing (P8.4)
- [ ] Advanced Organization (P7)

---

## 🐛 Known Issues & Refactoring

### Tech Debt
- [ ] Tag persistence needs refactoring (current implementation abandoned)
- [ ] Modal system could be simplified
- [ ] Optimize CSS variable cascade
- [ ] Reduce inline styles in modal.js

### Potential Improvements
- [ ] Replace inline event handlers with centralized event system
- [ ] Add logging/debugging system
- [ ] Create utility for common DOM operations
- [ ] Build component system for reusable UI patterns

---

## 📊 Priority Matrix

| Feature | Priority | Effort | Impact | Status |
|---------|----------|--------|--------|--------|
| New Tab Override | HIGH | 1-2h | HIGH | ⚪ Not Started |
| Daily Quote | HIGH | 2-3h | MEDIUM | ⚪ Not Started |
| Search Overlay | MEDIUM | 6-8h | HIGH | ⚪ Not Started |
| Search Bridge | MEDIUM | 4-5h | MEDIUM | ⚪ Not Started |
| Export/Import | MEDIUM | 6-8h | MEDIUM | ⚪ Not Started |
| Collections | LOW | 5-6h | LOW | ⚪ Not Started |
| Performance | ONGOING | Variable | HIGH | 🟡 In Progress |
| Keyboard Shortcuts | ONGOING | 2-3h | MEDIUM | ⚪ Not Started |
| Accessibility | ONGOING | 3-4h | HIGH | ⚪ Not Started |
| Testing | ONGOING | Variable | HIGH | ⚪ Not Started |

---

## 🎯 Success Criteria

### MVP (Current)
- ✅ Manage bookmarks (CRUD, drag & drop)
- ✅ Tab groups integration
- ✅ Theming & personalization
- ⏳ New tab override
- ⏳ Search functionality

### v1.0 (Planned)
- ✅ Everything in MVP
- ⏳ Export/Import
- ⏳ Daily content
- ⏳ Search overlay
- ⏳ Keyboard shortcuts

### v2.0 (Future)
- Smart collections
- Advanced search
- Cross-device sync
- Performance optimization
- Full accessibility compliance

---

## 📝 Notes for Future Development

- **Storage Quota**: Remember that `chrome.storage.sync` is limited (~8KB per item). Plan large features accordingly.
- **API Stability**: Some APIs (like `chrome.tabGroups`) are only available in Chrome 88+.
- **Performance**: Test features with 10K+ bookmarks to ensure scalability.
- **Security**: Thoroughly test any web-accessible resources and message bridges.
- **Browser Compatibility**: Edge and Opera support varies; test accordingly.

---

**Last Updated**: January 5, 2026  
**Next Review**: After P4.1 and P4.2 completion
