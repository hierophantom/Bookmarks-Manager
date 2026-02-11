# Search Bar Component

**Design System Component** — BMG-89  
**Figma:** [node-id=92-9285](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=92-9285)

## Overview

Button-styled search bar that triggers the search overlay. Not an actual input field - acts as a clickable button with hover effects.

## Anatomy

- **Container**: pill-shaped button (height: 36px, width: 250px, border-radius: 999px)
- **Icon**: 16×16px search icon
- **Text**: "Search" using Body-Reg typography
- **Keyboard Shortcut**: Optional keyboard hint (e.g., ⌘E) visible on hover
- **Gap**: 4px between icon and text (10px on hover)
- **Padding**: 12px horizontal, 4px vertical

## States

### Idle
- **Background**: common-bright-05 with backdrop blur (7px)
- **Text**: "Search" in common-bright-15
- **Border**: transparent
- **Keyboard hint**: hidden

### Hover
- **Background**: common-bright-05
- **Border**: 1px solid common-bright-05
- **Text**: "Search..." in common-bright-25
- **Shadow**: multi-layer drop shadow
- **Gap**: increases to 10px
- **Keyboard hint**: visible

## Design Tokens

```css
/* Typography */
--font-family-sans-serif: 'Lato', sans-serif
--size-large: 16px
--weight-regular: 400

/* Colors */
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--common-common-bright-15: rgba(255, 255, 255, 0.6)
--common-common-bright-05: rgba(255, 255, 255, 0.1)

/* Border radius */
--corner-radius-pill: 999px
```

## Transitions

All state transitions use `0.2s ease`.

## Usage

### HTML

```html
<!-- Basic search bar -->
<button class="search-bar">
  <div class="search-bar__content">
    <img class="search-bar__icon" src="search-icon.svg" alt="">
    <span class="search-bar__text">Search</span>
  </div>
  <div class="search-bar__shortcut">
    <span class="search-bar__shortcut-key">⌘</span>
    <span class="search-bar__shortcut-key">E</span>
  </div>
</button>

<!-- With different shortcut -->
<button class="search-bar">
  <div class="search-bar__content">
    <img class="search-bar__icon" src="search-icon.svg" alt="">
    <span class="search-bar__text">Search</span>
  </div>
  <div class="search-bar__shortcut">
    <span class="search-bar__shortcut-key">/</span>
  </div>
</button>
```

### JavaScript API

```js
// Create search bar with default settings
const searchBar = createSearchBar({
  onClick: () => openSearchOverlay()
});

// Create with custom shortcut keys
const customSearch = createSearchBar({
  text: 'Find bookmarks',
  shortcutKeys: ['⌘', 'K'],
  onClick: () => openSearchOverlay()
});

// Create with single key
const quickSearch = createSearchBar({
  shortcutKeys: ['/'],
  onClick: () => openSearchOverlay()
});

// Update text dynamically
updateSearchBarText(searchBar, 'New text');

// Update keyboard shortcut
updateSearchBarShortcut(searchBar, ['Ctrl', 'F']);

// Toggle disabled state
toggleSearchBarDisabled(searchBar, true);
```

## Behavior

- Acts as a button, not an input field
- Clicking triggers search overlay component
- Keyboard shortcut hint appears only on hover
- Text changes from "Search" to "Search..." on hover
- Pressing active state scales down slightly (0.98)

## Nested Components

- **Keyboard Shortcut Hint** (BMG-92): Displays keyboard shortcut keys

## Accessibility

- Uses `<button>` element for proper semantics
- `aria-label` for screen readers
- Icons marked with `aria-hidden="true"`
- Disabled state prevents interaction

## Files

- `search-bar.css` — Component styles
- `search-bar.js` — JavaScript API
- `search-bar.html` — Demo page
