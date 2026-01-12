# Changelog

All notable changes to the Bookmark Manager Chrome Extension are documented in this file.

## [Unreleased]

### Fixed - HTTP Overlay CSS Isolation & LTR (January 12, 2026)
- **BMG-75**: Custom CSS isolation for HTTP search overlay with LTR enforcement
  - Wrapped HTTP overlay in scoped root element (`#bmg-http-overlay`)
  - All CSS classes namespaced under root to prevent host-page CSS collisions
  - Added LTR enforcement: `direction: ltr` + `unicode-bidi: bidi-override` on root
  - Changed from `isolate` to `bidi-override` for stronger RTL override
  - All class names updated: `bm-` → `bmg-` for consistent namespace isolation
  - Prevents CSS interference from RTL websites and aggressive host-page CSS
  - Ensures consistent overlay appearance across all locales

### Added - Open All Confirmation (January 11, 2026)
- **BMG-63**: Confirmation modal for "Open All" button when folder has 10+ bookmarks
  - Shows confirmation dialog: "You are about to open X bookmarks. Are you sure?"
  - Two buttons: "Yes, open" to confirm, "Cancel" to abort
  - Prevents accidental opening of many tabs and improves browser performance
  - Added `openConfirmation()` method to Modal utility with customizable text
  - Enhanced BaseModal to support custom content and button labels

### Fixed - Search Overlay UX (January 11, 2026)
- **BMG-48**: Auto-scroll results area when navigating with arrow keys in search overlay
  - Added automatic scrolling to keep selected result visible when using arrow keys
  - Implemented manual scroll calculation for content overlay (http/https pages)
  - Used `scrollIntoView` with smooth behavior for main overlay (extension pages)
  - Ensures smooth navigation experience without manual scrolling

### Changed - Project Cleanup (January 11, 2026)
- Reorganized documentation to `.github/docs/` directory
- Moved TES-13 issues and specs documentation to proper location
- Cleaned up archived search engine implementation files
- Removed temporary Tag Manager and test files

### Added - Homepage, Navigation, and Bookmarks UX (January 6, 2026)
- Multi-page layout with sticky bottom navigation (Home, Bookmarks, Journey)
- Keyboard shortcuts: H → Home, B → Bookmarks, J → Journey; Arrow keys switch pages
- Magic Mouse swipe navigation with single-step lock and debounced threshold
- Snappy slide animations (~180ms) for page transitions
- Daily Quote section with ZenQuotes, daily caching, fallback list, and author → Wikipedia link
- Moved "Add Widget" next to Widgets section; simplified top bar
- Bookmarks refactor: folders render both as slots in parent and as full sections
- Folder slot actions: Jump to folder, Rename, Delete
- Folder section actions: Add Bookmark, Rename, Open All Tabs, Add Tabs (from active window), Add Folder, Hide, Delete
- Hidden folders with persistence: banner shows "Hidden Folders (count)" and one-click Show All
- Preserved scroll position after actions (add/delete/rename/filter) to prevent jumping to top

### Fixed
- Resolved ZenQuotes parsing inconsistencies; verified array response handling
- Prevented multi-page jumps on swipe; tuned thresholds and lock window
- Fixed syntax regression in `core/main.js` around widget picker init

### Added - Theming & Personalization (January 5, 2026)
- **8 Vibrant Color Themes** inspired by Slack design:
  - Electric Blue (default)
  - Jazzy Yellow
  - Neon Pink
  - Tropical Green
  - Cosmic Purple
  - Sunset Orange
  - Ocean Cyan
  - Crimson Red
- Theme colors applied to:
  - Buttons and links
  - Folder backgrounds and borders
  - All modal dialogs (add/edit bookmarks, folders, etc.)
  - Input field styling and focus states
  - Typography (headings, text)
- CSS variable system (`--theme-primary`, `--theme-secondary`, `--theme-accent`, `--theme-background`, `--theme-text`, `--theme-border`)
- Persistent theme selection via `chrome.storage.sync`
- Real-time theme switching across open tabs

### Added - Background Customization
- **Solid Color Background** - Choose any color with color picker
- **Custom Image Upload**:
  - Validation: 100KB - 5MB file size
  - Supported formats: JPEG, PNG, WebP
  - Minimum resolution: 400×300px
  - Prevents quota overflow by storing large images in `chrome.storage.local`
- **Unsplash Integration**:
  - Random image fetching from Unsplash API
  - 10 curated categories: Nature, Urban, Abstract, Animals, Minimalism, Business, Tech, Art, Food, Travel
  - Auto-rotation frequency: Never, Every 1 hour, Every 6 hours, Every day
  - Shows photographer attribution with link
  - Persists category selections and frequency
