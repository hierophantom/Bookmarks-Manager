/**
 * Folder Tree View Panel
 *
 * Design System Component - BMG-128
 *
 * Left side panel for folder hierarchy navigation.
 * Extends the base side-panel with folder tree items.
 *
 * @example
 * const folderView = createFolderTreeViewPanel({
 *   docked: false,
 *   onClose: () => console.log('closed'),
 *   onFolderSelect: (folder) => console.log('selected', folder)
 * });
 *
 * // Add folder items
 * folderView.addFolderItem({
 *   label: 'Work',
 *   variant: 'collapsed',
 *   counter: 28,
 *   onClick: () => {}
 * });
 */

/**
 * Creates a folder tree view panel
 * @param {Object} options - Panel configuration
 * @param {boolean} [options.docked=false] - Initial docked state
 * @param {Function} [options.onClose] - Close handler
 * @param {Function} [options.onToggleMode] - Mode toggle handler
 * @param {Function} [options.onFolderSelect] - Folder selection handler
 * @param {boolean} [options.visible=true] - Initial visibility
 * @returns {Object} Panel object with folder-specific methods
 */
function createFolderTreeViewPanel(options = {}) {
  const {
    docked = false,
    onClose = null,
    onToggleMode = null,
    onFolderSelect = null,
    visible = true
  } = options;

  // Create base side panel
  const panel = createSidePanel({
    title: 'Folders',
    position: 'left',
    docked: docked,
    onClose: onClose,
    onToggleMode: onToggleMode
  });

  if (!panel) {
    return null;
  }

  // Add folder-view specific class
  panel.element.classList.add('folder-tree-view');
  panel.content.classList.add('folder-tree-view__content');

  // Track items for management
  const items = new Map();

  // Return extended panel with folder methods
  return Object.assign(panel, {
    /**
     * Add a folder item to the tree
     * @param {Object} options - Folder item options
     * @param {string} options.id - Unique folder ID
     * @param {string} options.label - Folder label
     * @param {string} [options.variant='flat'] - 'flat', 'collapsed', 'expanded'
     * @param {number} [options.level=0] - Indentation level
     * @param {number} [options.counter=0] - Item count
     * @param {Function} [options.onClick] - Selection handler
     * @param {Function} [options.onExpand] - Expand handler
     * @returns {HTMLElement} The folder item element
     */
    addFolderItem(options = {}) {
      const {
        id = '',
        label = '',
        variant = 'flat',
        level = 0,
        counter = 0,
        onClick = null,
        onExpand = null
      } = options;

      if (!id) {
        console.error('Folder item requires an id');
        return null;
      }

      // Create folder tree item
      const item = createFolderTreeItem({
        label: label,
        variant: variant,
        level: level,
        counter: counter,
        onClick: () => {
          // Call user handler (should handle setActiveFolder)
          if (typeof onClick === 'function') {
            onClick();
          }

          // Call panel-level handler
          if (typeof onFolderSelect === 'function') {
            onFolderSelect({ id, label, variant, level, counter });
          }
        },
        onExpand: onExpand
      });

      if (!item) {
        return null;
      }

      // Store reference
      items.set(id, { element: item, options });

      // Append to content
      this.content.appendChild(item);

      return item;
    },

    /**
     * Remove a folder item
     * @param {string} id - Folder ID
     */
    removeFolderItem(id) {
      if (items.has(id)) {
        const { element } = items.get(id);
        element.remove();
        items.delete(id);
      }
    },

    /**
     * Update a folder item
     * @param {string} id - Folder ID
     * @param {Object} updates - Properties to update
     */
    updateFolderItem(id, updates) {
      if (!items.has(id)) return;

      const { element, options } = items.get(id);

      if (updates.label !== undefined) {
        updateFolderTreeItemLabel(element, updates.label);
        options.label = updates.label;
      }

      if (updates.counter !== undefined) {
        updateFolderTreeItemCounter(element, updates.counter);
        options.counter = updates.counter;
      }

      if (updates.variant !== undefined) {
        changeFolderTreeItemVariant(element, updates.variant);
        options.variant = updates.variant;
      }

      if (updates.active !== undefined) {
        setFolderTreeItemActive(element, updates.active);
        options.active = updates.active;
      }
    },

    /**
     * Set a folder as active/selected
     * @param {string} id - Folder ID to activate
     */
    setActiveFolder(id) {
      // Deactivate all items
      items.forEach(({ element }) => {
        setFolderTreeItemActive(element, false);
      });

      // Activate selected item
      if (items.has(id)) {
        const { element } = items.get(id);
        setFolderTreeItemActive(element, true);
      }
    },

    /**
     * Get all folder items
     * @returns {Array} Array of folder items
     */
    getFolderItems() {
      return Array.from(items.entries()).map(([id, { options }]) => ({
        id,
        ...options
      }));
    },

    /**
     * Clear all folder items
     */
    clearFolders() {
      this.content.innerHTML = '';
      items.clear();
    }
  });
}
