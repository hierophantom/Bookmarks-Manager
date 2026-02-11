# Action Button

**Design System Component - BMG-96**  
Figma: `node-id=93-11917`

Icon-only button (32×32px) with three interactive states.

## Overview

The Action Button is a compact, icon-only button designed for quick actions and toolbar interfaces. It provides clear visual feedback for all interaction states and focuses on simplicity and consistency.

## Usage

### Basic Implementation

```javascript
const button = createActionButton({
  icon: '⚙️',
  label: 'Settings',
  onClick: () => {
    console.log('Settings clicked');
  }
});

document.body.appendChild(button);
```

### With Built-in Icons

```javascript
const addButton = createActionButton({
  icon: ACTION_BUTTON_ICONS.ADD,
  label: 'Add item',
  onClick: handleAddClick
});
```

### With Tooltip

```javascript
const shareButton = createActionButton({
  icon: ACTION_BUTTON_ICONS.SHARE,
  label: 'Share',
  tooltip: 'Share this page',
  onClick: handleShare
});
```

### Disabled State

```javascript
const button = createActionButton({
  icon: ACTION_BUTTON_ICONS.DELETE,
  label: 'Delete',
  disabled: true
});
```

## API

### `createActionButton(options)`

Creates an action button element.

**Parameters:**

- `options.icon` (string|HTMLElement, required) - Icon to display (emoji, SVG string, or element)
- `options.label` (string, optional) - Accessible label for screen readers
- `options.onClick` (Function, optional) - Click event handler
- `options.disabled` (boolean, optional) - Whether button is disabled (default: false)
- `options.tooltip` (string, optional) - Tooltip text (requires tooltip component)

**Returns:** `HTMLButtonElement`

### `updateActionButtonIcon(button, icon)`

Updates the button icon dynamically.

**Parameters:**

- `button` (HTMLButtonElement) - The action button element
- `icon` (string|HTMLElement) - New icon to display

### `toggleActionButtonDisabled(button, disabled)`

Toggles the disabled state of the button.

**Parameters:**

- `button` (HTMLButtonElement) - The action button element
- `disabled` (boolean) - Whether to disable the button

### `ACTION_BUTTON_ICONS`

Object containing preset icon constants:

```javascript
{
  SETTINGS: '⚙️',
  ADD: '+',
  EDIT: '✏️',
  DELETE: '🗑️',
  CLOSE: '✕',
  MENU: '☰',
  SEARCH: '🔍',
  STAR: '⭐',
  SHARE: '📤',
  DOWNLOAD: '⬇️',
  UPLOAD: '⬆️',
  REFRESH: '🔄',
  INFO: 'ℹ️',
  HELP: '?',
  MORE: '⋯'
}
```

## Design Specifications

### Dimensions

- **Size:** 32×32px (fixed)
- **Icon Size:** 24×24px (centered)
- **Border Radius:** 4px (corner-radius-small)

### States

#### Idle
- Background: `common-bright-05` (rgba(255, 255, 255, 0.1))
- Icon opacity: 0.9

#### Hover
- Background: Linear gradient overlay + `common-bright-05`
- Cursor: pointer
- Transition: 0.2s ease

#### Active (Pressed)
- Background: Darker gradient overlay + `common-bright-05`
- Transform: scale(0.98)
- Visual feedback for click

#### Disabled
- Opacity: 0.4
- Cursor: not-allowed
- No hover or active effects

#### Focus (Keyboard)
- Outline: 2px solid `primary-25` (#2e33b9)
- Outline offset: 2px
- Only visible on keyboard focus (`:focus-visible`)

### Design Tokens

```css
--corner-radius-small: 4px
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--primary-primary-25: #2e33b9
```

## Accessibility

- Always provide a descriptive `label` parameter for screen readers
- Keyboard accessible with visible focus indicator
- Proper disabled state handling
- ARIA labels automatically applied
- Supports keyboard navigation (Tab, Enter, Space)

## Best Practices

### Do's ✓

- Use for single, quick actions
- Provide clear, descriptive accessibility labels
- Use consistent icons across your interface
- Combine with tooltips for better UX
- Use in toolbars and compact interfaces

### Don'ts ✗

- Don't use for primary actions (use primary buttons instead)
- Don't add text labels (use Cube Action with Label for that)
- Don't use inconsistent icon sizes
- Don't forget accessibility labels
- Don't use for complex multi-step actions

## Examples

### Toolbar Actions

```javascript
const toolbar = document.createElement('div');
toolbar.style.display = 'flex';
toolbar.style.gap = '8px';

const actions = [
  { icon: ACTION_BUTTON_ICONS.EDIT, label: 'Edit', onClick: handleEdit },
  { icon: ACTION_BUTTON_ICONS.DELETE, label: 'Delete', onClick: handleDelete },
  { icon: ACTION_BUTTON_ICONS.SHARE, label: 'Share', onClick: handleShare }
];

actions.forEach(action => {
  const button = createActionButton(action);
  toolbar.appendChild(button);
});
```

### Dynamic Icon Update

```javascript
const button = createActionButton({
  icon: ACTION_BUTTON_ICONS.STAR,
  label: 'Toggle favorite'
});

let isFavorite = false;
button.addEventListener('click', () => {
  isFavorite = !isFavorite;
  updateActionButtonIcon(
    button,
    isFavorite ? '⭐' : '☆'
  );
});
```

### Conditional Disable

```javascript
const deleteButton = createActionButton({
  icon: ACTION_BUTTON_ICONS.DELETE,
  label: 'Delete selected items',
  disabled: true
});

// Enable when items are selected
function onSelectionChange(hasSelection) {
  toggleActionButtonDisabled(deleteButton, !hasSelection);
}
```

## Integration

Works seamlessly with other design system components:

- **Tooltip** - Add tooltips for better UX
- **Keyboard Shortcut Hint** - Show keyboard shortcuts in tooltips
- **Navigation Bar** - Use in navigation bars and toolbars

## Browser Support

- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓

## Files

- `action-button.css` - Component styles
- `action-button.js` - Component logic
- `action-button.html` - Interactive demo
- `README-action-button.md` - This documentation

## Related Components

- **Cube Action Button** (BMG-97) - Smaller 16×16px variant
- **Cube Action with Label** (BMG-98) - Button with icon + text label
- **Navigation Bar Button** (BMG-87) - Larger navigation buttons
