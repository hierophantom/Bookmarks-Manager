/**
 * Box Selector Component
 *
 * Design System Component - BMG-107
 *
 * @example
 * const selector = createBoxSelector({
 *   label: 'A',
 *   state: 'idle'
 * });
 */

/**
 * Creates a box selector element
 * @param {Object} options - Selector configuration
 * @param {string} [options.label=''] - Label text
 * @param {string|HTMLElement} [options.icon] - Optional icon
 * @param {string} [options.state='idle'] - 'idle', 'hover', 'active'
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Disabled state
 * @returns {HTMLButtonElement} The selector element
 */
function createBoxSelector(options = {}) {
  const {
    label = '',
    icon = null,
    state = 'idle',
    onClick = null,
    disabled = false
  } = options;

  const button = document.createElement('button');
  button.className = 'box-selector';
  button.setAttribute('type', 'button');

  if (disabled) {
    button.disabled = true;
    button.classList.add('box-selector--disabled');
  }

  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'box-selector__icon';

    if (typeof icon === 'string') {
      if (icon.startsWith('<svg')) {
        iconEl.innerHTML = icon;
      } else {
        iconEl.textContent = icon;
      }
    } else if (icon instanceof HTMLElement) {
      iconEl.appendChild(icon);
    }

    button.appendChild(iconEl);
  }

  if (label) {
    const labelEl = document.createElement('span');
    labelEl.className = 'box-selector__label';
    labelEl.textContent = label;
    button.appendChild(labelEl);
  }

  applyBoxSelectorState(button, state);

  if (typeof onClick === 'function' && !disabled) {
    button.addEventListener('click', onClick);
  }

  return button;
}

/**
 * Applies box selector state
 * @param {HTMLButtonElement} selector - Selector element
 * @param {string} state - 'idle', 'hover', 'active'
 */
function applyBoxSelectorState(selector, state) {
  selector.classList.remove('box-selector--idle', 'box-selector--hover', 'box-selector--active');
  selector.classList.add(`box-selector--${state}`);
}

/**
 * Updates box selector label
 * @param {HTMLButtonElement} selector - Selector element
 * @param {string} label - New label
 */
function updateBoxSelectorLabel(selector, label) {
  const labelEl = selector.querySelector('.box-selector__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createBoxSelector,
    applyBoxSelectorState,
    updateBoxSelectorLabel
  };
}
