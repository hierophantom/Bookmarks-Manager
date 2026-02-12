# Widget Small

**Design System Component - BMG-108**  
Figma: `node-id=99-8369`

Compact 80x80 widget tile used for bookmark widgets and empty slots.

## Overview

Widget Small represents a small card used for widgets on the homepage. It supports two types:

- **Widget**: Shows icon, label, and subtext with hover actions
- **Empty slot**: Shows a dashed slot and a dragged active state

## Usage

### Basic Widget

```javascript
const widget = createWidgetSmall({
  type: 'widget',
  state: 'idle',
  label: 'Label',
  subtext: 'Subtext',
  icon: 'B'
});
```

### Hover Widget with Actions

```javascript
const actions = [
  createCubeActionButton({ icon: 'E', label: 'Edit', tooltip: 'Edit' }),
  createCubeActionButton({ icon: 'X', label: 'Remove', tooltip: 'Remove', colorScheme: 'destructive' })
];

const widget = createWidgetSmall({
  type: 'widget',
  state: 'hover',
  label: 'Label',
  subtext: 'Subtext',
  icon: 'B',
  actions
});
```

### Empty Slot

```javascript
const emptySlot = createWidgetSmall({
  type: 'empty',
  state: 'idle'
});

const draggedSlot = createWidgetSmall({
  type: 'empty',
  state: 'dragged'
});
```

## API

### `createWidgetSmall(options)`

Creates a widget-small element.

**Parameters:**

- `options.type` (string) - 'widget' or 'empty' (default: 'widget')
- `options.state` (string) - 'idle', 'hover', or 'dragged' (default: 'idle')
- `options.label` (string) - Widget label (default: 'Label')
- `options.subtext` (string) - Widget subtext (default: 'Subtext')
- `options.icon` (string|HTMLElement) - Widget icon
- `options.actions` (HTMLElement[]) - Action elements (hover only)

**Returns:** `HTMLDivElement`

### `applyWidgetSmallType(widget, type)`

Applies the widget type.

### `applyWidgetSmallState(widget, state)`

Applies the widget state.

### `updateWidgetSmallLabel(widget, label)`

Updates the label text.

### `updateWidgetSmallSubtext(widget, subtext)`

Updates the subtext.

### `updateWidgetSmallIcon(widget, icon)`

Updates the icon.

## Design Specifications

### Dimensions

- **Size:** 80x80px
- **Icon:** 24x24px
- **Padding:** 4px 8px
- **Gap:** 4px
- **Border Radius:** 8px (corner-radius-medium)

### States

#### Widget Type

- **Idle:** `common-bright-05` background
- **Hover:** `common-bright-10` background with actions bar

#### Empty Slot

- **Idle:** `common-dark-05` background, dashed border
- **Dragged active:** `primary-05` background, dashed `primary-20` border

### Typography

- **Label:** body-reg (16px, weight 400)
- **Subtext:** subtitle (12px, weight 300)

## Accessibility

- Uses standard DOM elements for screen readers
- Provide meaningful labels for actions

## Files

- `widget-small.css`
- `widget-small.js`
- `widget-small.html`
- `README-widget-small.md`

## Related Components

- **Cube Action Button** (BMG-97)
- **Cube Section** (BMG-109)
