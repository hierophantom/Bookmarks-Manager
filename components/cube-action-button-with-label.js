/**
 * Cube Action Button with Label Component
 * 
 * Design System Component - BMG-98
 * 
 * Button with icon + text label for compact actions
 * 
 * @example
 * // Create button with icon and label
 * const button = createCubeActionButtonWithLabel({
 *   icon: '+',
 *   label: 'Add Item',
 *   colorScheme: 'primary',
 *   onClick: () => console.log('clicked')
 * });
 */

/**
 * Creates a cube action button with label element
 * @param {Object} options - Button configuration
 * @param {string|HTMLElement} options.icon - Icon (emoji string, SVG string, or element)
 * @param {string} options.label - Button label text (required)
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Whether button is disabled
 * @param {string} [options.colorScheme='default'] - Color scheme: 'primary', 'default', or 'destructive'
 * @param {string} [options.size='small'] - Size variant: 'small' or 'medium'
 * @param {string} [options.tooltip] - Optional tooltip text
 * @returns {HTMLButtonElement} The cube action button with label element
 */
function createCubeActionButtonWithLabel(options = {}) {
  const {
    icon = '',
    label = '',
    onClick = null,
    disabled = false,
    colorScheme = 'default',
    size = 'small',
    tooltip = ''
  } = options;

  if (!icon && !label) {
    console.error('Cube action button with label requires either an icon or label');
    return null;
  }

  // Create button
  const button = document.createElement('button');
  button.className = `cube-action-button-with-label cube-action-button-with-label--${colorScheme} cube-action-button-with-label--${size}`;
  button.setAttribute('type', 'button');
  
  if (!label && icon) {
    button.classList.add('cube-action-button-with-label--icon-only');
  }
  
  if (disabled) {
    button.disabled = true;
  }
  
  // Create icon container (if icon provided)
  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'cube-action-button-with-label__icon';
    
    // Handle different icon types
    if (typeof icon === 'string') {
      if (icon.startsWith('<svg')) {
        // SVG string
        iconEl.innerHTML = icon;
      } else {
        // Emoji or text icon
        iconEl.textContent = icon;
        iconEl.style.fontSize = size === 'medium' ? '14px' : '10px';
      }
    } else if (icon instanceof HTMLElement) {
      // HTML element (e.g., img)
      iconEl.appendChild(icon);
    }
    
    button.appendChild(iconEl);
  }
  
  // Create label
  if (label) {
    const labelEl = document.createElement('span');
    labelEl.className = 'cube-action-button-with-label__label';
    labelEl.textContent = label;
    button.appendChild(labelEl);
    
    // Set aria-label same as visible label
    button.setAttribute('aria-label', label);
  }
  
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
 * Updates cube action button with label text
 * @param {HTMLButtonElement} button - The button element
 * @param {string} label - New label text
 */
function updateCubeActionButtonWithLabelText(button, label) {
  const labelEl = button.querySelector('.cube-action-button-with-label__label');
  if (labelEl) {
    labelEl.textContent = label;
    button.setAttribute('aria-label', label);
  }
}

/**
 * Updates cube action button with label icon
 * @param {HTMLButtonElement} button - The button element
 * @param {string|HTMLElement} icon - New icon
 */
function updateCubeActionButtonWithLabelIcon(button, icon) {
  const iconEl = button.querySelector('.cube-action-button-with-label__icon');
  if (!iconEl) return;
  
  iconEl.innerHTML = '';
  
  const size = button.classList.contains('cube-action-button-with-label--medium') ? 'medium' : 'small';
  
  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      iconEl.textContent = icon;
      iconEl.style.fontSize = size === 'medium' ? '14px' : '10px';
    }
  } else if (icon instanceof HTMLElement) {
    iconEl.appendChild(icon);
  }
}

/**
 * Updates cube action button with label color scheme
 * @param {HTMLButtonElement} button - The button element
 * @param {string} colorScheme - 'primary', 'default', or 'destructive'
 */
function updateCubeActionButtonWithLabelColorScheme(button, colorScheme) {
  button.classList.remove(
    'cube-action-button-with-label--primary',
    'cube-action-button-with-label--default',
    'cube-action-button-with-label--destructive'
  );
  button.classList.add(`cube-action-button-with-label--${colorScheme}`);
}

/**
 * Toggles cube action button with label disabled state
 * @param {HTMLButtonElement} button - The button element
 * @param {boolean} disabled - Whether to disable the button
 */
function toggleCubeActionButtonWithLabelDisabled(button, disabled) {
  button.disabled = disabled;
}

/**
 * Common icon presets for cube action buttons with labels
 */
const CUBE_ACTION_WITH_LABEL_ICONS = {
  // Using simple symbols - replace with actual SVG icons as needed
  ADD: '+',
  EDIT: '✏',
  DELETE: '🗑',
  SAVE: '💾',
  CANCEL: '✕',
  CONFIRM: '✓',
  DOWNLOAD: '⬇',
  UPLOAD: '⬆',
  SHARE: '↗',
  SETTINGS: '⚙',
  FILTER: '⚑',
  SORT: '⇅',
  SEARCH: '🔍',
  REFRESH: '↻',
  STAR: '⭐',
  BOOKMARK: '🔖',
  TAG: '#',
  FOLDER: '📁',
  LINK: '🔗',
  MORE: '⋯'
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createCubeActionButtonWithLabel,
    updateCubeActionButtonWithLabelText,
    updateCubeActionButtonWithLabelIcon,
    updateCubeActionButtonWithLabelColorScheme,
    toggleCubeActionButtonWithLabelDisabled,
    CUBE_ACTION_WITH_LABEL_ICONS
  };
}
