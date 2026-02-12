/**
 * Breadcrumbs Component
 *
 * Design System Component - BMG-106
 *
 * @example
 * const breadcrumbs = createBreadcrumbs({
 *   items: [
 *     { label: 'Home', type: 'root', onClick: () => {} },
 *     { label: 'Bookmarks', type: 'current' }
 *   ]
 * });
 */

/**
 * Creates a breadcrumbs navigation element
 * @param {Object} options - Breadcrumb configuration
 * @param {Array<Object>} [options.items=[]] - Breadcrumb items
 * @returns {HTMLElement} The breadcrumbs element
 */
function createBreadcrumbs(options = {}) {
  const { items = [] } = options;

  const nav = document.createElement('nav');
  nav.className = 'breadcrumbs';
  nav.setAttribute('aria-label', 'Breadcrumb');

  const list = document.createElement('ol');
  list.className = 'breadcrumbs__list';
  nav.appendChild(list);

  items.forEach((item, index) => {
    if (index > 0) {
      const separator = document.createElement('li');
      separator.className = 'breadcrumbs__separator';
      separator.textContent = '/';
      list.appendChild(separator);
    }

    const listItem = document.createElement('li');
    listItem.className = 'breadcrumbs__item';

    const link = createBreadcrumbItem(item);
    if (link) {
      listItem.appendChild(link);
      list.appendChild(listItem);
    }
  });

  return nav;
}

/**
 * Creates a single breadcrumb item
 * @param {Object} item - Breadcrumb item configuration
 * @returns {HTMLElement} Breadcrumb item element
 */
function createBreadcrumbItem(item = {}) {
  const {
    label = '',
    type = 'root',
    href = '',
    onClick = null,
    state = 'idle'
  } = item;

  if (!label) {
    console.error('Breadcrumb item requires a label');
    return null;
  }

  let element;
  const isCurrent = type === 'current';

  if (isCurrent) {
    element = document.createElement('span');
    element.className = 'breadcrumbs__link breadcrumbs__link--current';
    element.setAttribute('aria-current', 'page');
  } else if (href) {
    element = document.createElement('a');
    element.className = 'breadcrumbs__link breadcrumbs__link--root';
    element.setAttribute('href', href);
  } else {
    element = document.createElement('button');
    element.className = 'breadcrumbs__link breadcrumbs__link--root';
    element.setAttribute('type', 'button');
  }

  element.textContent = label;

  if (state === 'hover' && !isCurrent) {
    element.classList.add('breadcrumbs__link--hover');
  }

  if (typeof onClick === 'function' && !isCurrent) {
    element.addEventListener('click', onClick);
  }

  return element;
}

/**
 * Updates breadcrumbs items
 * @param {HTMLElement} breadcrumbs - Breadcrumbs element
 * @param {Array<Object>} items - New breadcrumb items
 */
function updateBreadcrumbs(breadcrumbs, items = []) {
  const list = breadcrumbs.querySelector('.breadcrumbs__list');
  if (!list) return;

  list.innerHTML = '';
  items.forEach((item, index) => {
    if (index > 0) {
      const separator = document.createElement('li');
      separator.className = 'breadcrumbs__separator';
      separator.textContent = '/';
      list.appendChild(separator);
    }

    const listItem = document.createElement('li');
    listItem.className = 'breadcrumbs__item';

    const link = createBreadcrumbItem(item);
    if (link) {
      listItem.appendChild(link);
      list.appendChild(listItem);
    }
  });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createBreadcrumbs,
    createBreadcrumbItem,
    updateBreadcrumbs
  };
}
