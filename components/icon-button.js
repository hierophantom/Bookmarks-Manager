/**
 * Cube Action Button Component
 * 
 * Design System Component - BMG-97
 * 
 * Smaller icon-only button (16×16px) with color schemes
 * Requires tooltip integration
 * 
 * @example
 * // Create cube action button with tooltip
 * const button = createIconButton({
 *   icon: '✕',
 *   label: 'Close',
 *   tooltip: 'Close panel',
 *   colorScheme: 'default',
 *   onClick: () => console.log('clicked')
 * });
 */

/**
 * Creates a cube action button element
 * @param {Object} options - Button configuration
 * @param {string|HTMLElement} options.icon - Icon (emoji string, SVG string, or element)
 * @param {string} [options.label] - Accessible label for screen readers
 * @param {string} [options.tooltip] - Tooltip text (required for UX)
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Whether button is disabled
 * @param {string} [options.colorScheme='default'] - Color scheme: 'default' or 'destructive'
 * @returns {HTMLButtonElement} The cube action button element
 */
function createIconButton(options = {}) {
  const {
    icon = '',
    label = '',
    tooltip = '',
    onClick = null,
    disabled = false,
    colorScheme = 'default'
  } = options;

  if (!icon) {
    console.error('Cube action button requires an icon');
    return null;
  }

  // Create button
  const button = document.createElement('button');
  button.className = `icon-button icon-button--${colorScheme}`;
  button.setAttribute('type', 'button');
  
  if (label) {
    button.setAttribute('aria-label', label);
  }
  
  if (disabled) {
    button.disabled = true;
  }
  
  // Create icon container
  const iconEl = document.createElement('span');
  iconEl.className = 'icon-button__icon';
  
  // Handle different icon types
  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      // SVG string
      iconEl.innerHTML = icon;
    } else {
      // Use Material Icons
      const materialIcon = document.createElement('span');
      materialIcon.className = 'material-symbols-outlined';
      materialIcon.textContent = icon;
      iconEl.appendChild(materialIcon);
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
  
  // Add tooltip (recommended for cube action buttons)
  if (tooltip) {
    if (typeof createTooltip === 'function') {
      createTooltip({
        text: tooltip,
        target: button,
        position: 'top'
      });
    } else {
      // Fallback: use title attribute
      button.setAttribute('title', tooltip);
    }
  }
  
  return button;
}

/**
 * Updates cube action button icon
 * @param {HTMLButtonElement} button - The cube action button element
 * @param {string|HTMLElement} icon - New icon
 */
function updateCubeActionButtonIcon(button, icon) {
  const iconEl = button.querySelector('.icon-button__icon');
  if (!iconEl) return;
  
  iconEl.innerHTML = '';
  
  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      iconEl.textContent = icon;
      iconEl.style.fontSize = '10px';
    }
  } else if (icon instanceof HTMLElement) {
    iconEl.appendChild(icon);
  }
}

/**
 * Updates cube action button color scheme
 * @param {HTMLButtonElement} button - The cube action button element
 * @param {string} colorScheme - 'default' or 'destructive'
 */
function updateCubeActionButtonColorScheme(button, colorScheme) {
  button.classList.remove('icon-button--default', 'icon-button--destructive');
  button.classList.add(`icon-button--${colorScheme}`);
}

/**
 * Toggles cube action button disabled state
 * @param {HTMLButtonElement} button - The cube action button element
 * @param {boolean} disabled - Whether to disable the button
 */
function toggleCubeActionButtonDisabled(button, disabled) {
  button.disabled = disabled;
}

/**
 * Common icon presets for cube action buttons
 */
const CUBE_ACTION_BUTTON_ICONS = {
  // Using simple symbols - replace with actual SVG icons as needed
  CLOSE: '✕',
  DELETE: '🗑',
  EDIT: '✏',
  ADD: '+',
  REMOVE: '−',
  CHECK: '✓',
  SETTINGS: '⚙',
  MORE: '⋯',
  UP: '↑',
  DOWN: '↓',
  LEFT: '←',
  RIGHT: '→',
  REFRESH: '↻',
  HELP: '?',
  INFO: 'ℹ'
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createIconButton,
    updateCubeActionButtonIcon,
    updateCubeActionButtonColorScheme,
    toggleCubeActionButtonDisabled,
    CUBE_ACTION_BUTTON_ICONS
  };
}
