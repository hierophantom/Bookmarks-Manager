# Cube Action Button with Label

**Design System Component - BMG-98**  
Figma: `node-id=93-12064`

Compact button with icon (12×12px) and text label, designed for space-efficient actions.

## Overview

The Cube Action Button with Label provides a balance between compactness and clarity by combining a small icon with a text label. It is ideal for toolbars, filter bars, and inline actions where a full-size button would be too large.

## Usage

### Basic Implementation

```javascript
const button = createCubeActionButtonWithLabel({
  icon: '+',
  label: 'Add Item',
  colorScheme: 'primary',
  onClick: () => {
    console.log('Add clicked');
  }
});

document.body.appendChild(button);
```

### With Built-in Icons

```javascript
const saveButton = createCubeActionButtonWithLabel({
  icon: CUBE_ACTION_WITH_LABEL_ICONS.SAVE,
  label: 'Save',
  colorScheme: 'primary',
  onClick: handleSave
});
```

### Color Schemes

```javascript
// Primary actions
const primaryButton = createCubeActionButtonWithLabel({
  icon: CUBE_ACTION_WITH_LABEL_ICONS.ADD,
  label: 'Add',
  colorScheme: 'primary'
});

// Neutral actions
const defaultButton = createCubeActionButtonWithLabel({
  icon: CUBE_ACTION_WITH_LABEL_ICONS.SETTINGS,
  label: 'Settings',
  colorScheme: 'default'
});

// Destructive actions
const destructiveButton = createCubeActionButtonWithLabel({
  icon: CUBE_ACTION_WITH_LABEL_ICONS.DELETE,
  label: 'Delete',
  colorScheme: 'destructive'
});
```

### Icon Only Mode

```javascript
const iconOnlyButton = createCubeActionButtonWithLabel({
  icon: CUBE_ACTION_WITH_LABEL_ICONS.BOOKMARK,
  label: '',
  colorScheme: 'primary'
});
```

## API

### `createCubeActionButtonWithLabel(options)`

Creates a cube action button with label element.

**Parameters:**

- `options.icon` (string|HTMLElement, required) - Icon to display
- `options.label` (string, required) - Button label text
- `options.onClick` (Function, optional) - Click event handler
- `options.disabled` (boolean, optional) - Whether button is disabled (default: false)
- `options.colorScheme` (string, optional) - 'primary', 'default', or 'destructive' (default: 'default')
- `options.size` (string, optional) - 'small' or 'medium' (default: 'small')
- `options.tooltip` (string, optional) - Tooltip text

**Returns:** `HTMLButtonElement`

### `updateCubeActionButtonWithLabelText(button, label)`

Updates the button label text.

### `updateCubeActionButtonWithLabelIcon(button, icon)`

Updates the button icon.

### `updateCubeActionButtonWithLabelColorScheme(button, colorScheme)`

Updates the button color scheme.

### `toggleCubeActionButtonWithLabelDisabled(button, disabled)`

Toggles the disabled state.

### `CUBE_ACTION_WITH_LABEL_ICONS`

Object containing preset icon constants:

```javascript
{
  ADD: '+',
  EDIT: '✏',
  DELETE: '🗑',
  SAVE: '💾',
  CANCEL: '✕',
  CONFIRM: '✓',
  DOWNLOAD: '⬇',
  UPLOAD: '⬆',
  SHARE: '↗',
  SETTINGS: '⚙',
  FILTER: '⚑',
  SORT: '⇅',
  SEARCH: '🔍',
  REFRESH: '↻',
  STAR: '⭐',
  BOOKMARK: '🔖',
  TAG: '#',
  FOLDER: '📁',
  LINK: '🔗',
  MORE: '⋯'
}
```

## Design Specifications

### Dimensions

- **Height (Small):** 14px
- **Height (Medium):** 20px
- **Icon Size (Small):** 12×12px
- **Icon Size (Medium):** 16×16px
- **Gap:** 4px (spacing-medium)
- **Padding (Small):** 4px 8px (spacing-medium, spacing-large)
- **Padding (Medium):** 4px 12px
- **Border Radius:** 4px (corner-radius-small)

### Typography

- **Font Family:** Lato
- **Font Size (Small):** 12px (label-sma)
- **Font Size (Medium):** 14px
- **Font Weight:** 400 (label-sma)
- **Line Height:** 1

### Color Schemes