- Background settings persist across device sync via `chrome.storage.sync`
- Fixed background (doesn't scroll with page)

### Added - 🎨 Personalize Button
- Header button to access all theme and background settings
- Modal interface with:
  - Theme preview grid with color swatches
  - Background type selection (color/upload/Unsplash)
  - Color picker for solid backgrounds
  - Image upload with validation feedback
  - Category selector for Unsplash images
  - Frequency dropdown for auto-rotation

### Added - Tab Groups Enhancement
- **Tab Group Editing**:
  - Edit button (✎) on each tab group
  - Change group name in modal
  - Change group color with visual color picker (8 colors)
  - Color representation in UI (left border + tinted background)
- Color-coded UI for groups showing selected color
- Improved tab group display with better spacing and typography

### Improved - UX & Animations
- Undo snackbar timeout reduced from 8 seconds to 5 seconds
- Fixed snackbar persistence on page reload (clears pending undo entries)
- Modal dialogs now styled consistently with active theme
- Better focus states on input fields with colored shadows
- Smooth transitions on button hover states

### Fixed - Storage & Quota Management
- Large image data stored in `chrome.storage.local` (unlimited)
- Settings stored in `chrome.storage.sync` (persistent across devices)
- Prevents quota exceeded errors when uploading custom backgrounds
- Graceful error handling for API failures

### Fixed - Unsplash API Integration
- Removed `count` parameter causing response format issues
- Added validation for API response structure
- Better error logging for debugging

## [Previous Releases]

### Added - Tab Groups Integration
- Display of browser tab groups in main bookmarks UI
- Click tabs to focus them
- Close individual tabs within groups
- Add new tabs to groups
- Delete tab groups (close all tabs)
- Ungroup tabs (remove from group)
- Visual tab group representation with colors

### Added - Undo/Redo System
- Undo snapshots for bookmark deletion
- Persistent undo across page reloads
- Snackbar notification with undo action
- 5-second timeout before permanent deletion
- Automatic cleanup of pending undo on page load

### Added - Tag Management System
- Assign tags to bookmarks
- Tag filtering
- Autocomplete suggestions for tag input
- Tag display on bookmarks

### Added - Bookmark Management
- Full CRUD operations for bookmarks
- Add bookmarks to folders
- Edit bookmark title and URL
- Delete bookmarks with undo
- Drag & drop to reorder bookmarks
- Add multiple tabs as bookmarks in bulk

### Added - Folder Management
- Create new folders
- Edit folder names
- Delete folders (with confirmation)
- Nested folder support

### Added - Widgets System
- Widgets container with configurable slots
- Add/remove widgets
- Widget gallery for selection
- Auto-hide second row when less than 4 widgets

### Added - Core Features
- Bookmark explorer with folder hierarchy
- Bookmark tree visualization
- Drag & drop ordering between folders
- Modal-based forms for add/edit operations
- Search overlay infrastructure
- New tab override capability

## Dependencies & APIs

### Chrome APIs Used
- `chrome.bookmarks.*` - Bookmark management
- `chrome.tabs.*` - Tab interaction
- `chrome.tabGroups.*` - Tab group management
- `chrome.storage.sync` - Cross-device sync storage
- `chrome.storage.local` - Local-only large data storage
- `chrome.runtime.*` - Message passing
- `chrome.commands.*` - Keyboard shortcuts

### External APIs
- **Unsplash API** - Random image fetching
  - Endpoint: `/photos/random`
  - API Key: Stored in code (consider environment variables in production)

## Known Limitations

- Tab Groups API only available in Chrome 88+
- `chrome.storage.sync` has quota limits (~8KB per item)
- Image upload limited to 5MB per browser extension storage limitations
- Unsplash API requires internet connectivity
- Tags do not sync across devices (stored in `chrome.storage.local`)

## Performance Considerations

- Bookmark tree loaded on page initialization
- Tag reconciliation runs in background
- Unsplash rotation scheduled via `setInterval`
- Image backgrounds use `background-attachment: fixed` for fixed positioning

## Browser Compatibility

- **Chrome/Chromium** 88+ (for Tab Groups API)
- **Edge** 88+
- **Opera** 74+

## Future Improvements

- Export/import bookmarks (HTML/JSON format)
- Backup and restore functionality
- Cross-device tag synchronization
- Search overlay with real-time filtering
- Advanced bookmark organization (multiple parents, hierarchical tags)
- Keyboard shortcuts customization
- Performance optimization for large bookmark trees
