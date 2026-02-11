# Selection Field

**Design System Component** — BMG-101  
**Figma:** node-id=93-12599

Dropdown field that triggers the Selection Menu component. Supports multiple states and contrast variants.

## Overview

The Selection Field is a compact dropdown trigger used to open a Selection Menu. It supports four states and two contrast modes. The active state shows an expanded menu beneath the field.

## Anatomy

- **Container**: 200x36px field with padding 12px/8px
- **Label**: text label or selection summary
- **Icon**: chevron down/up icon (16px)
- **Menu**: Selection Menu component (when active)

## States

- **Idle**: default state
- **Hover**: highlighted background
- **Active**: open state with menu visible
- **Selection applied**: summary text shown ("X tags selected")

## Contrast Variants

### Low Contrast
- Background: `primary-10`
- Hover/Active: `primary-15`
- Active border: `primary-25`
- Text: `common-bright-20`

### High Contrast
- Background: `primary-10` (higher opacity)
- Hover/Active: `primary-15` (higher opacity)
- Active border: `primary-25` (reduced opacity)
- Text: `common-dark-10`

## Design Tokens

```css
--primary-primary-10: rgba(46, 51, 185, 0.4)
--primary-primary-15: rgba(46, 51, 185, 0.6)
--primary-primary-25: #2e33b9
--common-common-bright-20: rgba(255, 255, 255, 0.8)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--common-common-dark-10: rgba(0, 0, 0, 0.8)
--corner-radius-small: 4px
```

## Usage

### HTML

```html
<div class="selection-field selection-field--low selection-field--idle">
  <div class="selection-field__label">Label</div>
  <span class="selection-field__icon"></span>
</div>
```

### JavaScript API

```js
const field = createSelectionField({
  label: 'Label',
  state: 'idle',
  contrast: 'low'
});
```

## API

### `createSelectionField(options)`

Creates a selection field element.

**Parameters:**

- `options.label` (string) - Field label
- `options.selectionText` (string) - Selection summary text
- `options.state` (string) - 'idle', 'hover', 'active', 'selection'
- `options.contrast` (string) - 'low' or 'high'
- `options.menu` (HTMLElement) - Optional selection menu
- `options.onToggle` (Function) - Toggle handler

**Returns:** `HTMLDivElement`

### `applySelectionFieldState(field, state)`

Applies state classes to the field.

### `updateSelectionFieldLabel(field, label)`

Updates the field label.

### `updateSelectionFieldContrast(field, contrast)`

Updates contrast mode.

## Accessibility

- Uses button-like div (add role="button" if needed)
- Active state indicates expanded menu
- Menu uses separate component

## Files

- `selection-field.css` — Component styles
- `selection-field.js` — JavaScript API
- `selection-field.html` — Demo page
- `README-selection-field.md` — Documentation
