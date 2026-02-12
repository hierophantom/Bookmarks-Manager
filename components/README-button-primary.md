# Button Primary

**Design System Component - BMG-103**  
Figma: node-id=96-16677

## Overview

Primary action button with low and high contrast variants. Supports optional icon and keyboard hint.

## Acceptance Criteria

- **States**: Idle, Hover
- **Color scheme**: Low, High contrast
- **Optional icon and keyboard hint**
- **user-select: none**

## Usage

```javascript
const button = createPrimaryButton({
  label: 'Save',
  contrast: 'low'
});
```

## API

### `createPrimaryButton(options)`

Creates a primary button element.

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

### `updatePrimaryButtonLabel(button, label)`

Updates the button label.

### `updatePrimaryButtonContrast(button, contrast)`

Updates the contrast variant.

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--weight-regular: 400
--corner-radius-small: 4px
--corner-radius-pill: 999px
--primary-primary-10: rgba(46, 51, 185, 0.4)
--primary-primary-15: rgba(46, 51, 185, 0.6)
--primary-primary-20: rgba(46, 51, 185, 0.8)
--primary-primary-25: #2e33b9
--common-common-bright-25: rgba(255, 255, 255, 0.9)
```

## Accessibility

- Uses a `button` element for keyboard access
- Keyboard hint uses `createKeyboardHint` if available

## Files

- `button-primary.css` - Component styles
- `button-primary.js` - Component logic
- `button-primary.html` - Demo page
- `README-button-primary.md` - Documentation
