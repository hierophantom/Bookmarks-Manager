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

  // Input
  const input = document.createElement('input');
  input.className = 'search-comp__input';
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value;
  input.setAttribute('aria-label', ariaLabel);

  // Clear button
  const clearButton = document.createElement('button');
  clearButton.className = 'search-comp__clear';
  clearButton.type = 'button';
  clearButton.setAttribute('aria-label', 'Clear search');
  clearButton.innerHTML = "<span class='material-symbols-outlined' aria-hidden='true'>close</span>";

  const setHasValue = (hasValue) => {
    container.classList.toggle('search-comp--has-value', hasValue);
  };

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
  container.appendChild(input);
  if (shortcutEl) {
    container.appendChild(shortcutEl);
  }
  container.appendChild(clearButton);

  setHasValue(Boolean(input.value));

  // Events
  input.addEventListener('input', event => {
    setHasValue(Boolean(input.value));
    if (typeof onInput === 'function') {
      onInput(event, input.value);
    }
  });

  if (typeof onSubmit === 'function') {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        onSubmit(event, input.value);
      }
    });
  }

  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!input.value) return;
      input.value = '';
      setHasValue(false);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      event.preventDefault();
    }
  });

  clearButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!input.value) return;
    input.value = '';
    setHasValue(false);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });

  container.addEventListener('click', (event) => {
    if (disabled) return;
    if (event.target.closest('.search-comp__clear')) return;
    input.focus();
  });

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
  searchComp.classList.toggle('search-comp--has-value', Boolean(value));
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
