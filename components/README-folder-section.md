# Folder Section

**Design System Component - BMG-111**  
Figma: `node-id=112-9789`

Container for bookmarks gallery tiles with breadcrumb header and hover actions.

## Overview

Folder Section groups Bookmarks Gallery View tiles in a padded container with breadcrumb navigation. It supports idle and hover states with an action bar.

## Usage

### Basic Section

```javascript
const items = [
  createBookmarksGalleryView({ type: 'folder', label: 'Label', count: '4 items' }),
  createBookmarksGalleryView({ type: 'bookmark', label: 'Label', subtext: 'Subtext' })
];

const section = createFolderSection({
  state: 'idle',
  items
});
```

### Hover Section

```javascript
const section = createFolderSection({
  state: 'hover',
  items
});
```

### Custom Breadcrumbs

```javascript
const section = createFolderSection({
  items,
  breadcrumbItems: [
    { label: 'Home', type: 'root' },
    { label: 'Bookmarks', type: 'current' }
  ]
});
```

## API

### `createFolderSection(options)`

Creates a folder section element.

**Parameters:**

- `options.items` (HTMLElement[]) - Gallery items to render
- `options.state` (string) - 'idle' or 'hover' (default: 'idle')
- `options.breadcrumbItems` (Array<Object>) - Breadcrumb items
- `options.actions` (HTMLElement[]) - Action bar items

**Returns:** `HTMLDivElement`

### `applyFolderSectionState(section, state)`

Applies the folder section state.

### `updateFolderSectionItems(section, items)`

Updates the gallery items.

### `updateFolderSectionBreadcrumbs(section, items)`

Updates the breadcrumb items.

## Design Specifications

### Dimensions

- **Padding:** 16px
- **Min Height:** 152px
- **Gap:** 16px
- **Border Radius:** 8px (corner-radius-medium)

### States

- **Idle:** Transparent background
- **Hover:** `common-dark-10` background with action bar

### Layout

- **Header:** Breadcrumb navigation
- **Content:** Flex wrap grid of 80x80 tiles

## Accessibility

- Breadcrumbs include `aria-label="Breadcrumb"`
- Ensure action buttons include labels and tooltips

## Files

- `folder-section.css`
- `folder-section.js`
- `folder-section.html`
- `README-folder-section.md`

## Related Components

- **Bookmarks Gallery View** (BMG-110)
- **Breadcrumbs** (BMG-106)
- **Cube Action Button** (BMG-97)
- **Cube Action Button with Label** (BMG-98)
