/**
 * Keyboard Shortcut Hint Component
 * 
 * Design System Component - BMG-92
 * 
 * @example
 * // Create hint with symbols
 * const hint = createKeyboardHint(['⌘', 'K']);
 * 
 * @example
 * // Create hint with text
 * const hint = createKeyboardHint(['Ctrl', 'Shift', 'P'], true);
 */

/**
 * Creates a keyboard shortcut hint element
 * @param {Array<string>} keys - Array of key symbols or text
 * @param {boolean} [useText=false] - Whether to display as text instead of icons
 * @param {string} [size='default'] - Size variant: 'small', 'default', 'large'
 * @returns {HTMLDivElement} The keyboard hint element
 */
function createKeyboardHint(keys = [], useText = false, size = 'default') {
  if (!keys || keys.length === 0) {
    console.error('Keyboard hint requires at least one key');
    return null;
  }

  // Create container
  const container = document.createElement('div');
  container.className = 'kbd-hint';
  container.setAttribute('aria-label', `Keyboard shortcut: ${keys.join(' ')}`);
  container.setAttribute('role', 'img');
  
  if (size !== 'default') {
    container.classList.add(`kbd-hint--${size}`);
  }

  // Add keys
  keys.forEach((key, index) => {
    if (useText) {
      // Text representation
      const keyEl = document.createElement('span');
      keyEl.className = 'kbd-hint__text';
      keyEl.textContent = key;
      container.appendChild(keyEl);
      
      // Add separator between keys (except last)
      if (index < keys.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'kbd-hint__text';
        sep.textContent = '+';
        sep.style.opacity = '0.5';
        sep.style.margin = '0 2px';
        container.appendChild(sep);
      }
    } else {
      // Icon/symbol representation
      const keyEl = document.createElement('span');
      keyEl.className = 'kbd-hint__key';
      keyEl.textContent = key;
      keyEl.setAttribute('aria-hidden', 'true');
      container.appendChild(keyEl);
    }
  });

  return container;
}

/**
 * Updates keyboard hint keys
 * @param {HTMLDivElement} hint - The keyboard hint element
 * @param {Array<string>} keys - New array of keys
 * @param {boolean} [useText=false] - Whether to display as text
 */
function updateKeyboardHint(hint, keys, useText = false) {
  hint.innerHTML = '';
  hint.setAttribute('aria-label', `Keyboard shortcut: ${keys.join(' ')}`);
  
  keys.forEach((key, index) => {
    if (useText) {
      const keyEl = document.createElement('span');
      keyEl.className = 'kbd-hint__text';
      keyEl.textContent = key;
      hint.appendChild(keyEl);
      
      if (index < keys.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'kbd-hint__text';
        sep.textContent = '+';
        sep.style.opacity = '0.5';
        sep.style.margin = '0 2px';
        hint.appendChild(sep);
      }
    } else {
      const keyEl = document.createElement('span');
      keyEl.className = 'kbd-hint__key';
      keyEl.textContent = key;
      keyEl.setAttribute('aria-hidden', 'true');
      hint.appendChild(keyEl);
    }
  });
}

/**
 * Common keyboard shortcut presets
 */
const KEYBOARD_SHORTCUTS = {
  // macOS
  CMD_K: ['⌘', 'K'],
  CMD_S: ['⌘', 'S'],
  CMD_E: ['⌘', 'E'],
  CMD_SHIFT_P: ['⌘', '⇧', 'P'],
  CMD_OPTION_I: ['⌘', '⌥', 'I'],
  
  // Windows/Linux
  CTRL_K: ['Ctrl', 'K'],
  CTRL_S: ['Ctrl', 'S'],
  CTRL_E: ['Ctrl', 'E'],
  CTRL_SHIFT_P: ['Ctrl', 'Shift', 'P'],
  
  // Universal
  SLASH: ['/'],
  ESCAPE: ['Esc'],
  ENTER: ['↵'],
  TAB: ['Tab']
};

/**
 * Creates a keyboard hint from a preset
 * @param {string} preset - Preset name from KEYBOARD_SHORTCUTS
 * @param {boolean} [useText=false] - Whether to display as text
 * @returns {HTMLDivElement} The keyboard hint element
 */
function createKeyboardHintPreset(preset, useText = false) {
  const keys = KEYBOARD_SHORTCUTS[preset];
  if (!keys) {
    console.error(`Unknown preset: ${preset}`);
    return null;
  }
  return createKeyboardHint(keys, useText);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createKeyboardHint,
    updateKeyboardHint,
    createKeyboardHintPreset,
    KEYBOARD_SHORTCUTS
  };
}
