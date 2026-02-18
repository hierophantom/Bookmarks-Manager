/**
 * Folder Section Component
 *
 * Design System Component - BMG-111
 * States: Idle, Hover
 */

/**
 * Creates a folder section element
 * @param {Object} options - Section configuration
 * @param {Array<HTMLElement>} [options.items=[]] - Bookmarks gallery items
 * @param {string} [options.state='idle'] - 'idle' or 'hover'
 * @param {Array<Object>} [options.breadcrumbItems] - Breadcrumb items
 * @param {Array<HTMLElement>|null} [options.actions] - Action bar items
 * @returns {HTMLDivElement} The folder section element
 */
function createFolderSection(options = {}) {
  const {
    items = [],
    state = 'idle',
    breadcrumbItems = null,
    actions = null
  } = options;

  const section = document.createElement('div');
  section.className = 'folder-section';

  applyFolderSectionState(section, state);

  const header = document.createElement('div');
  header.className = 'folder-section__header';

  const breadcrumbsEl = buildFolderSectionBreadcrumbs(breadcrumbItems);
  if (breadcrumbsEl) {
    header.appendChild(breadcrumbsEl);
  }

  section.appendChild(header);

  const content = document.createElement('div');
  content.className = 'folder-section__content';
  renderFolderSectionContent(content, items);
  section.appendChild(content);

  const actionsToRender = Array.isArray(actions) ? actions : getDefaultFolderSectionActions();
  if (actionsToRender.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'folder-section__actions';
    actionsToRender.forEach((actionEl) => {
      if (actionEl instanceof HTMLElement) {
        actionsEl.appendChild(actionEl);
      }
    });
    section.appendChild(actionsEl);
  }

  return section;
}

/**
 * Applies folder section state
 * @param {HTMLDivElement} section - Section element
 * @param {string} state - 'idle' or 'hover'
 */
function applyFolderSectionState(section, state) {
  if (!section || !section.classList) return;
  section.classList.remove('folder-section--idle', 'folder-section--hover');
  section.classList.add(`folder-section--${state}`);
}

/**
 * Updates folder section items
 * @param {HTMLDivElement} section - Section element
 * @param {Array<HTMLElement>} items - New items
 */
function updateFolderSectionItems(section, items = []) {
  const content = section.querySelector('.folder-section__content');
  if (!content) return;
  renderFolderSectionContent(content, items);
}

/**
 * Updates folder section breadcrumbs
 * @param {HTMLDivElement} section - Section element
 * @param {Array<Object>} items - New breadcrumb items
 */
function updateFolderSectionBreadcrumbs(section, items = []) {
  const header = section.querySelector('.folder-section__header');
  if (!header) return;
  header.innerHTML = '';
  const breadcrumbsEl = buildFolderSectionBreadcrumbs(items);
  if (breadcrumbsEl) {
    header.appendChild(breadcrumbsEl);
  }
}

function buildFolderSectionBreadcrumbs(items) {
  if (typeof createBreadcrumbs !== 'function') {
    console.error('Folder section requires breadcrumbs component.');
    return null;
  }

  const defaultItems = [
    { label: 'Root-folder', type: 'root' },
    { label: 'Root-folder', type: 'root' },
    { label: 'Root-folder', type: 'root' },
    { label: 'Current-folder', type: 'current' }
  ];

  const breadcrumbsEl = createBreadcrumbs({ items: items || defaultItems });
  applyFolderSectionSeparators(breadcrumbsEl);

  return breadcrumbsEl;
}

function applyFolderSectionSeparators(breadcrumbsEl) {
  if (!breadcrumbsEl) return;
  const separators = breadcrumbsEl.querySelectorAll('.breadcrumbs__separator');
  separators.forEach((separator) => {
    separator.textContent = 'chevron_right';
    separator.classList.add('material-symbols-outlined', 'folder-section__breadcrumb-separator');
  });
}

function getDefaultFolderSectionActions() {
  if (typeof createCubeActionButton !== 'function' || typeof createCubeActionButtonWithLabel !== 'function') {
    return [];
  }

  return [
    createCubeActionButton({
      icon: 'visibility_off',
      label: 'Hide',
      tooltip: 'Hide'
    }),
    createCubeActionButton({
      icon: 'edit',
      label: 'Edit',
      tooltip: 'Edit'
    }),
    createCubeActionButton({
      icon: 'folder',
      label: 'Move to folder',
      tooltip: 'Move to folder'
    }),
    createCubeActionButton({
      icon: 'arrow_insert',
      label: 'Insert',
      tooltip: 'Insert'
    }),
    createCubeActionButton({
      icon: 'arrow_outward',
      label: 'Open',
      tooltip: 'Open'
    }),
    createCubeActionButtonWithLabel({
      icon: 'add',
      label: 'Add bookmark',
      colorScheme: 'primary'
    }),
    createCubeActionButton({
      icon: 'close',
      label: 'Remove',
      tooltip: 'Remove',
      colorScheme: 'destructive'
    })
  ].filter(Boolean);
}

function renderFolderSectionContent(content, items = []) {
  if (!content) return;

  content.innerHTML = '';

  const validItems = Array.isArray(items)
    ? items.filter((item) => item instanceof HTMLElement)
    : [];

  if (validItems.length === 0) {
    content.classList.add('folder-section__content--empty');

    const emptyStateEl = document.createElement('div');
    emptyStateEl.className = 'folder-section__empty-state';
    emptyStateEl.textContent = 'No bookmarks';
    content.appendChild(emptyStateEl);
    return;
  }

  content.classList.remove('folder-section__content--empty');

  validItems.forEach((item) => {
    content.appendChild(item);
  });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createFolderSection,
    applyFolderSectionState,
    updateFolderSectionItems,
    updateFolderSectionBreadcrumbs
  };
}
