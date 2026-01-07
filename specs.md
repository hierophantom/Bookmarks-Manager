# Bookmark Manager — Detailed Feature Specification (Extended)

This document expands each major feature and ability of the extension and explains exactly what it does, the UI elements involved, data flows, APIs used, storage keys, and important edge cases.

---

## 1. Bookmarks Explorer

What it does:
- Presents the user's Chrome bookmark tree as a browsable, folder-based UI with nested sections and per-folder slots.

UI elements:
- Folder sections created by `folder-section-manager.js` (DOM nodes with IDs like `bookmarks-<folderId>`).
- Bookmark and folder items populated by `item-populator.js` into slot elements produced by `slot-manager.js`.
- Add/Edit controls that open modal dialogs from `bookmark-modals.js` / `modals/*`.

User actions & behaviors:
- Expand/collapse folders to reveal contents.
- Click a bookmark item to open its URL in a new tab (uses `chrome.tabs` when opening programmatically or anchor navigation otherwise).
- Click an "Add bookmark" or empty slot to open the Add Bookmark modal; form fields are pre-filled when editing.
- Edit folder metadata using the Edit Folder modal.
- After add/edit/delete, bookmarks are reloaded and UI refreshed via `BookmarksService.loadBookmarks()`.

Data & APIs:
- Reads bookmark tree via `chrome.bookmarks.getTree()`.
- Performs CRUD via the Chrome Bookmarks API (`chrome.bookmarks.create`, `chrome.bookmarks.update`, `chrome.bookmarks.remove`).
- Persists UI-specific state (slot positions or local settings) in `chrome.storage` / `localStorage` only — not bookmark content.

Storage keys & state:
- No single global bookmark storage key; folder slot assignments are tracked by the `slot-manager` and slot systems (slot-related storage keys found in widget/shortcut code: `slotWidgets`, `slotShortcuts`).

Edge cases & notes:
- Special Chrome folders (IDs `1`, `2`, `3`) are displayed with human-readable names.
- The service avoids attempting operations if the bookmarks container DOM is not present.

---

## 2. Drag & Drop Ordering

What it does:
- Allows reordering bookmarks within a folder and moving items between folder slots using drag-and-drop.

UI elements:
- Slots created by `slot-manager.js` and decorated with drop-target classes (CSS in `slots.css`).
- Draggable bookmark/folder item elements produced by `item-populator.js`.

User actions & behaviors:
- Dragging a bookmark shows drop indicators in target slots.
- Dropping triggers reindexing logic and calls to the Chrome Bookmarks API to update order/parent if moved across folders.

Data & APIs:
- Likely uses `chrome.bookmarks.update` and `chrome.bookmarks.move` to change parent/position.
- The `drag-drop-manager.js` wires drag events and handles DOM reorder animations.

Edge cases & notes:
- Empty-slot behavior: empty slot at folder end is clickable to add a new bookmark.
- Concurrency: BookmarksService includes `_isLoading` guard to avoid simultaneous loads.

---

## 3. Modal-based CRUD (Add / Edit / Add Tabs)

What it does:
- Provides modular modal dialogs for adding and editing bookmarks, folders, and importing open tabs into a folder.

UI elements:
- Generic `ModalManager` (`utils/modal.js`) drives modal lifecycle and rendering.
- Specific modal content providers in `bookmark-modals.js` and `modals/*` supply form markup and handlers.

User actions & behaviors:
- Open modal -> fill form -> Save triggers API calls -> on success modal closes and `loadBookmarks()` refreshes view.
- Add Tabs modal captures currently open tabs and allows adding them as bookmarks into a target folder.

Data & APIs:
- Modal actions call the Chrome Bookmarks API to create/update entries.
- Add Tabs reads from `chrome.tabs.query({currentWindow: true})` to list tabs.

Edge cases & notes:
- Modals are shared across services by calling `setModalManager(modalManager)` during initialization.
- Closing modals triggers refresh hooks to ensure UI consistency.

---

## 4. Widgets & Shortcuts Slot Systems

What it does:
- Provides a configurable grid of slots for small homepage widgets and shortcuts.
- Widgets can be added/removed via a modal gallery; second-row visibility adjusts depending on occupancy.

UI elements:
- Slots container IDs (`#widgets-container`, `#shortcuts-container`) and slot elements with class `.widget-slot`/`.shortcut-slot`.
- Widget items rendered by `services/widgets.js`; shortcuts by `services/shortcuts.js`.

