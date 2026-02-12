# Button Destructive

**Design System Component - BMG-105**  
Figma: node-id=96-24819

## Overview

Destructive action button with low and high contrast variants. Supports optional icon and keyboard hint.

## Acceptance Criteria

- **States**: Idle, Hover
- **Color scheme**: Low, High contrast
- **Optional icon and keyboard hint**
- **user-select: none**

## Usage

```javascript
const button = createDestructiveButton({
  label: 'Delete',
  contrast: 'low'
});
```

## API

### `createDestructiveButton(options)`

Creates a destructive button element.

**Parameters:**
- `options.label` (string) - Button label
- `options.icon` (string|HTMLElement) - Optional icon
- `options.shortcutKeys` (Array<string>) - Optional keyboard shortcut keys
- `options.shortcutText` (boolean) - Use text display for shortcut keys
- `options.state` (string) - 'idle' or 'hover'
- `options.contrast` (string) - 'low' or 'high'
- `options.onClick` (function) - Click handler
- `options.disabled` (boolean) - Disabled state

**Returns:** `HTMLButtonElement`

### `updateDestructiveButtonLabel(button, label)`

Updates the button label.

### `updateDestructiveButtonContrast(button, contrast)`

Updates the contrast variant.

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--weight-regular: 400
--corner-radius-small: 4px
--corner-radius-pill: 999px
```

## Accessibility

- Uses a `button` element for keyboard access
- Keyboard hint uses `createKeyboardHint` if available

## Files

- `button-destructive.css` - Component styles
- `button-destructive.js` - Component logic
- `button-destructive.html` - Demo page
- `README-button-destructive.md` - Documentation
