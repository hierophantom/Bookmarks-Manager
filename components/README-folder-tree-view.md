# Folder Tree View Panel

**Design System Component - BMG-128**  
Figma: node-id=136-12918

## Overview

Left side panel for folder hierarchy navigation. Extends the base `side-panel` component with folder tree items and folder-specific methods. Displays hierarchical folders with expand/collapse, counters, and selection management.

## Acceptance Criteria

- **States**: Float, Docked
- **Content**: Folder tree items with expansion support
- **Features**: Selection, counters, hierarchical indentation
- **Parent management**: Expand/collapse handled by parent

## Usage

```javascript
// Create folder tree view panel
const folderView = createFolderTreeViewPanel({
  docked: false,
  onClose: () => console.log('closed'),
  onFolderSelect: (folder) => console.log('selected', folder)
});

// Add folder items
folderView.addFolderItem({
  id: 'work',
  label: 'Work',
  variant: 'collapsed',
  level: 0,
  counter: 28,
  onClick: () => console.log('clicked'),
  onExpand: () => console.log('expanding')
});

// Update folder
folderView.updateFolderItem('work', {
  label: 'Work Updated',
  counter: 30,
  variant: 'expanded'
});

// Get all folders
const folders = folderView.getFolderItems();

// Clear all
folderView.clearFolders();
```

## API

### `createFolderTreeViewPanel(options)`

Creates a folder tree view panel.

**Parameters:**
- `options.docked` (boolean) - Initial docked state (default: false)
- `options.onClose` (function) - Close handler
- `options.onToggleMode` (function) - Mode toggle handler
- `options.onFolderSelect` (function) - Folder selection handler
- `options.visible` (boolean) - Initial visibility (default: true)

**Returns:** `Object` Panel (extends Base Side Panel)

### Panel Methods (Inherited from Side Panel)

- `show()` / `hide()` / `toggleMode()` / `setDocked()` / `setFloat()`
- `setTitle()` / `setContent()` / `appendContent()` / `clearContent()`

### Folder-Specific Methods

#### `addFolderItem(options)`

Add a folder item to the tree.

**Parameters:**
- `options.id` (string, **required**) - Unique folder ID
- `options.label` (string, **required**) - Folder label
- `options.variant` (string) - 'flat', 'collapsed', 'expanded' (default: 'flat')
- `options.level` (number) - Indentation level 0+ (default: 0)
- `options.counter` (number) - Item count (default: 0)
- `options.onClick` (function) - Selection handler
- `options.onExpand` (function) - Expand handler

**Returns:** `HTMLElement` The folder item element

```javascript
folderView.addFolderItem({
  id: 'projects',
  label: 'Projects',
  variant: 'collapsed',
  level: 1,
  counter: 42
});
```

#### `removeFolderItem(id)`

Remove a folder item.

```javascript
folderView.removeFolderItem('projects');
```

#### `updateFolderItem(id, updates)`

Update folder properties.

```javascript
folderView.updateFolderItem('projects', {
  label: 'All Projects',
  counter: 45,
  variant: 'expanded'
});
```

**Update fields:**
- `label` - New label text
- `counter` - New counter value
- `variant` - 'flat', 'collapsed', or 'expanded'
- `active` - Active state boolean

#### `setActiveFolder(id)`

Set a folder as active/selected (deactivates others).

```javascript
folderView.setActiveFolder('projects');
```

#### `getFolderItems()`

Get all folder items.

```javascript
const folders = folderView.getFolderItems();
// Returns: [{ id, label, variant, level, counter, active, ... }, ...]
```

#### `clearFolders()`

Remove all folders.

```javascript
folderView.clearFolders();
```

## Design Integration

Inherits from and uses:
- **Base Component**: `side-panel.js/css` - Layout, header, controls
- **Item Component**: `folder-tree-item.js/css` - Individual folder styling

## Properties

| Property | Value |
|----------|-------|
| **Panel position** | Left |
| **Panel width** | 300px |
| **Panel states** | Float, Docked |
| **Item height** | 40px |
| **Item padding** | 0 8px |
| **Item gap** | 8px |
| **Indentation/level** | 16px per level |

## Example: Complete Folder Structure