User actions & behaviors:
- Add widget/shortcut: click `#add-widget-btn` or `#add-shortcut-btn`, open modal gallery, choose item, assign to an empty slot.
- Remove or edit widget via widget controls (hover shows `.widget-controls`).
- Widget slots auto-hide second row if less than 4 items and lower row empty.

Storage & APIs:
- Slot system persistence via a storage key (`slotWidgets` and `slotShortcuts`) through `SlotSystem` (`utils/slots.js`) which uses `chrome.storage` or `localStorage`.

Edge cases & notes:
- Factories update empty state and manage widget lifecycle events.
- Slot visibility logic mitigates layout flicker with small timeouts.

---

## 5. Tag Management

What it does:
- Assign tags to bookmarks and provide a tag-based filter/search UI.

UI elements:
- Tag editor UI provided by `service-bookmark/tag-manager.js` and possibly `modals/tags-handler.js`.

User actions & behaviors:
- Add/remove tags on bookmark edit modal or via a tag manager panel.
- Click a tag to filter bookmarks or highlight associated items.

Data & APIs:
- Tags are stored outside the Chrome Bookmarks API (likely in `chrome.storage`) and linked to bookmark IDs.

Edge cases & notes:
- Tags must gracefully handle deleted bookmarks (cleanup or orphaned tags).

---

## 6. Tab Groups Integration

What it does:
- Queries `chrome.tabGroups` to list browser tab groups and renders them within the bookmarks UI to provide a unified navigation surface.

UI elements:
- Tab groups container `#tab-groups-container` appended into bookmarks by `BookmarksService.renderTabGroups()`.

User actions & behaviors:
- View tab groups inside the bookmarks page; click to focus/open associated tabs/groups.
- Refresh button (`#refresh-tab-groups-btn`) calls `tabGroupsService.refresh()`.

Data & APIs:
- Uses `chrome.tabGroups.query({})` and `chrome.tabs` to map group members.

Edge cases & notes:
- If no tab groups exist, the tab-groups section is hidden.
- Rendering temporarily switches tabGroupsService container when rendering inside bookmarks UI.

---

## 7. Universal Search Overlay

What it does:
- Provides an overlay search UI that can be shown on normal web pages (via content script), on chrome:// pages (via popup), and inside the main app page.

UI elements & files:
- `service-search-engine/overlay/overlay-popup.html`, `overlay.js`, `overlay.css` and `service-search-engine/content-controller.js`.
- `service-search-engine/bridge.js` exposes `window.chromeExtensionBridge.sendMessage` for page scripts.

User actions & behaviors:
- Toggle with the `toggle-search` command (Ctrl/Cmd+Shift+K) or UI button.
- Type queries; overlay performs local search across bookmarks, tags, and possibly open tabs.

Data & APIs:
- Content script injected into http/https pages listens for messages and toggles overlay.
- Background handles `chrome.commands.onCommand` and routes actions depending on current tab URL.

Security & privacy:
- Web accessible resources enable overlay injection; validate incoming `postMessage` payloads and restrict message types.

---

## 8. New Tab Override

What it does:
- Replaces the browser new-tab with the extension homepage by detecting new tab creation and updating its URL to `core/main.html`.

Behavior & APIs:
- `chrome.tabs.onCreated` listener checks `tab.pendingUrl` / `tab.url` and calls `chrome.tabs.update(tab.id, {url: chrome.runtime.getURL('core/main.html')})`.

Edge cases & notes:
- Respect user expectations for default new-tab behavior in browsers that disallow overrides.

---

## 9. Theming & Daily Content

What it does:
- `core/themes.js` manages theme state and toggling; `core/daily-quote.js` supplies dynamic daily content for the homepage.

User actions:
- Theme switcher toggles visual appearance; daily quote updates periodically and can be refreshed manually.

Storage & APIs:
- Theme preference persisted in `localStorage` or `chrome.storage`.

---

## 10. Bridge & Web-Accessible Resources

What it does:
- `service-search-engine/bridge.js` defines `window.chromeExtensionBridge.sendMessage()` for page scripts to post messages to the extension via `window.postMessage`.
- Web accessible resources allow page-level code to fetch overlay scripts and CSS.

Security & payload handling:
- Content scripts and page bridges must validate origin and payload shape before performing privileged actions.

---

## Cross-Cutting Concerns

- Initialization ordering is important — `bookmarkEnhancementService` and modal managers must be ready before services that rely on them.
- Many services expose themselves on `window.*` for cross-module access — this simplifies integration but requires careful feature gating.
- Performance: Bookmark tree traversal must avoid blocking UI; current implementation uses async/await and small delays for UI readiness.

