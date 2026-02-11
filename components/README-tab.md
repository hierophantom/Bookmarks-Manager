# Tab Component

Design System Component - BMG-91

## Overview

A navigation tab component with label, optional subtitle, and icon. Supports idle, hover, and active states.

## Figma Reference

[View in Figma](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=92-9565)

## Anatomy

- **Container**: 200px width, 4px/8px padding, rounded corners
- **Label**: 12px medium weight text
- **Subtitle**: 12px light weight text (optional)
- **Icon**: 20x20px chevron (shown in hover/active)
- **Active indicator**: Primary-20 background color

## States

- **Idle**: Basic appearance with no icon
- **Hover**: Chevron icon appears→ active appearance
- **Disabled**: Reduced opacity, no interaction

## Usage

### Create a Tab

```javascript
const tab = createTab({
  label: 'Overview',
  subtitle: '12 items',
  id: 'overview'
});
```

### Create Tab Group

```javascript
const tabGroup = createTabGroup([
  { label: 'Active', subtitle: '12 items', id: 'active' },
  { label: 'Archived', subtitle: '45 items', id: 'archived' }
], (tab, index) => {
  console.log('Tab clicked:', tab.getAttribute('data-tab-id'));
});

// Set active tab
setActiveTab(tabGroup, 0);
```

### Update Tab

```javascript
// Update label
updateTabLabel(tab, 'New Label');

// Update subtitle
updateTabSubtitle(tab, '24 items');

// Toggle disabled
toggleTabDisabled(tab, true);
```

## API

### `createTab(options)`

Creates a tab element.

**Parameters:**
- `options.label` (string) - Tab label text
- `options.subtitle` (string, optional) - Subtitle text
- `options.id` (string) - Unique identifier
- `options.active` (boolean) - Whether tab is active
- `options.disabled` (boolean) - Whether tab is disabled
- `options.onClick` (function) - Click handler

**Returns:** `HTMLDivElement`

### `createTabGroup(tabs, onTabClick)`

Creates a tab group with automatic active state management.

**Parameters:**
- `tabs` (Array) - Array of tab configurations
- `onTabClick` (function) - Callback when tab is clicked

**Returns:** `HTMLDivElement`

### `setActiveTab(tabGroup, index)`

Sets the active tab in a group.

**Parameters:**
- `tabGroup` (HTMLDivElement) - The tab group container
- `index` (number) - Index of tab to activate

### `updateTabLabel(tab, label)`

Updates tab label text.

**Parameters:**
- `tab` (HTMLDivElement) - The tab element
- `label` (string) - New label text

### `updateTabSubtitle(tab, subtitle)`

Updates tab subtitle text.

**Parameters:**
- `tab` (HTMLDivElement) - The tab element
- `subtitle` (string) - New subtitle text

### `toggleTabDisabled(tab, disabled)`

Toggles tab disabled state.

**Parameters:**
- `tab` (HTMLDivElement) - The tab element
- `disabled` (boolean) - Whether to disable the tab

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--weight-regular: 400
--weight-light: 300
--primary-primary-20: rgba(46, 51, 185, 0.8)
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-10: rgba(255, 255, 255, 0.2)
--common-common-bright-15: rgba(255, 255, 255, 0.6)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--corner-radius-small: 4px
```

## Accessibility

- Uses `role="tab"` for ARIA compliance
- Supports keyboard navigation (Enter, Space)
- Manages `aria-selected` state
- Provides `tabindex` for focus management
- Disabled tabs have `aria-disabled="true"`

## Examples

```javascript
// Simple tab group
const tabs = createTabGroup([
  { label: 'Tab 1', id: '1' },
  { label: 'Tab 2', id: '2' },
  { label: 'Tab 3', id: '3' }
], (tab, index) => {
  showContent(index);
});

// Tabs with subtitles
const tabs = createTabGroup([
  { label: 'Public', subtitle: '12 bookmarks', id: 'public' },
  { label: 'Private', subtitle: '4 bookmarks', id: 'private' }
], handleTabChange);
```
