# Navigation Bar Button Component

**Design System Component** — BMG-87  
**Figma:** [node-id=90-35294](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=90-35294)

## Overview

Pill-shaped button component for pagination navigation. Supports two types: "Current" (selected page) and "Other" (non-selected pages).

## Anatomy

- **Container**: pill-shaped button (height: 40px, border-radius: 999px)
- **Icon**: 24×24px (optional)
- **Label**: text using Body-Reg typography (optional)
- **Gap**: 4px between icon and label
- **Padding**: 16px horizontal

## Types & States

### Current (Selected Page)
- **States**: Idle, Hover
- **Background**: primary-20 with dark overlay
- **Border**: primary-25
- **Text**: common-bright-25
- **Shadow**: multi-layer drop shadow

### Other (Non-Selected)
- **States**: Idle, Hover, Pressed
- **Idle**: primary-20 with gradient overlay, primary-25 border
- **Hover**: bright overlay with bright-25 border, bright-15 text
- **Pressed**: bright-05 background, slight scale transform

## Variants

- **With Label**: Icon + text
- **Icon Only**: Icon only (40×40px)

## Design Tokens

```css
/* Typography */
--font-family-sans-serif: 'Lato', sans-serif
--size-large: 16px
--weight-regular: 400

/* Colors */
--primary-primary-20: rgba(46, 51, 185, 0.8)
--primary-primary-25: #2e33b9
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--common-common-bright-15: rgba(255, 255, 255, 0.6)
--common-common-bright-10: rgba(255, 255, 255, 0.4)
--common-common-bright-05: rgba(255, 255, 255, 0.1)

/* Border radius */
--corner-radius-pill: 999px
```

## Transitions

All state transitions use `0.2s ease`.

## Usage

### HTML

```html
<!-- Current page button -->
<button class="nav-button nav-button--current" aria-current="page">
  <img class="nav-button__icon" src="icon.svg" alt="">
  <span class="nav-button__label">Page 1</span>
</button>

<!-- Other page button -->
<button class="nav-button nav-button--other">
  <img class="nav-button__icon" src="icon.svg" alt="">
  <span class="nav-button__label">Page 2</span>
</button>

<!-- Icon only -->
<button class="nav-button nav-button--other nav-button--icon-only" aria-label="Next">
  <img class="nav-button__icon" src="arrow.svg" alt="">
</button>
```

### JavaScript API

```js
// Create button with label
const button = createNavigationButton({
  label: 'Page 1',
  icon: 'path/to/icon.svg',
  type: 'current',
  onClick: () => navigateToPage(1)
});

// Create icon-only button
const iconBtn = createNavigationButton({
  icon: 'path/to/icon.svg',
  type: 'other',
  iconOnly: true,
  ariaLabel: 'Next page',
  onClick: () => nextPage()
});

// Update button type
updateNavigationButtonType(button, 'other');

// Toggle disabled state
toggleNavigationButtonDisabled(button, true);
```

## Accessibility

- `user-select: none` prevents text selection
- `aria-current="page"` marks current page button
- `aria-label` required for icon-only buttons
- Disabled buttons use `pointer-events: none`

## Usage Context

Used in the Pagination component (BMG-88) at the bottom of the page.

## Files

- `navigation-bar-button.css` — Component styles
- `navigation-bar-button.js` — JavaScript API
- `navigation-bar-button.html` — Demo page
