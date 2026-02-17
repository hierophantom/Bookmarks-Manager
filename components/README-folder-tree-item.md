# Folder Tree Item

**Design System Component - BMG-127**  
Figma: node-id=136-12629

## Overview

Hierarchical tree item component for folder navigation. Supports three variants (Flat, Collapsed, Expanded) with three states each (Idle, Hover, Active). Includes optional counter badge and recursive indentation support.

## Acceptance Criteria

- **Variants**: Flat, Collapsed, Expanded
- **States**: Idle, Hover, Active (for each variant)
- **Optional Features**: Expand/collapse icon, counter badge
- **Hierarchical Support**: Unlimited recursive indentation levels
- **Accessibility**: Proper ARIA attributes and keyboard focus

## Usage

```javascript
// Create a flat folder item with counter
const item = createFolderTreeItem({
  label: 'My Folder',
  variant: 'flat',
  counter: 42,
  onClick: () => console.log('selected')
});

// Create a collapsed item with expand handler
const collapsedItem = createFolderTreeItem({
  label: 'Work',
  variant: 'collapsed',
  level: 1,
  counter: 28,
  onExpand: () => console.log('expand clicked')
});

// Create an expanded item (hierarchy level 2)
const expandedItem = createFolderTreeItem({
  label: 'React Resources',
  variant: 'expanded',
  level: 2,
  counter: 12,
  active: true
});
```

## API

### `createFolderTreeItem(options)`

Creates a folder tree item element.

**Parameters:**
- `options.label` (string, **required**) - Item label text
- `options.variant` (string) - 'flat', 'collapsed', or 'expanded' (default: 'flat')
- `options.level` (number) - Indentation level for hierarchy (default: 0, no limit)
- `options.counter` (number) - Optional item counter value (default: 0, hidden if 0)
- `options.active` (boolean) - Active/selected state (default: false)
- `options.onClick` (function) - Click handler for item selection
- `options.onExpand` (function) - Expand/collapse handler (only for collapsed/expanded variants)
- `options.disabled` (boolean) - Disabled state (default: false)

**Returns:** `HTMLElement` (div with role="treeitem")

### `updateFolderTreeItemLabel(item, label)`

Updates the item label text.

**Parameters:**
- `item` (HTMLElement) - The item element
- `label` (string) - New label text

### `updateFolderTreeItemCounter(item, count)`

Updates or adds/removes the counter badge.

**Parameters:**
- `item` (HTMLElement) - The item element
- `count` (number) - New counter value (0 to hide)

### `setFolderTreeItemActive(item, active)`

Sets the active/selected state.

**Parameters:**
- `item` (HTMLElement) - The item element
- `active` (boolean) - Active state

### `changeFolderTreeItemVariant(item, variant)`

Changes the variant and updates expand/collapse icon accordingly.

**Parameters:**
- `item` (HTMLElement) - The item element
- `variant` (string) - 'flat', 'collapsed', or 'expanded'

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-large: 16px
--weight-regular: 400
--corner-radius-small: 4px
--common-common-bright-25: #ffffffe5
--folder-item-idle-bg: rgba(46, 51, 185, 0.25)
--folder-item-hover-bg: rgba(46, 51, 185, 0.4)
--folder-item-active-bg: rgba(46, 51, 185, 0.8)
--primary-primary-25: #2e33b9
```

## Visual Specifications

| Property | Value |
|----------|-------|
| **Height** | 40px |
| **Padding** | 0 8px |
| **Gap** | 8px |
| **Indentation per level** | 16px |
| **Border radius** | 4px |
| **Font** | Lato Regular 16px |
| **Icon size** | 20px (Material Symbols) |
| **Counter badge** | 20px height, 10px border-radius |

## States

### Idle
- Background: `var(--folder-item-idle-bg, rgba(46, 51, 185, 0.25))`
- Used by default, shows when not hovered or active

### Hover
- Background: `var(--folder-item-hover-bg, rgba(46, 51, 185, 0.4))`
- Applied on mouseover when not active
- Removed on mouseout

### Active
- Background: `var(--folder-item-active-bg, rgba(46, 51, 185, 0.8))`
- Box shadow: `0 0 0 2px rgba(46, 51, 185, 0.2)`
- Persistent state, not affected by hover
- Indicates current selection

## Variants

### Flat
- **Icon**: Only folder icon (no expand/collapse)
- **Use case**: Leaf items with no children
- **Icon**: Material Symbol `folder`

### Collapsed
- **Icon**: Right chevron (`>`) + folder icon
- **Use case**: Container with hidden children
- **Expand icon**: Material Symbol `chevron_right`
- **Expand handler**: `onExpand` callback on icon click

### Expanded
- **Icon**: Down chevron (`∨`) + folder icon
- **Use case**: Container with visible children
- **Expand icon**: Material Symbol `expand_more`
- **Expand handler**: `onExpand` callback on icon click

## Hierarchical Indentation

Items support unlimited tree depth via the `level` prop:

```javascript
// Level 0 - no indentation
const root = createFolderTreeItem({ label: 'Root', level: 0 });

