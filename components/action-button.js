/**
 * Action Button Component
 * 
 * Design System Component - BMG-96
 * 
 * @example
 * // Create action button with icon
 * const button = createActionButton({
 *   icon: '⚙️',
 *   label: 'Settings',
 *   onClick: () => console.log('clicked')
 * });
 */

/**
 * Creates an action button element
 * @param {Object} options - Button configuration
 * @param {string|HTMLElement} options.icon - Icon (emoji string, SVG string, or element)
 * @param {string} [options.label] - Accessible label for screen readers
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Whether button is disabled
 * @param {string} [options.tooltip] - Tooltip text (optional)
 * @returns {HTMLButtonElement} The action button element
 */
function createActionButton(options = {}) {
  const {
    icon = '',
    label = '',
    onClick = null,
    disabled = false,
    tooltip = ''
  } = options;

  if (!icon) {
    console.error('Action button requires an icon');
    return null;
  }

  // Create button
  const button = document.createElement('button');
  button.className = 'action-button';
  button.setAttribute('type', 'button');
  
  if (label) {
    button.setAttribute('aria-label', label);
  }
  
  if (disabled) {
    button.disabled = true;
  }
  
  // Create icon container
  const iconEl = document.createElement('span');
  iconEl.className = 'action-button__icon';
  
  // Handle different icon types
  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      // SVG string
      iconEl.innerHTML = icon;
    } else {
      // Emoji or text icon
      iconEl.textContent = icon;
      iconEl.style.fontSize = '20px';
    }
  } else if (icon instanceof HTMLElement) {
    // HTML element (e.g., img)
    iconEl.appendChild(icon);
  }
  
  button.appendChild(iconEl);
  
  // Handle click
  if (onClick && !disabled) {
    button.addEventListener('click', onClick);
  }
  
  // Add tooltip if using tooltip component
  if (tooltip && typeof createTooltip === 'function') {
    createTooltip({
      text: tooltip,
      target: button,
      position: 'top'
    });
  }
  
  return button;
}

/**
 * Updates action button icon
 * @param {HTMLButtonElement} button - The action button element
 * @param {string|HTMLElement} icon - New icon
 */
function updateActionButtonIcon(button, icon) {
  const iconEl = button.querySelector('.action-button__icon');
  if (!iconEl) return;
  
  iconEl.innerHTML = '';
  
  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      iconEl.textContent = icon;
      iconEl.style.fontSize = '20px';
    }
  } else if (icon instanceof HTMLElement) {
    iconEl.appendChild(icon);
  }
}

/**
 * Toggles action button disabled state
 * @param {HTMLButtonElement} button - The action button element
 * @param {boolean} disabled - Whether to disable the button
 */
function toggleActionButtonDisabled(button, disabled) {
  button.disabled = disabled;
}

/**
 * Common icon presets as SVG strings
 */
const ACTION_BUTTON_ICONS = {
  // Using simple emoji for now - replace with actual SVG icons
  SETTINGS: '⚙️',
  ADD: '+',
  EDIT: '✏️',
  DELETE: '🗑️',
  CLOSE: '✕',
  MENU: '☰',
  SEARCH: '🔍',
  STAR: '⭐',
  SHARE: '📤',
  DOWNLOAD: '⬇️',
  UPLOAD: '⬆️',
  REFRESH: '🔄',
  INFO: 'ℹ️',
  HELP: '?',
  MORE: '⋯'
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createActionButton,
    updateActionButtonIcon,
    toggleActionButtonDisabled,
    ACTION_BUTTON_ICONS
  };
}
