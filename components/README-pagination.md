# Pagination Component

**Design System Component** — BMG-88  
**Figma:** [node-id=91-9179](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=91-9179)

## Overview

Pill-shaped pagination control built from navigation buttons. Includes a current button with label and icon-only buttons for other sections.

## Anatomy

- **Container**: pill background with blur (padding: 8px, gap: 12px)
- **Current button**: icon + label, primary-20 background, primary-25 border
- **Other buttons**: icon-only, common-bright-05 background and border
- **Icons**: 24x24px
- **Button height**: 40px

## Design Tokens

```css
/* Typography */
--font-family-sans-serif: 'Lato', sans-serif
--size-large: 16px
--weight-regular: 400

/* Colors */
--primary-primary-20: rgba(46, 51, 185, 0.8)
--primary-primary-25: #2e33b9
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-25: rgba(255, 255, 255, 0.9)

/* Border radius */
--corner-radius-pill: 999px
```

## Usage

### HTML

```html
<div class="pagination">
  <button class="pagination__button pagination__button--current" aria-current="page">
    <img class="pagination__icon" src="icon-home.svg" alt="">
    <span class="pagination__label">Homepage</span>
  </button>
  <button class="pagination__button pagination__button--other pagination__button--icon-only" aria-label="Bookmarks">
    <img class="pagination__icon" src="icon-book.svg" alt="">
  </button>
  <button class="pagination__button pagination__button--other pagination__button--icon-only" aria-label="Routes">
    <img class="pagination__icon" src="icon-route.svg" alt="">
  </button>
</div>
```

### JavaScript API

```js
const pagination = createPagination({
  items: [
    { label: 'Homepage', icon: iconCastle, type: 'current' },
    { icon: iconBook, type: 'other', iconOnly: true, ariaLabel: 'Bookmarks' },
    { icon: iconRoute, type: 'other', iconOnly: true, ariaLabel: 'Routes' }
  ],
  onItemClick: (item, index) => updatePaginationCurrent(pagination, index)
});

// Update current button
updatePaginationCurrent(pagination, 0);

// Disable a specific button
const buttons = pagination.querySelectorAll('.pagination__button');
togglePaginationButtonDisabled(buttons[1], true);
```

## Accessibility

- Use `aria-current="page"` for the current button.
- Use `aria-label` for icon-only buttons.
- Disabled buttons set `pointer-events: none`.

## Files

- `pagination.css` — Component styles
- `pagination.js` — JavaScript API
- `pagination.html` — Demo page
