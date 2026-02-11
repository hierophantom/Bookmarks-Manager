# Text Field

**Design System Component** — BMG-100  
**Figma:** node-id=93-12485

Text input field with low and high contrast variants.

## Overview

The Text Field component is a standard input element styled to match the design system. It supports contrast variants and provides consistent hover and focus states.

## Anatomy

- **Container**: rounded input field (height: 36px)
- **Input**: text field with placeholder
- **Padding**: 12px horizontal, 8px vertical

## States

### Idle
- Background based on contrast variant
- Placeholder uses muted color

### Hover
- Background and border brighten

### Active (Focus)
- Border switches to primary color

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
```

## Usage

### HTML

```html
<div class="text-field text-field--low">
  <input class="text-field__input" type="text" placeholder="Enter value" aria-label="Text field">
</div>
```

### JavaScript API

```js
const field = createTextField({
  placeholder: 'Enter name',
  contrast: 'low',
  onInput: (event, value) => console.log(value),
  onSubmit: (event, value) => console.log('submit', value)
});
```

## API

### `createTextField(options)`

Creates a text field element.

**Parameters:**

- `options.placeholder` (string) - Input placeholder text
- `options.value` (string) - Initial value
- `options.type` (string) - Input type (default: 'text')
- `options.contrast` (string) - 'low' or 'high'
- `options.disabled` (boolean) - Whether input is disabled
- `options.onInput` (Function) - Input event handler
- `options.onSubmit` (Function) - Submit handler for Enter key
- `options.ariaLabel` (string) - Accessibility label

**Returns:** `HTMLDivElement`

### `updateTextFieldValue(textField, value)`

Updates the input value.

### `updateTextFieldPlaceholder(textField, placeholder)`

Updates the placeholder text.

### `toggleTextFieldDisabled(textField, disabled)`

Toggles the disabled state.

### `updateTextFieldContrast(textField, contrast)`

Updates contrast mode.

## Accessibility

- Uses native input for keyboard and screen reader support
- Includes `aria-label` for accessible naming
- Disabled state prevents interaction
- Focus state visible via border change

## Files

- `text-field.css` — Component styles
- `text-field.js` — JavaScript API
- `text-field.html` — Demo page
- `README-text-field.md` — Documentation
