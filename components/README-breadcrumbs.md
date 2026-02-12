# Breadcrumbs

**Design System Component - BMG-106**  
Figma: node-id=99-7970

## Overview

Breadcrumb navigation with root and current types. Root items are interactive with hover feedback, while the current item is static.

## Acceptance Criteria

- **Type: Root**
  - States: Idle, Hover
- **Type: Current**
  - States: Idle
- **user-select: none**

## Usage

### JavaScript API

```javascript
const breadcrumbs = createBreadcrumbs({
  items: [
    { label: 'Home', type: 'root', onClick: () => {} },
    { label: 'Bookmarks', type: 'current' }
  ]
});
```

## API

### `createBreadcrumbs(options)`

Creates a breadcrumbs navigation element.

**Parameters:**
- `options.items` (Array<Object>) - Items with `{ label, type, href, onClick, state }`

**Returns:** `HTMLElement`

### `createBreadcrumbItem(item)`

Creates a single breadcrumb item.

### `updateBreadcrumbs(breadcrumbs, items)`

Updates breadcrumb items in an existing element.

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--weight-regular: 400
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-10: rgba(255, 255, 255, 0.4)
--common-common-bright-15: rgba(255, 255, 255, 0.6)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--corner-radius-small: 4px
```

## Accessibility

- Uses a `nav` with `aria-label="Breadcrumb"`
- Current item includes `aria-current="page"`
- Root items use interactive elements for keyboard access

## Files

- `breadcrumbs.css` - Component styles
- `breadcrumbs.js` - Component logic
- `breadcrumbs.html` - Demo page
- `README-breadcrumbs.md` - Documentation
