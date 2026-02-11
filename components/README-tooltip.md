# Tooltip Component

Design System Component - BMG-95

## Overview

A contextual tooltip that displays additional information when hovering over elements. Positions 4px away from the calling component.

## Figma Reference

[View in Figma](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=92-10132)

## Acceptance Criteria

- **user-select: none**

## Anatomy

- **Height**: 18px
- **Padding**: 2px vertical, 4px horizontal
- **Background**: common-dark-25 (rgba(0, 0, 0, 0.8))
- **Border radius**: Small (4px)
- **Text**: Label-Reg (12px regular)
- **Spacing**: 4px from calling component
- **Max width**: 200px (with ellipsis)

## Behavior

- Tooltip appears **4px above** the calling component by default
- Can be positioned top, bottom, left, or right
- Fades in/out on show/hide
- No hover state (static appearance)
- Non-interactive (pointer-events: none)

## Usage

### Automatic Tooltip

```javascript
const tooltip = createTooltip({
  text: 'Delete bookmark',
  target: buttonElement,
  position: 'top'
});

// Tooltip shows/hides automatically on hover
```

### Manual Control

```javascript
const tooltip = createTooltipElement('Edit');
const tooltipControl = createTooltip({
  text: 'Edit',
  target: buttonElement,
  hoverOnly: false
});

// Show manually
tooltipControl.show();

// Hide manually  
tooltipControl.hide();

// Cleanup
tooltipControl.destroy();
```

### Position Variants

```javascript
// Top (default)
createTooltip({
  text: 'Top tooltip',
  target: element,
  position: 'top'
});

// Bottom
createTooltip({
  text: 'Bottom tooltip',
  target: element,
  position: 'bottom'
});

// Left/Right
createTooltip({ text: 'Left', target: el, position: 'left' });
createTooltip({ text: 'Right', target: el, position: 'right' });
```

### Show Delay

```javascript
// Instant
createTooltip({ text: 'Now', target: el, delay: 'instant' });

// Fast (200ms, default)
createTooltip({ text: 'Fast', target: el, delay: 'fast' });

// Slow (800ms)
createTooltip({ text: 'Later', target: el, delay: 'slow' });
```

## API

### `createTooltipElement(text, position, delay)`

Creates a tooltip element without attaching it.

**Parameters:**
- `text` (string) - Tooltip text content **(required)**
- `position` (string, optional) - Position: 'top', 'bottom', 'left', 'right' (default: 'top')
- `delay` (string, optional) - Show delay: 'instant', 'fast', 'slow' (default: 'fast')

**Returns:** `HTMLDivElement`

### `createTooltip(options)`

Creates a tooltip with automatic hover behavior.

**Parameters:**
- `options.text` (string) - Tooltip text **(required)**
- `options.target` (HTMLElement) - Target element **(required)**
- `options.position` (string, optional) - Position relative to target (default: 'top')
- `options.delay` (string, optional) - Show delay (default: 'fast')
- `options.hoverOnly` (boolean, optional) - Only show on hover (default: true)

**Returns:** `Object` - Control object with `{element, show, hide, destroy}`

### `showTooltip(tooltip, target, position)`

Shows a tooltip relative to a target element.

**Parameters:**
- `tooltip` (HTMLDivElement) - The tooltip element
- `target` (HTMLElement) - Target element
- `position` (string, optional) - Position (default: 'top')

### `hideTooltip(tooltip)`

Hides a tooltip.

**Parameters:**
- `tooltip` (HTMLDivElement) - The tooltip element

### `updateTooltipText(tooltip, text)`

Updates tooltip text content.

**Parameters:**
- `tooltip` (HTMLDivElement) - The tooltip element
- `text` (string) - New text content

### `updateTooltipPosition(tooltip, position)`

Updates tooltip position.

**Parameters:**
- `tooltip` (HTMLDivElement) - The tooltip element
- `position` (string) - New position: 'top', 'bottom', 'left', 'right'

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--weight-regular: 400
--common-common-dark-25: rgba(0, 0, 0, 0.8)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--corner-radius-small: 4px
```

## Accessibility

- Uses `role="tooltip"` for screen readers
- Hidden with `aria-hidden="true"` when not visible
- Non-interactive (pointer-events: none)
- Text is selectable when visible
- Respects user motion preferences

## Animation

- Fade in/out: 0.2s ease
- Slide: 4px toward calling element
- Respects reduced motion preferences
- Delay based on variant (0ms, 200ms, 800ms)

## Examples

```javascript
// Icon button tooltip
const deleteBtn = document.getElementById('delete');
createTooltip({
  text: 'Delete bookmark',
  target: deleteBtn,
  position: 'top',
  delay: 'fast'
});

// Form field hint
const emailInput = document.getElementById('email');
createTooltip({
  text: 'Enter your email address',
  target: emailInput,
  position: 'right'
});

// Disabled button explanation
const saveBtn = document.getElementById('save');
createTooltip({
  text: 'Complete all fields to save',
  target: saveBtn,
  position: 'bottom'
});

// Dynamic tooltip
const tooltip = createTooltip({
  text: 'Loading...',
  target: statusIcon,
  hoverOnly: false
});

// Update based on state
function updateStatus(status) {
  updateTooltipText(tooltip.element, `Status: ${status}`);
  tooltip.show();
}
```

## Common Patterns

### Icon Grid
```javascript
const icons = document.querySelectorAll('.icon-button');
icons.forEach(icon => {
  createTooltip({
    text: icon.getAttribute('aria-label'),
    target: icon,
    position: 'top'
  });
});
```

### Form Validation
```javascript
const input = document.getElementById('username');
const tooltip = createTooltip({
  text: '',
  target: input,
  position: 'right',
  hoverOnly: false
});

input.addEventListener('invalid', (e) => {
  updateTooltipText(tooltip.element, e.target.validationMessage);
  tooltip.show();
});
```

## Notes

- Tooltip will show 4px above calling component by default
- Max width is 200px with text truncation
- Background is semi-transparent dark (80% opacity)
- No interaction is possible with tooltip itself
- Automatically handles cleanup on destroy
