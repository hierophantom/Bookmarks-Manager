/**
 * Button Destructive Component
 *
 * Design System Component - BMG-105
 *
 * @example
 * const button = createDestructiveButton({
 *   label: 'Delete',
 *   contrast: 'low'
 * });
 */

/**
 * Creates a destructive button element
 * @param {Object} options - Button configuration
 * @param {string} [options.label='Button'] - Button label
 * @param {string|HTMLElement} [options.icon] - Optional icon
 * @param {Array<string>} [options.shortcutKeys] - Optional keyboard shortcut keys
 * @param {boolean} [options.shortcutText=false] - Use text display for shortcut
 * @param {string} [options.state='idle'] - 'idle' or 'hover'
 * @param {string} [options.contrast='low'] - 'low' or 'high'
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Disabled state
 * @returns {HTMLButtonElement} The button element
 */
function createDestructiveButton(options = {}) {
  const {
    label = 'Button',
    icon = null,
    shortcutKeys = null,
    shortcutText = false,
    state = 'idle',
    contrast = 'low',
    onClick = null,
    disabled = false
  } = options;

  const button = document.createElement('button');
  button.className = `button-destructive button-destructive--${contrast}`;
  button.setAttribute('type', 'button');

  if (state === 'hover') {
    button.classList.add('button-destructive--hover');
  }

  if (disabled) {
    button.disabled = true;
    button.classList.add('button-destructive--disabled');
  }

  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'button-destructive__icon';
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

  const labelEl = document.createElement('span');
  labelEl.className = 'button-destructive__label';
  labelEl.textContent = label;
  button.appendChild(labelEl);

  if (shortcutKeys && shortcutKeys.length) {
    const hint = createDestructiveButtonHint(shortcutKeys, shortcutText);
    button.appendChild(hint);
  }

  if (typeof onClick === 'function' && !disabled) {
    button.addEventListener('click', onClick);
  }

  return button;
}

/**
 * Creates a keyboard hint for a destructive button
 * @param {Array<string>} keys - Shortcut keys
 * @param {boolean} useText - Use text display
 * @returns {HTMLElement} Hint element
 */
function createDestructiveButtonHint(keys, useText) {
  const hintWrap = document.createElement('span');
  hintWrap.className = 'button-destructive__hint';

  if (typeof createKeyboardHint === 'function') {
    const hint = createKeyboardHint(keys, useText, 'small');
    hintWrap.appendChild(hint);
    return hintWrap;
  }

  hintWrap.classList.add('button-destructive__hint--fallback');
  keys.forEach((key, index) => {
    const keyEl = document.createElement('span');
    keyEl.className = 'button-destructive__hint-key';
    keyEl.textContent = key;
    hintWrap.appendChild(keyEl);

    if (index < keys.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'button-destructive__hint-key';
      sep.textContent = '+';
      sep.style.opacity = '0.6';
      hintWrap.appendChild(sep);
    }
  });

  return hintWrap;
}

/**
 * Updates destructive button label
 * @param {HTMLButtonElement} button - Button element
 * @param {string} label - New label
 */
function updateDestructiveButtonLabel(button, label) {
  const labelEl = button.querySelector('.button-destructive__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

/**
 * Updates destructive button contrast
 * @param {HTMLButtonElement} button - Button element
 * @param {string} contrast - 'low' or 'high'
 */
function updateDestructiveButtonContrast(button, contrast) {
  button.classList.remove('button-destructive--low', 'button-destructive--high');
  button.classList.add(`button-destructive--${contrast}`);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createDestructiveButton,
    updateDestructiveButtonLabel,
    updateDestructiveButtonContrast
  };
}
