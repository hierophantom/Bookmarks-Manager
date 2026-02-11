# Cube Action Button

**Design System Component - BMG-97**  
Figma: `node-id=93-11989`

Compact icon-only button (16×16px) with two color schemes for inline actions.

## Overview

The Cube Action Button is a smaller variant designed for inline actions within compact UI elements like cards, list items, and tags. Its reduced size (16×16px) makes it perfect for situations where space is limited but actions are still necessary.

**Important:** Due to its small size, cube action buttons should always include tooltips to clarify their function.

## Usage

### Basic Implementation

```javascript
const button = createCubeActionButton({
  icon: '✕',
  label: 'Close',
  tooltip: 'Close panel',
  colorScheme: 'default',
  onClick: () => {
    console.log('Close clicked');
  }
});

document.body.appendChild(button);
```

### With Built-in Icons

```javascript
const deleteButton = createCubeActionButton({
  icon: CUBE_ACTION_BUTTON_ICONS.DELETE,
  label: 'Delete',
  tooltip: 'Delete item',
  colorScheme: 'destructive',
  onClick: handleDelete
});
```

### Default vs Destructive

```javascript
// Default color scheme (neutral actions)
const editButton = createCubeActionButton({
  icon: CUBE_ACTION_BUTTON_ICONS.EDIT,
  label: 'Edit',
  tooltip: 'Edit item',
  colorScheme: 'default',
  onClick: handleEdit
});

// Destructive color scheme (dangerous actions)
const removeButton = createCubeActionButton({
  icon: CUBE_ACTION_BUTTON_ICONS.CLOSE,
  label: 'Remove',
  tooltip: 'Remove from list',
  colorScheme: 'destructive',
  onClick: handleRemove
});
```

## API

### `createCubeActionButton(options)`

Creates a cube action button element.

**Parameters:**

- `options.icon` (string|HTMLElement, required) - Icon to display
- `options.label` (string, optional) - Accessible label for screen readers
- `options.tooltip` (string, optional but recommended) - Tooltip text
- `options.onClick` (Function, optional) - Click event handler
- `options.disabled` (boolean, optional) - Whether button is disabled (default: false)
- `options.colorScheme` (string, optional) - 'default' or 'destructive' (default: 'default')

**Returns:** `HTMLButtonElement`

### `updateCubeActionButtonIcon(button, icon)`

Updates the button icon dynamically.

**Parameters:**

- `button` (HTMLButtonElement) - The cube action button element
- `icon` (string|HTMLElement) - New icon to display

### `updateCubeActionButtonColorScheme(button, colorScheme)`

Updates the button color scheme.

**Parameters:**

- `button` (HTMLButtonElement) - The cube action button element
- `colorScheme` (string) - 'default' or 'destructive'

### `toggleCubeActionButtonDisabled(button, disabled)`

Toggles the disabled state of the button.

**Parameters:**

- `button` (HTMLButtonElement) - The cube action button element
- `disabled` (boolean) - Whether to disable the button

### `CUBE_ACTION_BUTTON_ICONS`

Object containing preset icon constants:

```javascript
{
  CLOSE: '✕',
  DELETE: '🗑',
  EDIT: '✏',
  ADD: '+',
  REMOVE: '−',
  CHECK: '✓',
  SETTINGS: '⚙',
  MORE: '⋯',
  UP: '↑',
  DOWN: '↓',
  LEFT: '←',
  RIGHT: '→',
  REFRESH: '↻',
  HELP: '?',
  INFO: 'ℹ'
}
```

## Design Specifications

### Dimensions

- **Size:** 16×16px (fixed)
- **Icon Size:** 12×12px (centered)
- **Border Radius:** 4px (corner-radius-small)

### Color Schemes

#### Default
- **Idle:** Transparent background, icon at 70% opacity
- **Hover:** `common-bright-05` background, icon at 100% opacity
- Use for: Neutral actions (edit, settings, navigation)

