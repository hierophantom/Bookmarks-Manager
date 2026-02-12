/**
 * Button Primary Component
 *
 * Design System Component - BMG-103
 *
 * @example
 * const button = createPrimaryButton({
 *   label: 'Save',
 *   contrast: 'low'
 * });
 */

/**
 * Creates a primary button element
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
function createPrimaryButton(options = {}) {
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
  button.className = `button-primary button-primary--${contrast}`;
  button.setAttribute('type', 'button');

  if (state === 'hover') {
    button.classList.add('button-primary--hover');
  }

  if (disabled) {
    button.disabled = true;
    button.classList.add('button-primary--disabled');
  }

  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'button-primary__icon';
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
  labelEl.className = 'button-primary__label';
  labelEl.textContent = label;
  button.appendChild(labelEl);

  if (shortcutKeys && shortcutKeys.length) {
    const hint = createPrimaryButtonHint(shortcutKeys, shortcutText);
    button.appendChild(hint);
  }

  if (typeof onClick === 'function' && !disabled) {
    button.addEventListener('click', onClick);
  }

  return button;
}

/**
 * Creates a keyboard hint for a primary button
 * @param {Array<string>} keys - Shortcut keys
 * @param {boolean} useText - Use text display
 * @returns {HTMLElement} Hint element
 */
function createPrimaryButtonHint(keys, useText) {
  const hintWrap = document.createElement('span');
  hintWrap.className = 'button-primary__hint';

  if (typeof createKeyboardHint === 'function') {
    const hint = createKeyboardHint(keys, useText, 'small');
    hintWrap.appendChild(hint);
    return hintWrap;
  }

  hintWrap.classList.add('button-primary__hint--fallback');
  keys.forEach((key, index) => {
    const keyEl = document.createElement('span');
    keyEl.className = 'button-primary__hint-key';
    keyEl.textContent = key;
    hintWrap.appendChild(keyEl);

    if (index < keys.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'button-primary__hint-key';
      sep.textContent = '+';
      sep.style.opacity = '0.6';
      hintWrap.appendChild(sep);
    }
  });

  return hintWrap;
}

/**
 * Updates primary button label
 * @param {HTMLButtonElement} button - Button element
 * @param {string} label - New label
 */
function updatePrimaryButtonLabel(button, label) {
  const labelEl = button.querySelector('.button-primary__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

/**
 * Updates primary button contrast
 * @param {HTMLButtonElement} button - Button element
 * @param {string} contrast - 'low' or 'high'
 */
function updatePrimaryButtonContrast(button, contrast) {
  button.classList.remove('button-primary--low', 'button-primary--high');
  button.classList.add(`button-primary--${contrast}`);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createPrimaryButton,
    updatePrimaryButtonLabel,
    updatePrimaryButtonContrast
  };
}