#### Primary
- **Text/Icon:** `primary-25` (#2e33b9)
- **Hover Background:** `primary-20` (rgba(46, 51, 185, 0.1))
- **Active Background:** `primary-25` (rgba(46, 51, 185, 0.15))

#### Default
- **Text/Icon:** `common-bright-20` (rgba(255, 255, 255, 0.4))
- **Hover Background:** `common-bright-05` (rgba(255, 255, 255, 0.1))
- **Active Background:** `common-bright-10` (rgba(255, 255, 255, 0.15))

#### Destructive
- **Text/Icon:** #ff4444
- **Hover Background:** rgba(255, 68, 68, 0.1)
- **Active Background:** rgba(255, 68, 68, 0.15)

### States

#### Idle
- Background: Transparent
- Text/Icon: Color scheme dependent

#### Hover
- Background: Color scheme dependent
- Cursor: pointer
- Transition: 0.2s ease

#### Active (Pressed)
- Transform: scale(0.98)
- Background: Darker overlay

#### Disabled
- Opacity: 0.4
- Cursor: not-allowed

#### Focus (Keyboard)
- Outline: 2px solid `primary-25` (#2e33b9)
- Outline offset: 2px

### Design Tokens

```css
--corner-radius-small: 4px
--spacing-medium: 4px
--spacing-large: 8px
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-10: rgba(255, 255, 255, 0.15)
--common-common-bright-20: rgba(255, 255, 255, 0.4)
--common-common-bright-25: rgba(255, 255, 255, 0.5)
--primary-primary-20: rgba(46, 51, 185, 0.1)
--primary-primary-25: #2e33b9
```

## Accessibility

- Provide meaningful `label` for screen readers
- Keyboard accessible with visible focus indicator
- Proper disabled state handling
- ARIA labels automatically applied
- Use tooltips when label might be truncated

## Best Practices

### Do's ✓

- Use for compact actions that still need text clarity
- Choose color scheme based on action severity
- Keep labels short and clear
- Use in toolbars, filters, and inline actions
- Maintain consistent icon usage

### Don'ts ✗

- Don't use long text labels (use full-size buttons)
- Don't mix color schemes for similar actions
- Don't use without icons if other actions have icons
- Don't forget accessibility labels

## Examples

### Filter Bar

```javascript
const filters = ['All', 'Active', 'Completed'];
filters.forEach(filter => {
  const btn = createCubeActionButtonWithLabel({
    icon: CUBE_ACTION_WITH_LABEL_ICONS.FILTER,
    label: filter,
    colorScheme: 'default'
  });
  filterBar.appendChild(btn);
});
```

### Form Actions

```javascript
const saveBtn = createCubeActionButtonWithLabel({
  icon: CUBE_ACTION_WITH_LABEL_ICONS.CONFIRM,
  label: 'Save Changes',
  colorScheme: 'primary',
  onClick: handleSave
});

const cancelBtn = createCubeActionButtonWithLabel({
  icon: CUBE_ACTION_WITH_LABEL_ICONS.CANCEL,
  label: 'Cancel',
  colorScheme: 'destructive',
  onClick: handleCancel
});
```

### Toolbar Actions

```javascript
const toolbarActions = [
  { icon: CUBE_ACTION_WITH_LABEL_ICONS.ADD, label: 'New' },
  { icon: CUBE_ACTION_WITH_LABEL_ICONS.DOWNLOAD, label: 'Export' },
  { icon: CUBE_ACTION_WITH_LABEL_ICONS.REFRESH, label: 'Refresh' }
];

toolbarActions.forEach(action => {
  const btn = createCubeActionButtonWithLabel({
    icon: action.icon,
    label: action.label,
    colorScheme: 'default'
  });
  toolbar.appendChild(btn);
});
```

## Integration

Works seamlessly with other design system components:

- **Action Button** (BMG-96) - Larger icon-only variant
- **Cube Action Button** (BMG-97) - Smaller icon-only variant
- **Tooltip** (BMG-95) - Optional for additional context

## Browser Support

- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓

## Files

- `cube-action-button-with-label.css` - Component styles
- `cube-action-button-with-label.js` - Component logic
- `cube-action-button-with-label.html` - Interactive demo
- `README-cube-action-button-with-label.md` - This documentation

## Related Components

- **Cube Action Button** (BMG-97) - Icon-only, smaller
- **Action Button** (BMG-96) - Icon-only, larger
- **Navigation Bar Button** (BMG-87) - Full-size navigation buttons