#### Destructive
- **Idle:** Transparent background, red icon (#ff4444) at 70% opacity
- **Hover:** Red tinted background (rgba(255, 68, 68, 0.1)), lighter red icon (#ff6666)
- Use for: Dangerous actions (delete, remove, close with discard)

### States

#### Idle
- Background: Transparent
- Icon opacity: 0.7

#### Hover
- Background: Color scheme dependent
- Icon opacity: 1.0
- Cursor: pointer
- Transition: 0.2s ease

#### Active (Pressed)
- Transform: scale(0.95)
- Visual feedback for click

#### Disabled
- Opacity: 0.3
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
--common-common-bright-20: rgba(255, 255, 255, 0.4)
--common-common-bright-25: rgba(255, 255, 255, 0.5)
--primary-primary-25: #2e33b9
```

## Accessibility

- **Mandatory:** Always provide `label` parameter for screen readers
- **Recommended:** Always include `tooltip` due to small size
- Keyboard accessible with visible focus indicator
- Proper disabled state handling
- ARIA labels automatically applied
- Supports keyboard navigation (Tab, Enter, Space)

## Best Practices

### Do's ✓

- Always include tooltips to explain the action
- Use in compact UI contexts (cards, list items, tags)
- Use destructive scheme for dangerous actions
- Provide clear, descriptive accessibility labels
- Use consistent icons across your interface

### Don'ts ✗

- Don't use without tooltips (too small to be self-explanatory)
- Don't use for primary actions (use larger action buttons)
- Don't use when there's space for button with label
- Don't forget accessibility labels
- Don't use inconsistent color schemes for same actions

## Examples

### Card Header Actions

```javascript
const cardHeader = document.createElement('div');
cardHeader.style.display = 'flex';
cardHeader.style.justifyContent = 'space-between';
cardHeader.style.alignItems = 'center';
cardHeader.style.padding = '12px 16px';

const title = document.createElement('span');
title.textContent = 'Card Title';
cardHeader.appendChild(title);

const actions = document.createElement('div');
actions.style.display = 'flex';
actions.style.gap = '8px';

const editBtn = createCubeActionButton({
  icon: CUBE_ACTION_BUTTON_ICONS.EDIT,
  label: 'Edit card',
  tooltip: 'Edit',
  colorScheme: 'default',
  onClick: handleEdit
});

const closeBtn = createCubeActionButton({
  icon: CUBE_ACTION_BUTTON_ICONS.CLOSE,
  label: 'Close card',
  tooltip: 'Close',
  colorScheme: 'default',
  onClick: handleClose
});

actions.appendChild(editBtn);
actions.appendChild(closeBtn);
cardHeader.appendChild(actions);
```

### Tag with Remove Button

```javascript
function createRemovableTag(label) {
  const tag = document.createElement('div');
  tag.style.display = 'flex';
  tag.style.gap = '6px';
  tag.style.alignItems = 'center';
  tag.style.padding = '4px 8px';
  tag.style.background = 'rgba(46, 51, 185, 0.2)';
  tag.style.borderRadius = '4px';
  
  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.fontSize = '12px';
  tag.appendChild(labelEl);
  
  const removeBtn = createCubeActionButton({
    icon: CUBE_ACTION_BUTTON_ICONS.CLOSE,
    label: `Remove ${label}`,
    tooltip: 'Remove',
    colorScheme: 'default',
    onClick: () => tag.remove()
  });
  
  tag.appendChild(removeBtn);
  return tag;
}
```

### List Item Actions

```javascript
const listItem = document.createElement('div');
listItem.style.display = 'flex';
listItem.style.justifyContent = 'space-between';
listItem.style.alignItems = 'center';
listItem.style.padding = '12px 16px';

const itemText = document.createElement('span');
itemText.textContent = 'List Item';
listItem.appendChild(itemText);

const actions = document.createElement('div');
actions.style.display = 'flex';
actions.style.gap = '8px';

const settingsBtn = createCubeActionButton({
  icon: CUBE_ACTION_BUTTON_ICONS.SETTINGS,
  label: 'Settings',
  tooltip: 'Item settings',
  colorScheme: 'default',
  onClick: handleSettings
});

const deleteBtn = createCubeActionButton({
  icon: CUBE_ACTION_BUTTON_ICONS.DELETE,
  label: 'Delete',
  tooltip: 'Delete item',
  colorScheme: 'destructive',
  onClick: handleDelete
});

actions.appendChild(settingsBtn);
actions.appendChild(deleteBtn);
listItem.appendChild(actions);
```

## Integration

Works seamlessly with other design system components:

- **Tooltip** - Essential for cube action buttons
- **Tag** - Perfect for removable tags
- **Modal** - Use in modal headers
- **Cards** - Use in card headers and toolbars

## Browser Support

- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓

## Files

- `cube-action-button.css` - Component styles
- `cube-action-button.js` - Component logic
- `cube-action-button.html` - Interactive demo
- `README-cube-action-button.md` - This documentation

## Related Components

- **Action Button** (BMG-96) - Larger 32×32px variant
- **Cube Action with Label** (BMG-98) - Variant with text label
- **Tooltip** (BMG-95) - Required for proper UX