---

## Implementation Notes & Recommendations

- Add explicit cleanup for orphaned tag entries when bookmarks are removed.
- Consider adding an export/import flow (HTML/JSON) to support backup and bulk changes.
- Harden the postMessage bridge with an allowlist of actions and structured message validation.
- Add tests around bookmark reordering and tab-groups rendering to prevent regressions.

---

## Session Consistency, Saved State, and Limitations

This section explains which UI states are persisted, how session consistency is achieved across reloads and browser restarts, synchronization behavior, and current limitations or failure modes to be aware of.

Persisted state and storage locations:
- Slot assignments (widgets and shortcuts): persisted via the `SlotSystem` using keys such as `slotWidgets` and `slotShortcuts` in `chrome.storage` (fallback to `localStorage` where used). These store the item identity and assigned slot index.
- UI preferences: last visited page, theme selection, and simple flags (e.g., `refreshSet`) are stored in `localStorage` and/or `chrome.storage`.
- Tags and other metadata: stored separately from the Chrome Bookmarks API (likely in `chrome.storage`) and tied to bookmark IDs. If bookmark IDs change or bookmarks are removed, the tag manager must handle cleanup.

Consistency guarantees and behaviors:
- Bookmark data: the canonical source of truth is the Chrome Bookmarks API. The extension reads the live tree on each major operation (`chrome.bookmarks.getTree()` on load) and uses the Chrome API for CRUD operations. This ensures that changes made outside the extension (e.g., via Chrome UI or another synced device) are reflected after the next reload or explicit refresh.
- UI state vs. bookmarks: slot assignments and UI preferences are independent of the bookmark tree. If a bookmark referenced by a slot is removed externally, the slot system should detect the missing item on next load and mark the slot empty. (Recommendation: run a reconcile pass on load to clear or reassign missing items.)
- Tab groups: dynamic and live — `chrome.tabGroups` is queried when rendering. Tab-group membership may change rapidly; the UI will show the latest state after a refresh or when `renderTabGroups()` is triggered.

Sync behavior across devices:
- Bookmarks: if Chrome sync is enabled, bookmarks are synced across devices via Chrome's native sync. The extension relies on the Chrome Bookmarks API, so synced changes will appear when the browser updates the local bookmark store.
- Extension-specific settings (slot assignments, tags, theme): stored in `chrome.storage.sync` only if the `SlotSystem` / storage code uses the sync storage area. If the current implementation uses `localStorage` or `chrome.storage.local`, those settings will NOT sync across devices. (Recommendation: use `chrome.storage.sync` for small user preferences to enable cross-device consistency, being mindful of quota limits.)

Limitations and failure modes:
- Storage quotas: `chrome.storage.sync` has quota limits; large tag maps or storing full bookmark payloads in sync storage risks exceeding quotas.
- Race conditions: concurrent edits from multiple sources (another device or another extension) can lead to transient mismatches until the extension reloads or reconciles state.
- Web-accessible resources & bridge: exposing bridge scripts to page context requires careful message validation. Malicious pages could attempt to post messages to the bridge — ensure content scripts validate message origin and type before taking actions that require privileges.
- Permissions: extension requires `bookmarks`, `tabs`, and `tabGroups`. Users may deny or revoke permissions in some browsers or future versions; code should gracefully degrade when permissions are missing (e.g., hide tab-groups UI if `tabGroups` is unavailable).
- New-tab override: some browsers or user settings may prevent programmatic new-tab overrides; fallback behavior should be considered.

Recovery strategies:
- Reconcile on load: when the extension loads, perform a reconciliation step that compares stored slot references and tag mappings with the current bookmark tree; remove or flag orphaned references.
- Safe defaults: if storage read fails or data appears corrupted, fall back to sensible defaults (empty slots, default theme) and log telemetry or console warnings for debugging.
- Graceful degradation: if `chrome.storage.sync` is unavailable or quota exceeded, fall back to `chrome.storage.local` and notify the user (UI prompt) about limitations.

Testing & validation suggestions:
- Add unit tests for slot reconciliation logic (missing bookmarks, duplicate IDs).
- Simulate sync conflicts by applying changes to the bookmark tree externally and verifying the extension accurately reconciles on reload.
- Validate bridge message handling with malicious/invalid payloads to ensure the extension ignores unexpected messages.

---

Generated from a code inspection of the repository on January 5, 2026.