```javascript
const folderView = createFolderTreeViewPanel({
  docked: true,
  onFolderSelect: (folder) => {
    console.log('Navigating to:', folder.label);
  }
});

// Root
folderView.addFolderItem({
  id: 'all',
  label: 'All Bookmarks',
  variant: 'expanded',
  level: 0,
  counter: 250
});

// Level 1
folderView.addFolderItem({
  id: 'work',
  label: 'Work',
  variant: 'expanded',
  level: 1,
  counter: 85
});

// Level 2 - Children of Work
folderView.addFolderItem({
  id: 'projects',
  label: 'Projects',
  variant: 'collapsed',
  level: 2,
  counter: 35
});

folderView.addFolderItem({
  id: 'meetings',
  label: 'Meetings',
  variant: 'flat',
  level: 2,
  counter: 12
});

// Level 1 - Sibling
folderView.addFolderItem({
  id: 'personal',
  label: 'Personal',
  variant: 'collapsed',
  level: 1,
  counter: 45
});
```

## State Management

### Selection (Active)
- Only one folder can be active at a time
- Clicking a folder calls `onFolderSelect`
- Active state automatically managed by `setActiveFolder()`
- Active folder shown with bright primary background

### Expansion
- Expand/collapse icons only on collapsed/expanded variants
- `onExpand` handler called when icon clicked
- Parent component manages actual expansion/collapse
- Visual state updated via `changeFolderTreeItemVariant()`

### Counters
- Optional item counts displayed in badge
- Updated via `updateFolderItem()` or `updateFolderTreeItemCounter()`
- Hidden when counter = 0

## Variants

### Flat
- No expand/collapse icon
- Leaf items with no children
- Only folder icon shown

### Collapsed
- Right chevron icon (>)
- Has hidden children
- Click icon to expand

### Expanded
- Down chevron icon (∨)
- Children are shown
- Click icon to collapse

## Indentation Hierarchy

Unlimited levels via `level` prop:
- Level 0: No margin-left
- Level 1: 16px margin-left (children of root)
- Level 2: 32px margin-left (grandchildren)
- Level N: N × 16px margin-left

## Accessibility

- **ARIA role**: `treeitem` on each folder
- **ARIA level**: Set based on folder level (aria-level = level + 1)
- **ARIA expanded**: Set on expand button (true/false)
- **Keyboard support**: Tab focuses items, Enter/Space for selection
- **Focus indicators**: 2px outline with offset

## Styling

Inherits panel styling plus folder-item specific:
- **Idle background**: `rgba(46, 51, 185, 0.3)`
- **Hover background**: `rgba(46, 51, 185, 0.5)` (when not active)
- **Active background**: `rgba(46, 51, 185, 0.75)`
- **Counter badge**: `rgba(255, 255, 255, 0.15)` → `0.25` when active

## Error Handling

```javascript
// Missing required ID
folderView.addFolderItem({ label: 'Folder' }); // Logs error, returns null

// Invalid variant
folderView.updateFolderItem('id', { variant: 'invalid' }); // Logs error, no change

// Non-existent folder
folderView.removeFolderItem('nonexistent'); // Silently does nothing
folderView.updateFolderItem('nonexistent', {}); // Silently does nothing
```

## Examples

### Simple Left Sidebar
```javascript
const sidebar = createFolderTreeViewPanel({
  docked: true
});

document.body.appendChild(sidebar.element);

// Populate from data
const folders = await fetchFolders();
folders.forEach(f => {
  sidebar.addFolderItem({
    id: f.id,
    label: f.name,
    variant: f.hasChildren ? 'collapsed' : 'flat',
    counter: f.bookmarkCount
  });
});
```

### Floating Folder Picker
```javascript
const picker = createFolderTreeViewPanel({
  docked: false,
  onFolderSelect: (folder) => {
    selectFolder(folder.id);
    picker.hide();
  }
});

showButton.addEventListener('click', () => {
  picker.show();
});
```

### Dynamic Expansion
```javascript
const panel = createFolderTreeViewPanel();

panel.addFolderItem({
  id: 'root',
  label: 'Bookmarks',
  variant: 'collapsed',
  onExpand: async () => {
    const children = await loadChildren('root');
    children.forEach(child => {
      panel.addFolderItem({
        id: child.id,
        label: child.name,
        level: 1,
        variant: child.hasChildren ? 'collapsed' : 'flat'
      });
    });
    panel.updateFolderItem('root', { variant: 'expanded' });
  }
});
```

## Notes

- **Parent handles expansion**: Component doesn't auto-load children, parent calls expand handler
- **Selection is exclusive**: Only one folder active at a time
- **Counter visibility**: Auto-hidden when counter = 0, no need to manage
- **No internal state for expansion**: Visual state (flat/collapsed/expanded) must be managed by parent
- **Material Icons**: Uses Google Material Symbols (folder, chevron_right, expand_more)
