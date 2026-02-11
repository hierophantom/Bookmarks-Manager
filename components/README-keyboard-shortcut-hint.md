## Keyboard Shortcut Hint Component

Design System Component - BMG-92

## Overview

A pill-shaped container displaying keyboard shortcut keys or symbols. Static display with no hover state, designed to show keyboard shortcuts in UI elements.

## Figma Reference

[View in Figma](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=92-9900)

## Anatomy

- **Container**: 20px height, 4px horizontal padding, pill-shaped border radius
- **Icons/Keys**: 6px × 6px, 2px gap between
- **Background**: common-bright-05 (rgba(255, 255, 255, 0.1))
- **Can contain any amount of icons**

## States

No hover state - static display only.

## Usage

### Create Hint with Symbols

```javascript
const hint = createKeyboardHint(['⌘', 'K']);
// Displays: ⌘ K
```

### Create Hint with Text

```javascript
const hint = createKeyboardHint(['Ctrl', 'Shift', 'P'], true);
// Displays: Ctrl + Shift + P
```

### Use Presets

```javascript
// macOS
const cmdK = createKeyboardHintPreset('CMD_K');
const cmdS = createKeyboardHintPreset('CMD_S');
const cmdShiftP = createKeyboardHintPreset('CMD_SHIFT_P');

// Windows/Linux
const ctrlK = createKeyboardHintPreset('CTRL_K', true);

// Universal
const slash = createKeyboardHintPreset('SLASH');
const esc = createKeyboardHintPreset('ESCAPE');
```

### Size Variants

```javascript
const small = createKeyboardHint(['⌘', 'K'], false, 'small');
const normal = createKeyboardHint(['⌘', 'K'], false, 'default');
const large = createKeyboardHint(['⌘', 'K'], false, 'large');
```

### Update Hint

```javascript
const hint = createKeyboardHint(['⌘', 'K']);

// Change shortcut
updateKeyboardHint(hint, ['⌘', 'Shift', 'K']);
```

## API

### `createKeyboardHint(keys, useText, size)`

Creates a keyboard shortcut hint element.

**Parameters:**
- `keys` (Array<string>) - Array of key symbols or text
- `useText` (boolean, optional) - Whether to display as text (default: false)
- `size` (string, optional) - Size variant: 'small', 'default', 'large' (default: 'default')

**Returns:** `HTMLDivElement`

### `updateKeyboardHint(hint, keys, useText)`

Updates keyboard hint keys.

**Parameters:**
- `hint` (HTMLDivElement) - The keyboard hint element
- `keys` (Array<string>) - New array of keys
- `useText` (boolean, optional) - Whether to display as text

### `createKeyboardHintPreset(preset, useText)`

Creates a keyboard hint from a preset.

**Parameters:**
- `preset` (string) - Preset name from `KEYBOARD_SHORTCUTS`
- `useText` (boolean, optional) - Whether to display as text

**Returns:** `HTMLDivElement`

### Available Presets

#### macOS
- `CMD_K` - ⌘ K
- `CMD_S` - ⌘ S
- `CMD_E` - ⌘ E
- `CMD_SHIFT_P` - ⌘ ⇧ P
- `CMD_OPTION_I` - ⌘ ⌥ I

#### Windows/Linux
- `CTRL_K` - Ctrl K
- `CTRL_S` - Ctrl S
- `CTRL_E` - Ctrl E
- `CTRL_SHIFT_P` - Ctrl Shift P

#### Universal
- `SLASH` - /
- `ESCAPE` - Esc
- `ENTER` - ↵
- `TAB` - Tab

## Design Tokens

```css
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--corner-radius-pill: 999px
--font-family-sans-serif: 'Lato', sans-serif
--weight-regular: 400
```

## Accessibility

- Uses `role="img"` for screen readers
- Includes `aria-label` with full shortcut description
- Icons have `aria-hidden="true"`
- Non-interactive (pointer-events: none)

## Examples

```javascript
// In a search bar
const searchBar = document.createElement('button');
searchBar.textContent = 'Search...';
searchBar.appendChild(createKeyboardHintPreset('CMD_K'));

// In a button
const saveBtn = document.createElement('button');
saveBtn.textContent = 'Save';
saveBtn.appendChild(createKeyboardHintPreset('CMD_S'));

// Custom combination
const customHint = createKeyboardHint(['⌥', '⇧', 'F']);

// Cross-platform
const isMac = navigator.platform.includes('Mac');
const searchHint = isMac 
  ? createKeyboardHintPreset('CMD_K')
  : createKeyboardHintPreset('CTRL_K', true);
```

## Notes

- No hover state required per design specs
- Can contain any number of key icons
- Automatically adds separators between text keys
- Optimized for inline display alongside text
