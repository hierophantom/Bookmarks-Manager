/**
 * Search Component
 * 
 * Design System Component - BMG-99
 * 
 * Search input field with optional keyboard shortcut hint
 * 
 * @example
 * const search = createSearchComp({
 *   placeholder: 'Search bookmarks',
 *   shortcutKeys: ['Cmd', 'K'],
 *   contrast: 'low'
 * });
 */

/**
 * Creates a search component element
 * @param {Object} options - Search component configuration
 * @param {string} [options.placeholder='Search'] - Input placeholder
 * @param {string} [options.value=''] - Initial input value
 * @param {string|HTMLElement} [options.icon] - Custom icon (SVG string, URL, or element)
 * @param {Array<string>} [options.shortcutKeys] - Keyboard shortcut keys to display
 * @param {string} [options.contrast='low'] - Contrast mode: 'low' or 'high'
 * @param {boolean} [options.disabled=false] - Whether input is disabled
 * @param {Function} [options.onInput] - Input event handler
 * @param {Function} [options.onSubmit] - Submit handler (Enter key)
 * @param {string} [options.ariaLabel='Search'] - Accessibility label
 * @returns {HTMLDivElement} The search component element
 */
function createSearchComp(options = {}) {
  const {
    placeholder = 'Search',
    value = '',
    icon = null,
    shortcutKeys = [],
    contrast = 'low',
    disabled = false,
    onInput = null,
    onSubmit = null,
    ariaLabel = 'Search'
  } = options;

  // Container
  const container = document.createElement('div');
  container.className = `search-comp search-comp--${contrast}`;

  // Icon
  const iconEl = document.createElement('span');
  iconEl.className = 'search-comp__icon';
  iconEl.setAttribute('aria-hidden', 'true');

  if (icon) {
    if (typeof icon === 'string') {
      if (icon.startsWith('<svg')) {
        iconEl.innerHTML = icon;
      } else {
        const img = document.createElement('img');
        img.src = icon;
        img.alt = '';
        iconEl.appendChild(img);
      }
    } else if (icon instanceof HTMLElement) {
      iconEl.appendChild(icon);
    }
  } else {
    iconEl.innerHTML = "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M15.5 14h-.79l-.28-.27a6 6 0 10-.71.71l.27.28v.79L20 20.5 21.5 19 15.5 14zm-6.5 0a4 4 0 110-8 4 4 0 010 8z'/></svg>";
  }

  // Input
  const input = document.createElement('input');
  input.className = 'search-comp__input';
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value;
  input.setAttribute('aria-label', ariaLabel);

  if (disabled) {
    input.disabled = true;
    container.classList.add('search-comp--disabled');
  }

  // Shortcut hint
  let shortcutEl = null;
  if (shortcutKeys && shortcutKeys.length > 0) {
    shortcutEl = document.createElement('div');
    shortcutEl.className = 'search-comp__shortcut';
    shortcutEl.setAttribute('aria-hidden', 'true');

    shortcutKeys.forEach(key => {
      const keyEl = document.createElement('span');
      keyEl.className = 'search-comp__shortcut-key';
      keyEl.textContent = key;
      shortcutEl.appendChild(keyEl);
    });
  }

  // Assemble
  container.appendChild(iconEl);
  container.appendChild(input);
  if (shortcutEl) {
    container.appendChild(shortcutEl);
  }

  // Events
  if (typeof onInput === 'function') {
    input.addEventListener('input', event => onInput(event, input.value));
  }

  if (typeof onSubmit === 'function') {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        onSubmit(event, input.value);
      }
    });
  }

  return container;
}

/**
 * Updates search component value
 * @param {HTMLDivElement} searchComp - The search component element
 * @param {string} value - New value
 */
function updateSearchCompValue(searchComp, value) {
  const input = searchComp.querySelector('.search-comp__input');
  if (input) {
    input.value = value;
  }
}

/**
 * Updates search component placeholder
 * @param {HTMLDivElement} searchComp - The search component element
 * @param {string} placeholder - New placeholder text
 */
function updateSearchCompPlaceholder(searchComp, placeholder) {
  const input = searchComp.querySelector('.search-comp__input');
  if (input) {
    input.placeholder = placeholder;
  }
}

/**
 * Toggles search component disabled state
 * @param {HTMLDivElement} searchComp - The search component element
 * @param {boolean} disabled - Whether to disable the input
 */
function toggleSearchCompDisabled(searchComp, disabled) {
  const input = searchComp.querySelector('.search-comp__input');
  if (input) {
    input.disabled = disabled;
  }
  searchComp.classList.toggle('search-comp--disabled', disabled);
}

/**
 * Updates search component shortcut keys
 * @param {HTMLDivElement} searchComp - The search component element
 * @param {Array<string>} keys - New shortcut keys
 */
function updateSearchCompShortcut(searchComp, keys) {
  const existingShortcut = searchComp.querySelector('.search-comp__shortcut');
  if (existingShortcut) {
    existingShortcut.remove();
  }

  if (keys && keys.length > 0) {
    const shortcut = document.createElement('div');
    shortcut.className = 'search-comp__shortcut';
    shortcut.setAttribute('aria-hidden', 'true');

    keys.forEach(key => {
      const keyEl = document.createElement('span');
      keyEl.className = 'search-comp__shortcut-key';
      keyEl.textContent = key;
      shortcut.appendChild(keyEl);
    });

    searchComp.appendChild(shortcut);
  }
}

/**
 * Updates search component contrast mode
 * @param {HTMLDivElement} searchComp - The search component element
 * @param {string} contrast - 'low' or 'high'
 */
function updateSearchCompContrast(searchComp, contrast) {
  searchComp.classList.remove('search-comp--low', 'search-comp--high');
  searchComp.classList.add(`search-comp--${contrast}`);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSearchComp,
    updateSearchCompValue,
    updateSearchCompPlaceholder,
    toggleSearchCompDisabled,
    updateSearchCompShortcut,
    updateSearchCompContrast
  };
}
