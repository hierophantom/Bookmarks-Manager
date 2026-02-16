/**
 * Bookmarks Gallery View Component
 *
 * Design System Component - BMG-110
 * Types: Bookmark, Folder
 * States: Idle, Hover
 */

/**
 * Creates a bookmarks-gallery-view element
 * @param {Object} options - View configuration
 * @param {string} [options.type='folder'] - 'bookmark' or 'folder'
 * @param {string} [options.state='idle'] - 'idle' or 'hover'
 * @param {string} [options.label='Label'] - Label text
 * @param {string} [options.subtext='Subtext'] - Subtext (bookmark)
 * @param {string} [options.count='4 items'] - Count text (folder)
 * @param {string|HTMLElement} [options.icon] - Icon for the tile
 * @param {Array<HTMLElement>|null} [options.actions] - Actions for hover state
 * @param {Array<HTMLElement>|null} [options.idleActions] - Actions for idle state
 * @param {boolean|null} [options.showIdleActions] - Force idle actions visibility
 * @returns {HTMLDivElement} Bookmarks gallery view element
 */
function createBookmarksGalleryView(options = {}) {
  const {
    type = 'folder',
    state = 'idle',
    label = 'Label',
    subtext = 'Subtext',
    count = '4 items',
    icon = null,
    actions = null,
    idleActions = null,
    showIdleActions = null
  } = options;

  const view = document.createElement('div');
  view.className = 'bookmarks-gallery-view';

  applyBookmarksGalleryViewType(view, type);
  applyBookmarksGalleryViewState(view, state);

  const content = document.createElement('div');
  content.className = 'bookmarks-gallery-view__content';

  const iconValue = icon || (type === 'bookmark' ? 'bookmark' : 'folder');
  const iconEl = createBookmarksGalleryViewIcon(iconValue);
  if (iconEl) {
    content.appendChild(iconEl);
  }

  const textEl = document.createElement('div');
  textEl.className = 'bookmarks-gallery-view__text';

  const labelEl = document.createElement('div');
  labelEl.className = 'bookmarks-gallery-view__label';
  labelEl.textContent = label;

  const subtextEl = document.createElement('div');
  subtextEl.className = 'bookmarks-gallery-view__subtext';
  subtextEl.textContent = type === 'folder' ? count : subtext;

  textEl.appendChild(labelEl);
  textEl.appendChild(subtextEl);
  content.appendChild(textEl);
  view.appendChild(content);

  const defaultIdleActions = getDefaultBookmarksGalleryViewActions(type, 'idle');
  const defaultHoverActions = getDefaultBookmarksGalleryViewActions(type, 'hover');

  const actionsToRender = state === 'idle'
    ? (Array.isArray(idleActions) ? idleActions : defaultIdleActions)
    : (Array.isArray(actions) ? actions : defaultHoverActions);

  if (actionsToRender.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'bookmarks-gallery-view__actions';
    actionsToRender.forEach((actionEl) => {
      if (actionEl instanceof HTMLElement) {
        actionsEl.appendChild(actionEl);
      }
    });
    view.appendChild(actionsEl);

    if (state === 'idle') {
      const shouldShow = showIdleActions === null ? true : showIdleActions;
      if (shouldShow) {
        view.classList.add('bookmarks-gallery-view--actions-visible');
      }
    }
  }

  return view;
}

/**
 * Applies bookmarks-gallery-view type
 * @param {HTMLDivElement} view - View element
 * @param {string} type - 'bookmark' or 'folder'
 */
function applyBookmarksGalleryViewType(view, type) {
  if (!view || !view.classList) return;
  view.classList.remove('bookmarks-gallery-view--bookmark', 'bookmarks-gallery-view--folder');
  view.classList.add(`bookmarks-gallery-view--${type}`);
}

/**
 * Applies bookmarks-gallery-view state
 * @param {HTMLDivElement} view - View element
 * @param {string} state - 'idle' or 'hover'
 */
function applyBookmarksGalleryViewState(view, state) {
  if (!view || !view.classList) return;
  view.classList.remove('bookmarks-gallery-view--idle', 'bookmarks-gallery-view--hover');
  view.classList.add(`bookmarks-gallery-view--${state}`);
}

/**
 * Updates label text
 * @param {HTMLDivElement} view - View element
 * @param {string} label - New label
 */
function updateBookmarksGalleryViewLabel(view, label) {
  const labelEl = view.querySelector('.bookmarks-gallery-view__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

/**
 * Updates bookmark subtext
 * @param {HTMLDivElement} view - View element
 * @param {string} subtext - New subtext
 */
function updateBookmarksGalleryViewSubtext(view, subtext) {
  const subtextEl = view.querySelector('.bookmarks-gallery-view__subtext');
  if (subtextEl) {
    subtextEl.textContent = subtext;
  }
}

/**
 * Updates folder count text
 * @param {HTMLDivElement} view - View element
 * @param {string} count - New count text
 */
function updateBookmarksGalleryViewCount(view, count) {
  updateBookmarksGalleryViewSubtext(view, count);
}

function createBookmarksGalleryViewIcon(icon) {
  if (!icon) return null;

  const iconEl = document.createElement('div');
  iconEl.className = 'bookmarks-gallery-view__icon';

  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      const materialIcon = document.createElement('span');
      materialIcon.className = 'material-symbols-outlined';
      materialIcon.textContent = icon;
      iconEl.appendChild(materialIcon);
    }
  } else if (icon instanceof HTMLElement) {
    iconEl.appendChild(icon);
  }

  return iconEl;
}

function getDefaultBookmarksGalleryViewActions(type, state) {
  if (typeof createCubeActionButton !== 'function') {
    return [];
  }

  const labelAction = createCubeActionButton({
    icon: 'label',
    label: 'Label',
    tooltip: 'Label'
  });
  const editAction = createCubeActionButton({
    icon: 'edit',
    label: 'Edit',
    tooltip: 'Edit'
  });
  const closeAction = createCubeActionButton({
    icon: 'close',
    label: 'Remove',
    tooltip: 'Remove',
    colorScheme: 'destructive'
  });

  if (type === 'bookmark' && state === 'idle') {
    return [labelAction].filter(Boolean);
  }

  if (type === 'bookmark' && state === 'hover') {
    return [labelAction, editAction, closeAction].filter(Boolean);
  }

  if (type === 'folder' && state === 'hover') {
    return [editAction, closeAction].filter(Boolean);
  }

  return [];
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createBookmarksGalleryView,
    applyBookmarksGalleryViewType,
    applyBookmarksGalleryViewState,
    updateBookmarksGalleryViewLabel,
    updateBookmarksGalleryViewSubtext,
    updateBookmarksGalleryViewCount
  };
}
