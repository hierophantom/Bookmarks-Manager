# Tag Component

Design System Component - BMG-94

## Overview

A pill-shaped tag component for categorization and filtering. Supports idle and hover states, low/high contrast variants, and optional remove button.

## Figma Reference

[View in Figma](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=92-10046)

## Acceptance Criteria

- **States**: Idle, Hover
- **Color scheme**: High/Low contrast
- **Optional X button** for removal
- **user-select: none**

## Anatomy

- **Height**: 16px
- **Padding**: 8px horizontal
- **Border radius**: Pill (999px)
- **Icon**: 8×8px close icon (optional)
- **Text**: 12px light weight (Subtitle)
- **Gap**: 4px between text and icon

## States

### Idle
- Low contrast: `common-bright-05` background
- High contrast: `common-dark-10` background

### Hover
- Subtle gradient overlay
- Increased opacity on remove icon

## Usage

### Basic Tag

```javascript
const tag = createTag({
  text: 'JavaScript'
});
```

### Tag with Remove Button

```javascript
const tag = createTag({
  text: 'React',
  contrast: 'high',
  removable: true,
  onRemove: (tagEl) => {
    tagEl.remove();
    console.log('Tag removed');
  }
});
```

### Clickable Tag

```javascript
const tag = createTag({
  text: 'Frontend',
  onClick: (tagEl) => {
    console.log('Tag clicked');
  }
});
```

### Tag List

```javascript
const tagList = createTagList([
  { text: 'Work', contrast: 'high', removable: true },
  { text: 'Personal', contrast: 'high', removable: true },
  { text: 'Development', contrast: 'low' }
], { gap: '8px', wrap: true });

container.appendChild(tagList);
```

### Custom Colors

```javascript
const tag = createTag({
  text: 'Important',
  customColor: {
    background: '#ef4444',
    text: '#ffffff'
  }
});
```

## API

### `createTag(options)`

Creates a tag element.

**Parameters:**
- `options.text` (string) - Tag text content **(required)**
- `options.contrast` (string, optional) - Contrast level: 'low' or 'high' (default: 'low')
- `options.removable` (boolean, optional) - Show remove button (default: false)
- `options.onRemove` (function, optional) - Callback when remove button is clicked
- `options.onClick` (function, optional) - Callback when tag is clicked
- `options.disabled` (boolean, optional) - Disabled state (default: false)
- `options.size` (string, optional) - Size: 'small', 'default', 'large' (default: 'default')
- `options.customColor` (object, optional) - Custom colors: `{background, text}`

**Returns:** `HTMLDivElement`

### `updateTagText(tag, text)`

Updates tag text content.

**Parameters:**
- `tag` (HTMLDivElement) - The tag element
- `text` (string) - New text content

### `updateTagContrast(tag, contrast)`

Updates tag contrast level.

**Parameters:**
- `tag` (HTMLDivElement) - The tag element
- `contrast` (string) - Contrast level: 'low' or 'high'

### `toggleTagDisabled(tag, disabled)`

Toggles tag disabled state.

**Parameters:**
- `tag` (HTMLDivElement) - The tag element
- `disabled` (boolean) - Whether to disable the tag

### `createTagList(tags, options)`

Creates a tag list container.

**Parameters:**
- `tags` (Array) - Array of tag configurations
- `options.gap` (string, optional) - Gap between tags (default: '8px')
- `options.wrap` (boolean, optional) - Allow wrapping (default: true)

**Returns:** `HTMLDivElement`

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--weight-light: 300
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--common-common-dark-10: rgba(0, 0, 0, 0.4)
--corner-radius-pill: 999px
--padding-and-gap-medium: 4px
```

## Accessibility

- Uses `role="listitem"` for screen readers
- Includes `aria-label` with tag text
- Remove button has descriptive `aria-label`
- Clickable tags use `role="button"` and `tabindex="0"`
- Keyboard navigation support (Enter, Space)
- Disabled tags have `aria-disabled="true"`

## Size Variants

- **Small**: 14px height, 6px padding, 10px font
- **Default**: 16px height, 8px padding, 12px font
- **Large**: 20px height, 10px padding, 14px font

## Examples

```javascript
// Filter tags
const tags = ['JavaScript', 'React', 'TypeScript'];
const tagContainer = createTagList(
  tags.map(text => ({
    text,
    contrast: 'high',
    removable: true,
    onRemove: (tag) => {
      updateFilters(text);
      tag.remove();
    }
  }))
);

// Category tags
const categoryTag = createTag({
  text: 'Work',
  contrast: 'low',
  onClick: (tag) => {
    filterByCategory('Work');
  }
});

// Status tags with colors
const statusTag = createTag({
  text: 'Active',
  customColor: {
    background: '#10b981',
    text: '#ffffff'
  }
});

// Disabled tag
const disabledTag = createTag({
  text: 'Archived',
  disabled: true,
  contrast: 'high'
});
```

## Behavior Notes

- **X icon is optional** - only shown when `removable: true`
- **No hover state on the tag itself** when not clickable
- **Remove icon opacity increases on hover** (0.6 → 1.0)
- **Click events don't fire when disabled**
- **Text truncates** with ellipsis for long content
