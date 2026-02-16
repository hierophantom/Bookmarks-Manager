/**
 * Selection Field Component
 * 
 * Design System Component - BMG-101
 * 
 * @example
 * const field = createSelectionField({
 *   label: 'Label',
 *   contrast: 'low',
 *   state: 'idle'
 * });
 */

/**
 * Creates a selection field element
 * @param {Object} options - Field configuration
 * @param {string} [options.label='Label'] - Field label
 * @param {string} [options.selectionText='X tags selected'] - Selection applied label
 * @param {string} [options.state='idle'] - 'idle', 'hover', 'active', 'selection'
 * @param {string} [options.contrast='low'] - 'low' or 'high'
 * @param {HTMLElement} [options.menu] - Optional selection menu element
 * @param {Function} [options.onToggle] - Toggle handler
 * @param {Function} [options.onClear] - Clear selection handler
 * @returns {HTMLDivElement} The selection field element
 */
function createSelectionField(options = {}) {
  const {
    label = 'Label',
    selectionText = 'X tags selected',
    state = 'idle',
    contrast = 'low',
    menu = null,
    onToggle = null,
    onClear = null
  } = options;

  const field = document.createElement('div');
  field.className = `selection-field selection-field--${contrast}`;

  const labelEl = document.createElement('div');
  labelEl.className = 'selection-field__label';
  labelEl.textContent = state === 'selection' ? selectionText : label;

  const iconEl = document.createElement('span');
  iconEl.className = 'selection-field__icon';
  iconEl.innerHTML = state === 'active'
    ? "<svg viewBox='0 0 12 12' aria-hidden='true'><path d='M6 4L2 8h8z'/></svg>"
    : "<svg viewBox='0 0 12 12' aria-hidden='true'><path d='M2 4h8L6 8z'/></svg>";

  let clearButton = null;
  if (typeof onClear === 'function') {
    clearButton = document.createElement('button');
    clearButton.className = 'selection-field__clear';
    clearButton.type = 'button';
    clearButton.setAttribute('aria-label', 'Clear selection');
    clearButton.innerHTML = "<span class='material-symbols-outlined' aria-hidden='true'>close</span>";
    clearButton.addEventListener('click', (event) => {
      event.stopPropagation();
      onClear();
    });
  }

  field.appendChild(labelEl);
  if (clearButton) {
    field.appendChild(clearButton);
  }
  field.appendChild(iconEl);

  applySelectionFieldState(field, state);
  updateSelectionFieldSelectionState(field, state === 'selection');

  if (menu) {
    const menuWrapper = document.createElement('div');
    menuWrapper.className = 'selection-field__menu';
    menuWrapper.appendChild(menu);
    if (state !== 'active') {
      menuWrapper.style.display = 'none';
    }
    field.appendChild(menuWrapper);
  }

  if (typeof onToggle === 'function') {
    field.addEventListener('click', () => onToggle(field));
  }

  return field;
}

/**
 * Applies selection field state classes
 * @param {HTMLDivElement} field - Selection field element
 * @param {string} state - 'idle', 'hover', 'active', 'selection'
 */
function applySelectionFieldState(field, state) {
  field.classList.remove('selection-field--idle', 'selection-field--hover', 'selection-field--active', 'selection-field--selection');
  field.classList.add(`selection-field--${state}`);
}

/**
 * Updates selection field selection state
 * @param {HTMLDivElement} field - Selection field element
 * @param {boolean} hasSelection - Whether selection exists
 */
function updateSelectionFieldSelectionState(field, hasSelection) {
  field.classList.toggle('selection-field--has-selection', hasSelection);
}

/**
 * Updates selection field label
 * @param {HTMLDivElement} field - Selection field element
 * @param {string} label - New label
 */
function updateSelectionFieldLabel(field, label) {
  const labelEl = field.querySelector('.selection-field__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

/**
 * Updates selection field contrast
 * @param {HTMLDivElement} field - Selection field element
 * @param {string} contrast - 'low' or 'high'
 */
function updateSelectionFieldContrast(field, contrast) {
  field.classList.remove('selection-field--low', 'selection-field--high');
  field.classList.add(`selection-field--${contrast}`);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSelectionField,
    applySelectionFieldState,
    updateSelectionFieldSelectionState,
    updateSelectionFieldLabel,
    updateSelectionFieldContrast
  };
}
