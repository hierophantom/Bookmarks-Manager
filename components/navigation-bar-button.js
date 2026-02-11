/**
 * Navigation Bar Button Component
 * 
 * Design System Component - BMG-87
 * 
 * @example
 * // Create a current page button
 * const currentBtn = createNavigationButton({
 *   label: 'Page 1',
 *   icon: 'book-icon.svg',
 *   type: 'current',
 *   onClick: () => console.log('Page 1 clicked')
 * });
 * 
 * @example
 * // Create an icon-only button
 * const iconBtn = createNavigationButton({
 *   icon: 'book-icon.svg',
 *   type: 'other',
 *   iconOnly: true,
 *   onClick: () => console.log('Icon clicked')
 * });
 */

/**
 * Creates a navigation bar button element
 * @param {Object} options - Button configuration
 * @param {string} [options.label] - Button label text
 * @param {string} [options.icon] - Icon source (SVG path or data URI)
 * @param {'current'|'other'} [options.type='other'] - Button type
 * @param {boolean} [options.iconOnly=false] - Whether to show only icon
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Whether button is disabled
 * @param {string} [options.ariaLabel] - Accessibility label
 * @returns {HTMLButtonElement} The button element
 */
function createNavigationButton(options = {}) {
  const {
    label = '',
    icon = '',
    type = 'other',
    iconOnly = false,
    onClick = null,
    disabled = false,
    ariaLabel = label
  } = options;

  // Create button element
  const button = document.createElement('button');
  button.className = `nav-button nav-button--${type}`;
  button.type = 'button';
  
  if (iconOnly) {
    button.classList.add('nav-button--icon-only');
  }
  
  if (disabled) {
    button.disabled = true;
    button.classList.add('nav-button--disabled');
  }
  
  // Accessibility
  button.setAttribute('aria-label', ariaLabel || label);
  if (type === 'current') {
    button.setAttribute('aria-current', 'page');
  }

  // Create icon element if provided
  if (icon) {
    const iconEl = document.createElement('img');
    iconEl.className = 'nav-button__icon';
    iconEl.src = icon;
    iconEl.alt = '';
    iconEl.setAttribute('aria-hidden', 'true');
    button.appendChild(iconEl);
  }

  // Create label element if provided and not icon-only
  if (label && !iconOnly) {
    const labelEl = document.createElement('span');
    labelEl.className = 'nav-button__label';
    labelEl.textContent = label;
    button.appendChild(labelEl);
  }

  // Attach click handler
  if (onClick && typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  return button;
}

/**
 * Updates button state between 'current' and 'other'
 * @param {HTMLButtonElement} button - The button element
 * @param {'current'|'other'} type - New button type
 */
function updateNavigationButtonType(button, type) {
  button.classList.remove('nav-button--current', 'nav-button--other');
  button.classList.add(`nav-button--${type}`);
  
  if (type === 'current') {
    button.setAttribute('aria-current', 'page');
  } else {
    button.removeAttribute('aria-current');
  }
}

/**
 * Toggle button disabled state
 * @param {HTMLButtonElement} button - The button element
 * @param {boolean} disabled - Whether to disable the button
 */
function toggleNavigationButtonDisabled(button, disabled) {
  button.disabled = disabled;
  button.classList.toggle('nav-button--disabled', disabled);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createNavigationButton,
    updateNavigationButtonType,
    toggleNavigationButtonDisabled
  };
}
