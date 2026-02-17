/**
 * Folder Tree Item Component
 *
 * Design System Component - BMG-127
 *
 * Tree item for folder hierarchy navigation with expand/collapse support.
 * Supports three variants: Flat, Collapsed, Expanded
 * Each with three states: Idle, Hover, Active
 *
 * @example
 * const item = createFolderTreeItem({
 *   label: 'My Folder',
 *   variant: 'collapsed',
 *   level: 1,
 *   counter: 5,
 *   onClick: () => console.log('clicked'),
 *   onExpand: () => console.log('expand')
 * });
 */

/**
 * Creates a folder tree item element
 * @param {Object} options - Item configuration
 * @param {string} options.label - Item label text (required)
 * @param {string} [options.variant='flat'] - 'flat', 'collapsed', or 'expanded'
 * @param {number} [options.level=0] - Indentation level (0, 1, 2, ...)
 * @param {number} [options.counter=0] - Optional item counter
 * @param {boolean} [options.active=false] - Active state
 * @param {Function} [options.onClick] - Click handler for item selection
 * @param {Function} [options.onExpand] - Expand/collapse handler
 * @param {boolean} [options.disabled=false] - Disabled state
 * @returns {HTMLElement} The folder tree item element
 */
function createFolderTreeItem(options = {}) {
  const {
    label = '',
    variant = 'flat',
    level = 0,
    counter = 0,
    active = false,
    onClick = null,
    onExpand = null,
    disabled = false
  } = options;

  if (!label) {
    console.error('Folder tree item requires a label');
    return null;
  }

  // Validate variant
  if (!['flat', 'collapsed', 'expanded'].includes(variant)) {
    console.error('Invalid variant. Expected: flat, collapsed, or expanded');
    return null;
  }

  // Create container
  const container = document.createElement('div');
  container.className = `folder-tree-item folder-tree-item--${variant}`;
  container.setAttribute('role', 'treeitem');
  container.setAttribute('aria-level', level + 1);

  if (active) {
    container.classList.add('folder-tree-item--active');
  } else {
    container.classList.add('folder-tree-item--idle');
  }

  if (disabled) {
    container.classList.add('folder-tree-item--disabled');
  }

  // Set indentation based on level
  if (level > 0) {
    container.style.setProperty('--indent-level', level);
  }

  // Create main content wrapper (clickable area)
  const content = document.createElement('div');
  content.className = 'folder-tree-item__content';

  // Add expand/collapse icon if needed
  if (variant !== 'flat') {
    const iconBtn = document.createElement('button');
    iconBtn.className = 'folder-tree-item__expand-icon';
    iconBtn.type = 'button';
    iconBtn.setAttribute('aria-label', variant === 'expanded' ? 'Collapse' : 'Expand');
    iconBtn.setAttribute('aria-expanded', variant === 'expanded' ? 'true' : 'false');

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = variant === 'expanded' ? 'expand_more' : 'chevron_right';

    iconBtn.appendChild(icon);

    iconBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof onExpand === 'function' && !disabled) {
        onExpand();
      }
    });

    content.appendChild(iconBtn);
  }

  // Create folder icon
  const folderIcon = document.createElement('span');
  folderIcon.className = 'folder-tree-item__folder-icon material-symbols-outlined';
  folderIcon.textContent = 'folder';
  folderIcon.setAttribute('aria-hidden', 'true');
  content.appendChild(folderIcon);

  // Create label
  const labelEl = document.createElement('span');
  labelEl.className = 'folder-tree-item__label';
  labelEl.textContent = label;
  content.appendChild(labelEl);

  // Add counter if provided
  if (counter > 0) {
    const counterEl = document.createElement('span');
    counterEl.className = 'folder-tree-item__counter';
    counterEl.textContent = counter;
    content.appendChild(counterEl);
  }

  container.appendChild(content);

  // Add click handler
  if (typeof onClick === 'function' && !disabled) {
    container.addEventListener('click', (e) => {
      // Don't trigger if clicking the expand button
      if (!e.target.closest('.folder-tree-item__expand-icon')) {
        onClick();
      }
    });
  }

  // Add hover state tracking
  container.addEventListener('mouseenter', () => {
    if (!disabled && !container.classList.contains('folder-tree-item--active')) {
      container.classList.remove('folder-tree-item--idle');
      container.classList.add('folder-tree-item--hover');
    }
  });

  container.addEventListener('mouseleave', () => {
    if (!disabled && !container.classList.contains('folder-tree-item--active')) {
      container.classList.remove('folder-tree-item--hover');
      container.classList.add('folder-tree-item--idle');
    }
  });

  return container;
}

/**
 * Update label
 * @param {HTMLElement} item - The item element
 * @param {string} label - New label text
 */
function updateFolderTreeItemLabel(item, label) {
  const labelEl = item.querySelector('.folder-tree-item__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

/**
 * Update counter
 * @param {HTMLElement} item - The item element
 * @param {number} count - New counter value
 */
function updateFolderTreeItemCounter(item, count) {
  let counterEl = item.querySelector('.folder-tree-item__counter');

  if (count > 0) {
    if (!counterEl) {
      counterEl = document.createElement('span');
      counterEl.className = 'folder-tree-item__counter';
      const content = item.querySelector('.folder-tree-item__content');
      content.appendChild(counterEl);
    }
    counterEl.textContent = count;
  } else if (counterEl) {
    counterEl.remove();
  }
}

/**
 * Set active state
 * @param {HTMLElement} item - The item element
 * @param {boolean} active - Active state
 */
function setFolderTreeItemActive(item, active) {
  if (active) {
    item.classList.remove('folder-tree-item--idle', 'folder-tree-item--hover');
    item.classList.add('folder-tree-item--active');
  } else {
    item.classList.remove('folder-tree-item--active');
    item.classList.add('folder-tree-item--idle');
  }
}

/**
 * Change variant
 * @param {HTMLElement} item - The item element
 * @param {string} variant - New variant: 'flat', 'collapsed', or 'expanded'
 */
function changeFolderTreeItemVariant(item, variant) {
  if (!['flat', 'collapsed', 'expanded'].includes(variant)) {
    console.error('Invalid variant. Expected: flat, collapsed, or expanded');
    return;
  }

  // Remove old variant class
  item.classList.remove('folder-tree-item--flat', 'folder-tree-item--collapsed', 'folder-tree-item--expanded');
  item.classList.add(`folder-tree-item--${variant}`);

  // Update expand icon if needed
  const expandBtn = item.querySelector('.folder-tree-item__expand-icon');
  if (variant === 'flat') {
    if (expandBtn) {
      expandBtn.remove();
    }
  } else {
    if (!expandBtn) {
      const newExpandBtn = document.createElement('button');
      newExpandBtn.className = 'folder-tree-item__expand-icon';
      newExpandBtn.type = 'button';
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      newExpandBtn.appendChild(icon);

      const content = item.querySelector('.folder-tree-item__content');
      content.insertBefore(newExpandBtn, content.firstChild);
    }

    const icon = expandBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = variant === 'expanded' ? 'expand_more' : 'chevron_right';
      expandBtn.setAttribute('aria-expanded', variant === 'expanded' ? 'true' : 'false');
    }
  }
}
