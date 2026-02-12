# Button Common

**Design System Component - BMG-104**  
Figma: node-id=96-22667

## Overview

Neutral button style for secondary actions. Supports low and high contrast variants with optional icon and keyboard hint.

## Acceptance Criteria

- **States**: Idle, Hover
- **Color scheme**: Low, High contrast
- **Optional icon and keyboard hint**
- **user-select: none**

## Usage

```javascript
const button = createCommonButton({
  label: 'Cancel',
  contrast: 'low'
});
```

## API

### `createCommonButton(options)`

Creates a common button element.

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

### `updateCommonButtonLabel(button, label)`

Updates the button label.

### `updateCommonButtonContrast(button, contrast)`

Updates the contrast variant.

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--weight-regular: 400
--corner-radius-small: 4px
--corner-radius-pill: 999px
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-10: rgba(255, 255, 255, 0.2)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--common-common-dark-10: rgba(0, 0, 0, 0.4)
--common-common-dark-15: rgba(0, 0, 0, 0.6)
```

## Accessibility

- Uses a `button` element for keyboard access
- Keyboard hint uses `createKeyboardHint` if available

## Files

- `button-common.css` - Component styles
- `button-common.js` - Component logic
- `button-common.html` - Demo page
- `README-button-common.md` - Documentation
