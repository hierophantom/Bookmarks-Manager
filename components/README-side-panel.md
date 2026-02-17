# Side Panel (Base Component)

**Design System Component - Generic Base for BMG-128, BMG-129**

## Overview

Generic reusable side panel container with header and scrollable content. Provides foundation for left and right side panels with float/docked states.

## Architecture

The side panel is a **base component** that's extended by:
- **Folder Tree View** (BMG-128) - Left panel with folder hierarchy
- **Active Sessions Panel** (BMG-129) - Right panel with session management

## Acceptance Criteria

- **Positions**: Left, Right
- **States**: Float (off-screen, slides in), Docked (always visible)
- **Header**: Title + minimize button + close button
- **Content**: Scrollable area for dynamic content
- **Smooth transitions** between states

## Usage

```javascript
// Create a base side panel
const panel = createSidePanel({
  title: 'My Panel',
  position: 'left',
  docked: false,
  onClose: () => console.log('closed'),
  onToggleMode: () => console.log('toggle mode')
});

// Set content
panel.setContent('<p>Content here</p>');

// Or append elements
const content = document.createElement('div');
panel.appendContent(content);

// Toggle states
panel.toggleMode();
panel.setDocked();
panel.setFloat();

// Show/hide
panel.show();
panel.hide();
```

## API

### `createSidePanel(options)`

Creates a side panel element.

**Parameters:**
- `options.title` (string, **required**) - Panel title
- `options.position` (string) - 'left' or 'right' (default: 'left')
- `options.docked` (boolean) - Initial docked state (default: false)
- `options.onClose` (function) - Close button handler
- `options.onToggleMode` (function) - Minimize/dock button handler

**Returns:** `Object` Panel with methods below

### Panel Methods

#### `setContent(element | html)`
Set or replace entire content area.
```javascript
panel.setContent('<p>New content</p>');
// or
panel.setContent(myElement);
```

#### `appendContent(element)`
Append element to content area.
```javascript
panel.appendContent(myElement);
```

#### `clearContent()`
Clear all content.
```javascript
panel.clearContent();
```

#### `setTitle(newTitle)`
Update panel title.
```javascript
panel.setTitle('New Title');
```

#### `toggleMode()`
Toggle between float and docked.
```javascript
panel.toggleMode();
```

#### `setFloat()`
Switch to float mode.
```javascript
panel.setFloat();
```

#### `setDocked()`
Switch to docked mode.
```javascript
panel.setDocked();
```

#### `isDocked()`
Check if currently docked.
```javascript
if (panel.isDocked()) { ... }
```

#### `show()`
Show panel (for float state).
```javascript
panel.show();
```

#### `hide()`
Hide panel (for float state).
```javascript
panel.hide();
```

#### `isVisible()`
Check visibility state.
```javascript
if (panel.isVisible()) { ... }
```

## Design Tokens

```css
--side-panel-bg: rgba(20, 28, 75, 0.95)
--side-panel-border: rgba(46, 51, 185, 0.3)
--side-panel-text: #ffffffe5
--side-panel-header-bg: transparent
--font-family-sans-serif: 'Lato', sans-serif
```

## Visual Specifications

| Property | Value |
|----------|-------|
| **Left panel width** | 300px |
| **Right panel width** | 320px |
| **Height** | 100vh (full viewport) |
| **Header height** | auto (content-based) |
| **Header padding** | 12px 16px |
| **Content padding** | 8px 0 |
| **Button size** | 28x28px |
| **Border radius** | 4px |
| **Transition** | 0.3s ease |

## States

### Float
- **Off-screen position**: Positioned outside viewport
- **Animation**: Slides in on show
- **Transform**: `translateX(-100%)` for left, `translateX(100%)` for right
- **Visibility**: Controlled via CSS class `side-panel--visible`
- **Use case**: Panels that minimize to edges

### Docked
- **Position**: Absolute, below header (top: 48px)
- **Transform**: None
- **Always visible**: No animation needed
- **Height**: Calculated as `100vh - 48px`
- **Use case**: Persistent sidebar panels

## Layout

```
┌─────────────────┐
│   Panel Title   │  ← Header (12px padding, border-bottom)
│            ⊟ ✕ │
├─────────────────┤
│                 │
│  Scrollable     │  ← Content area (flex: 1, overflow-y: auto)
│  Content        │
│   Area          │
│                 │
└─────────────────┘
```

## Interaction

### Minimize/Dock Button (⊟)
- Toggles between float and docked modes
- Calls `onToggleMode` handler
- Updates panel CSS classes

### Close Button (✕)
- Hides the panel (for float) or closes (for docked)
- Calls `onClose` handler
- Parent handles removal or visibility management

## Accessibility

- **ARIA role**: `complementary`
- **ARIA label**: Set to panel title
- **Button labels**: "Toggle floating/docked mode" and "Close panel"
- **Keyboard focus**: All buttons focusable
- **Scrollbar**: Native browser scrollbar with custom styling

## CSS Classes

### Main Container
- `.side-panel` - Base class
- `.side-panel--left` - Positioned on left
- `.side-panel--right` - Positioned on right
- `.side-panel--float` - Float/off-screen mode
- `.side-panel--docked` - Docked/always visible mode
- `.side-panel--visible` - Show float panel

### Child Elements
- `.side-panel__header` - Header container
- `.side-panel__title` - Title element
- `.side-panel__controls` - Button container
- `.side-panel__btn` - Button base class
- `.side-panel__btn--toggle` - Minimize button
- `.side-panel__btn--close` - Close button
- `.side-panel__content` - Content area

## Scrollbar Styling

Custom scrollbar for dark theme:
```css
Width: 8px
Track: transparent
Thumb: rgba(46, 51, 185, 0.4)
Thumb (hover): rgba(46, 51, 185, 0.6)
Border radius: 4px
```

## Responsive

Mobile adjustments:
- Panel width: 280px (reduced from 300/320)
- Button size: 24x24px
- Font size: 12px
- No header adjustments

## Browser Support

- Chrome/Edge 88+
- Firefox 87+
- Safari 14+
- Modern CSS Grid, Flexbox, CSS Variables required

## Examples

### Left Navigation Panel
```javascript
const navPanel = createSidePanel({
  title: 'Navigation',
  position: 'left',
  docked: true
});

const menuItems = document.createElement('ul');
// ... populate menu
navPanel.setContent(menuItems);
```

### Right Info Panel
```javascript
const infoPanel = createSidePanel({
  title: 'Details',
  position: 'right',
  docked: false
});

infoPanel.show();
```

## Notes

- **Panel state management**: Parent component should manage visibility and mode
- **Content management**: Use `setContent()` for complete replacement, `appendContent()` for adding
- **Header is sticky**: Always visible, not part of scrollable content
- **Smooth transitions**: All transforms animated, 0.3s ease timing
- **Z-index**: Float panels are 999, docked panels are 100
