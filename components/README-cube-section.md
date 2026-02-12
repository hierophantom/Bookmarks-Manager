# Cube Section

**Design System Component - BMG-109**  
Figma: `node-id=99-8521`

Container for widget tiles with hover actions and vertical wrapping support.

## Overview

Cube Section is used to group Widget Small tiles. It supports two states and can show an action bar on hover.

## Usage

### Basic Section

```javascript
const items = [
  createWidgetSmall({ type: 'widget', state: 'idle', label: 'Label', subtext: 'Subtext', icon: 'B' })
];

const section = createCubeSection({
  state: 'idle',
  items
});
```

### Hover Section with Action

```javascript
const action = createCubeActionButtonWithLabel({
  icon: '+',
  label: 'Add widget',
  colorScheme: 'primary'
});

const section = createCubeSection({
  state: 'hover',
  items,
  action
});
```

### Vertical Wrap Layout

```javascript
const section = createCubeSection({
  state: 'hover',
  items,
  wrap: 'vertical',
  action
});
```

## API

### `createCubeSection(options)`

Creates a cube section element.

**Parameters:**

- `options.items` (HTMLElement[]) - Widget elements to render
- `options.state` (string) - 'idle' or 'hover' (default: 'idle')
- `options.wrap` (string) - 'none' or 'vertical' (default: 'none')
- `options.action` (HTMLElement) - Action element for hover state

**Returns:** `HTMLDivElement`

### `applyCubeSectionState(section, state)`

Applies the cube section state.

## Design Specifications

### Dimensions

- **Padding:** 16px
- **Min Height:** 112px
- **Gap:** 20px
- **Border Radius:** 8px (corner-radius-medium)

### States

- **Idle:** Transparent background
- **Hover:** `common-dark-10` background with action bar

### Layout

- **Default:** Horizontal flow with wrapping
- **Vertical wrap:** `flex-direction: column` with wrap support

## Accessibility

- Uses standard DOM elements for screen readers
- Ensure action buttons include labels

## Files

- `cube-section.css`
- `cube-section.js`
- `cube-section.html`
- `README-cube-section.md`

## Related Components

- **Widget Small** (BMG-108)
- **Cube Action Button** (BMG-97)
- **Cube Action Button with Label** (BMG-98)
