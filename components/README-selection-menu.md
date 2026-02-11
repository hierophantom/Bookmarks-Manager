# Selection Menu

**Design System Component** — BMG-102  
**Figma:** node-id=95-14656

Selection menu used for multi-select tags or single-select sorting options. Supports low and high contrast variants.

## Overview

The Selection Menu is a floating panel that lists selectable items. It has two variants:

- **Multi-select (Tags)**: checkbox list with tag pills and optional Clear/Select all actions.
- **Single-select (Sort)**: list with a single active selection and optional section headers.

## Anatomy

- **Container**: fixed width panel (200px)
- **Header**: title and optional Clear action
- **Items**: selectable rows
- **Checkbox/Checkmark**: visual selection indicator
- **Optional**: section headers and Select all link

## Variants

### Multi-select (Tags)
- Checkbox + tag label per row
- Clear action in header
- Select all link in footer

### Single-select (Sort)
- Checkmark indicates current selection
- Optional grouped sections
- One active selection at a time

## Contrast Variants

### Low Contrast
- Background: `primary-20`
- Border: `primary-25`
- Text: `common-bright-20`

### High Contrast
- Background: `primary-20` (reduced opacity)
- Border: `primary-25` (reduced opacity)
- Text: `common-dark-10`

## Design Tokens

```css
--primary-primary-20: rgba(46, 51, 185, 0.8)
--primary-primary-25: #2e33b9
--common-common-bright-20: rgba(255, 255, 255, 0.8)
--common-common-bright-15: rgba(255, 255, 255, 0.6)
--common-common-dark-10: rgba(0, 0, 0, 0.8)
--corner-radius-small: 4px
--padding-and-gap-medium: 4px
--padding-and-gap-large: 8px
```

## Usage

### HTML

```html
<div class="selection-menu selection-menu--low">
  <div class="selection-menu__header">
    <div class="selection-menu__title">Select tags:</div>
    <button class="selection-menu__clear" type="button">Clear</button>
  </div>
  <div class="selection-menu__item">
    <span class="selection-menu__checkbox"></span>
    <span class="selection-menu__tag">#value</span>
  </div>
</div>
```

### JavaScript API

```js
const menu = createSelectionMenu({
  type: 'tag',
  contrast: 'low',
  items: ['#value', '#value'],
  selectedIndices: [1]
});
```

## API

### `createSelectionMenu(options)`

Creates a selection menu element.

**Parameters:**

- `options.type` (string) - 'tag' or 'sort'
- `options.contrast` (string) - 'low' or 'high'
- `options.title` (string) - Header title
- `options.items` (Array<string>) - Item labels
- `options.sections` (Array<{title, items}>) - Grouped items (sort variant)
- `options.selectedIndex` (number) - Selected index (sort)
- `options.selectedIndices` (Array<number>) - Selected indices (tag)
- `options.showClear` (boolean) - Show clear button
- `options.showSelectAll` (boolean) - Show select all row
- `options.onSelect` (Function) - Item select handler
- `options.onClear` (Function) - Clear handler
- `options.onSelectAll` (Function) - Select all handler

**Returns:** `HTMLDivElement`

### `updateSelectionMenuContrast(menu, contrast)`

Updates contrast mode.

## Accessibility

- Uses button elements for actions
- Clickable items can be enhanced with keyboard support if needed
- Clear and Select all are separate actions

## Files

- `selection-menu.css` — Component styles
- `selection-menu.js` — JavaScript API
- `selection-menu.html` — Demo page
- `README-selection-menu.md` — Documentation
