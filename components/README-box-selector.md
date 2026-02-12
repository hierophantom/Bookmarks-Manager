# Box Selector

**Design System Component - BMG-107**  
Figma: node-id=99-8052

## Overview

Box selector for compact options and quick filters. Supports idle, hover, and active states.

## Acceptance Criteria

- **States**: Idle, Hover, Active
- **user-select: none**

## Usage

```javascript
const selector = createBoxSelector({
  label: 'A',
  state: 'idle'
});
```

## API

### `createBoxSelector(options)`

Creates a box selector element.

**Parameters:**
- `options.label` (string) - Label text
- `options.icon` (string|HTMLElement) - Optional icon
- `options.state` (string) - 'idle', 'hover', 'active'
- `options.onClick` (function) - Click handler
- `options.disabled` (boolean) - Disabled state

**Returns:** `HTMLButtonElement`

### `applyBoxSelectorState(selector, state)`

Applies state classes to the selector.

### `updateBoxSelectorLabel(selector, label)`

Updates the selector label.

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--weight-regular: 400
--corner-radius-small: 4px
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-10: rgba(255, 255, 255, 0.2)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--primary-primary-20: rgba(46, 51, 185, 0.8)
--primary-primary-25: #2e33b9
```

## Accessibility

- Uses a `button` element for keyboard access
- Disabled state uses `disabled` attribute

## Files

- `box-selector.css` - Component styles
- `box-selector.js` - Component logic
- `box-selector.html` - Demo page
- `README-box-selector.md` - Documentation
