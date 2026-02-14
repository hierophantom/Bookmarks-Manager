# Bookmarks Gallery View

**Design System Component - BMG-110**  
Figma: `node-id=112-9725`

Compact 80x80 tile for bookmark and folder items used in gallery views.

## Overview

Bookmarks Gallery View represents a single bookmark or folder tile with icon, label, and optional subtext/count. It supports hover actions for bookmark and folder types.

## Usage

### Bookmark Tile

```javascript
const bookmark = createBookmarksGalleryView({
  type: 'bookmark',
  state: 'idle',
  label: 'Label',
  subtext: 'Subtext'
});
```

### Folder Tile

```javascript
const folder = createBookmarksGalleryView({
  type: 'folder',
  state: 'idle',
  label: 'Label',
  count: '4 items'
});
```

### Custom Actions

```javascript
const actions = [
  createCubeActionButton({ icon: 'edit', label: 'Edit', tooltip: 'Edit' }),
  createCubeActionButton({ icon: 'close', label: 'Remove', tooltip: 'Remove', colorScheme: 'destructive' })
];

const hoverTile = createBookmarksGalleryView({
  type: 'bookmark',
  state: 'hover',
  label: 'Label',
  subtext: 'Subtext',
  actions
});
```

## API

### `createBookmarksGalleryView(options)`

Creates a bookmarks gallery view element.

**Parameters:**

- `options.type` (string) - 'bookmark' or 'folder' (default: 'folder')
- `options.state` (string) - 'idle' or 'hover' (default: 'idle')
- `options.label` (string) - Label text (default: 'Label')
- `options.subtext` (string) - Bookmark subtext (default: 'Subtext')
- `options.count` (string) - Folder count text (default: '4 items')
- `options.icon` (string|HTMLElement) - Custom icon
- `options.actions` (HTMLElement[]) - Hover actions
- `options.idleActions` (HTMLElement[]) - Idle actions
- `options.showIdleActions` (boolean) - Force idle actions visible

**Returns:** `HTMLDivElement`

### `applyBookmarksGalleryViewType(view, type)`

Applies the tile type.

### `applyBookmarksGalleryViewState(view, state)`

Applies the tile state.

### `updateBookmarksGalleryViewLabel(view, label)`

Updates the label text.

### `updateBookmarksGalleryViewSubtext(view, subtext)`

Updates the subtext text.

### `updateBookmarksGalleryViewCount(view, count)`

Updates the folder count text.

## Design Specifications

### Dimensions

- **Size:** 80x80px
- **Icon:** 24x24px
- **Padding:** 4px 8px
- **Gap:** 4px
- **Border Radius:** 8px (corner-radius-medium)

### States

#### Bookmark

- **Idle:** `common-bright-05` background, subtext hidden, label action visible
- **Hover:** `common-bright-10` background, subtext visible, actions bar

#### Folder

- **Idle:** `common-bright-05` background, count visible
- **Hover:** `common-bright-10` background, actions bar

### Typography

- **Label:** body-reg (16px, weight 400)
- **Subtext/Count:** subtitle (12px, weight 300)

## Accessibility

- Ensure cube action buttons include labels and tooltips
- Uses semantic DOM elements for screen readers

## Files

- `bookmarks-gallery-view.css`
- `bookmarks-gallery-view.js`
- `bookmarks-gallery-view.html`
- `README-bookmarks-gallery-view.md`

## Related Components

- **Cube Action Button** (BMG-97)
- **Folder Section** (BMG-111)
