# Search Component

**Design System Component** — BMG-99  
**Figma:** node-id=93-12309

Search input field with optional keyboard shortcut hint and contrast variants.

## Overview

The Search Component is an actual input field (not a button) designed for inline search. It supports low and high contrast variants and can show keyboard shortcut hints for discoverability.

## Anatomy

- **Container**: rounded input field (height: 36px)
- **Icon**: 16x16px search icon
- **Input**: text field with placeholder
- **Keyboard Shortcut**: optional hint displayed on the right
- **Padding**: 12px horizontal, 8px vertical

## States

### Idle
- Background based on contrast variant
- Icon and placeholder in subtle colors

### Hover
- Background and border brighten
- Smooth transition (0.2s ease)

### Active (Focus)
- Border switches to primary color
- Icon uses text color

### Disabled
- Reduced opacity
- No pointer interactions

## Contrast Variants

### Low Contrast
- Background: `common-bright-05`
- Border: transparent
- Placeholder: `common-bright-15`

### High Contrast
- Background: `common-bright-10`
- Border: `common-bright-20`
- Placeholder: `common-bright-20`

## Design Tokens

```css
/* Typography */
--font-family-sans-serif: 'Lato', sans-serif
--size-large: 16px
--weight-regular: 400

/* Colors */
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-10: rgba(255, 255, 255, 0.2)
--common-common-bright-15: rgba(255, 255, 255, 0.6)
--common-common-bright-20: rgba(255, 255, 255, 0.8)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--primary-primary-25: #2e33b9

/* Border radius */
--corner-radius-medium: 8px
--corner-radius-pill: 999px
```

## Usage

### HTML

```html
<div class="search-comp search-comp--low">
  <span class="search-comp__icon" aria-hidden="true"></span>
  <input class="search-comp__input" type="text" placeholder="Search" aria-label="Search">
  <div class="search-comp__shortcut" aria-hidden="true">
    <span class="search-comp__shortcut-key">Cmd</span>
    <span class="search-comp__shortcut-key">K</span>
  </div>
</div>
```

### JavaScript API

```js
const search = createSearchComp({
  placeholder: 'Search bookmarks',
  shortcutKeys: ['Cmd', 'K'],
  contrast: 'low',
  onInput: (event, value) => console.log(value),
  onSubmit: (event, value) => console.log('submit', value)
});
```

## API

### `createSearchComp(options)`

Creates a search component element.

**Parameters:**

- `options.placeholder` (string) - Input placeholder text
- `options.value` (string) - Initial value
- `options.icon` (string|HTMLElement) - Custom icon (SVG string, URL, or element)
- `options.shortcutKeys` (Array<string>) - Keyboard shortcut keys to display
- `options.contrast` (string) - 'low' or 'high'
- `options.disabled` (boolean) - Whether input is disabled
- `options.onInput` (Function) - Input event handler
- `options.onSubmit` (Function) - Submit handler for Enter key
- `options.ariaLabel` (string) - Accessibility label

**Returns:** `HTMLDivElement`

### `updateSearchCompValue(searchComp, value)`

Updates the input value.

### `updateSearchCompPlaceholder(searchComp, placeholder)`

Updates the placeholder text.

### `toggleSearchCompDisabled(searchComp, disabled)`

Toggles the disabled state.

### `updateSearchCompShortcut(searchComp, keys)`

Updates the shortcut hint keys.

### `updateSearchCompContrast(searchComp, contrast)`

Updates contrast mode.

## Accessibility

- Uses native input for keyboard and screen reader support
- Includes `aria-label` for accessible naming
- Disabled state prevents interaction
- Focus state visible via border change

## Files

- `search-comp.css` — Component styles
- `search-comp.js` — JavaScript API
- `search-comp.html` — Demo page
- `README-search-comp.md` — Documentation