// Level 1 - 16px indentation
const child = createFolderTreeItem({ label: 'Child', level: 1 });

// Level 2 - 32px indentation
const grandChild = createFolderTreeItem({ label: 'Grandchild', level: 2 });
```

Indentation is calculated as: `margin-left = level * 16px`

## Counter Badge

Optional counter badge displays on the right side:

```javascript
const item = createFolderTreeItem({
  label: 'Bookmarks',
  counter: 42  // Shows "42" in a badge
});

// Update counter
updateFolderTreeItemCounter(item, 28);

// Hide counter
updateFolderTreeItemCounter(item, 0);
```

## Icons

All icons use **Google Material Symbols Outlined**:
- **Folder**: `folder`
- **Expand (collapsed)**: `chevron_right`
- **Expand (expanded)**: `expand_more`

Requires Material Symbols font link:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,300..700,0..1,-50..200">
```

## Accessibility

- **ARIA role**: `treeitem`
- **ARIA level**: Set based on `level` prop (aria-level = level + 1)
- **ARIA expanded**: Set on expand button for collapsed/expanded variants
- **Focus visible**: 2px outline with 2px offset
- **Keyboard support**: Tab navigation, Enter/Space for selection (parent handled)

## Examples

### Simple flat list

```javascript
const container = document.getElementById('list');

['Bookmarks', 'Recent', 'Archive'].forEach(label => {
  const item = createFolderTreeItem({
    label: label,
    variant: 'flat',
    counter: Math.floor(Math.random() * 100),
    onClick: () => setActive(item)
  });
  container.appendChild(item);
});
```

### Expandable tree structure

```javascript
const tree = document.getElementById('tree');

const work = createFolderTreeItem({
  label: 'Work',
  variant: 'collapsed',
  counter: 45,
  level: 0,
  onExpand: () => {
    changeFolderTreeItemVariant(work, 'expanded');
    // Load and render children
  }
});

tree.appendChild(work);
```

### Dynamic hierarchy

```javascript
function createFolderTree(folders, level = 0) {
  const container = document.createElement('div');

  folders.forEach(folder => {
    const hasChildren = folder.children && folder.children.length > 0;
    const variant = hasChildren ? 'collapsed' : 'flat';

    const item = createFolderTreeItem({
      label: folder.name,
      variant: variant,
      level: level,
      counter: folder.count,
      onExpand: () => {
        changeFolderTreeItemVariant(item, 'expanded');
        // Load children logic
      }
    });

    container.appendChild(item);
  });

  return container;
}
```

## Notes

- **Event delegation**: Expand/collapse click doesn't trigger the item's onClick handler
- **Hover behavior**: Only applied when not active to avoid conflicts
- **Counter visibility**: Counter is only rendered when value > 0
- **Flat variant**: Expand button is removed entirely (not just hidden)
- **Label overflow**: Text ellipsis applied for long labels with `text-overflow: ellipsis`
