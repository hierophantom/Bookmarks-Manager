/**
 * Pagination Component
 * 
 * Design System Component - BMG-88
 * 
 * @example
 * const pagination = createPagination({
 *   items: [
 *     { label: 'Homepage', icon: iconCastle, type: 'current' },
 *     { icon: iconBook, type: 'other', iconOnly: true, ariaLabel: 'Books' },
 *     { icon: iconRoute, type: 'other', iconOnly: true, ariaLabel: 'Routes' }
 *   ],
 *   onItemClick: (item, index) => console.log(item, index)
 * });
 */

/**
 * Creates a pagination container with buttons
 * @param {Object} options - Pagination configuration
 * @param {Array} [options.items=[]] - Button items
 * @param {Function} [options.onItemClick] - Click handler
 * @returns {HTMLDivElement} Pagination element
 */
function createPagination(options = {}) {
  const { items = [], onItemClick = null } = options;

  const container = document.createElement('div');
  container.className = 'pagination';

  items.forEach((item, index) => {
    const button = createPaginationButton({
      ...item,
      onClick: (event) => {
        if (typeof onItemClick === 'function') {
          onItemClick(item, index, event);
        }
      }
    });
    container.appendChild(button);
  });

  return container;
}

/**
 * Creates a pagination button element
 * @param {Object} options - Button configuration
 * @param {string} [options.label] - Button label
 * @param {string} [options.icon] - Icon source (SVG path or data URI)
 * @param {'current'|'other'} [options.type='other'] - Button type
 * @param {boolean} [options.iconOnly=false] - Whether to show only icon
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Whether button is disabled
 * @param {string} [options.ariaLabel] - Accessibility label
 * @returns {HTMLButtonElement} Button element
 */
function createPaginationButton(options = {}) {
  const {
    label = '',
    icon = '',
    type = 'other',
    iconOnly = false,
    onClick = null,
    disabled = false,
    ariaLabel = label
  } = options;

  const button = document.createElement('button');
  button.className = `pagination__button pagination__button--${type}`;
  button.type = 'button';

  if (iconOnly) {
    button.classList.add('pagination__button--icon-only');
  }

  if (disabled) {
    button.disabled = true;
    button.classList.add('pagination__button--disabled');
  }

  button.setAttribute('aria-label', ariaLabel || label);
  if (type === 'current') {
    button.setAttribute('aria-current', 'page');
  }

  if (icon) {
    const iconEl = document.createElement('img');
    iconEl.className = 'pagination__icon';
    iconEl.src = icon;
    iconEl.alt = '';
    iconEl.setAttribute('aria-hidden', 'true');
    button.appendChild(iconEl);
  }

  if (label && !iconOnly) {
    const labelEl = document.createElement('span');
    labelEl.className = 'pagination__label';
    labelEl.textContent = label;
    button.appendChild(labelEl);
  }

  if (onClick && typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  return button;
}

/**
 * Updates which pagination button is current
 * @param {HTMLDivElement} pagination - Pagination container
 * @param {number} index - Button index to set as current
 */
function updatePaginationCurrent(pagination, index) {
  const buttons = Array.from(pagination.querySelectorAll('.pagination__button'));
  buttons.forEach((button, idx) => {
    button.classList.remove('pagination__button--current', 'pagination__button--other');
    const nextType = idx === index ? 'current' : 'other';
    button.classList.add(`pagination__button--${nextType}`);
    if (nextType === 'current') {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });
}

/**
 * Toggle button disabled state
 * @param {HTMLButtonElement} button - The button element
 * @param {boolean} disabled - Whether to disable the button
 */
function togglePaginationButtonDisabled(button, disabled) {
  button.disabled = disabled;
  button.classList.toggle('pagination__button--disabled', disabled);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createPagination,
    createPaginationButton,
    updatePaginationCurrent,
    togglePaginationButtonDisabled
  };
}
