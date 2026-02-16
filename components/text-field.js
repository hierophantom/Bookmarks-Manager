/**
 * Text Field Component
 * 
 * Design System Component - BMG-100
 * 
 * Text input field with low/high contrast variants
 * 
 * @example
 * const field = createTextField({
 *   placeholder: 'Enter name',
 *   contrast: 'low'
 * });
 */

/**
 * Creates a text field element
 * @param {Object} options - Text field configuration
 * @param {string} [options.placeholder=''] - Input placeholder
 * @param {string} [options.value=''] - Initial input value
 * @param {string} [options.type='text'] - Input type
 * @param {string} [options.contrast='low'] - Contrast mode: 'low' or 'high'
 * @param {boolean} [options.disabled=false] - Whether input is disabled
 * @param {Function} [options.onInput] - Input event handler
 * @param {Function} [options.onSubmit] - Submit handler (Enter key)
 * @param {string} [options.ariaLabel='Text field'] - Accessibility label
 * @returns {HTMLDivElement} The text field element
 */
function createTextField(options = {}) {
  const {
    placeholder = '',
    value = '',
    type = 'text',
    contrast = 'low',
    disabled = false,
    onInput = null,
    onSubmit = null,
    ariaLabel = 'Text field'
  } = options;

  const container = document.createElement('div');
  container.className = `text-field text-field--${contrast}`;

  const input = document.createElement('input');
  input.className = 'text-field__input';
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;
  input.setAttribute('aria-label', ariaLabel);

  // Clear button
  const clearButton = document.createElement('button');
  clearButton.className = 'text-field__clear';
  clearButton.type = 'button';
  clearButton.setAttribute('aria-label', 'Clear input');
  clearButton.innerHTML = "<span class='material-symbols-outlined' aria-hidden='true'>close</span>";

  const setHasValue = (hasValue) => {
    container.classList.toggle('text-field--has-value', hasValue);
  };

  if (disabled) {
    input.disabled = true;
    container.classList.add('text-field--disabled');
  }

  container.appendChild(input);
  container.appendChild(clearButton);

  setHasValue(Boolean(input.value));

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

  clearButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!input.value) return;
    input.value = '';
    setHasValue(false);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });

  return container;
}

/**
 * Updates text field value
 * @param {HTMLDivElement} textField - The text field element
 * @param {string} value - New value
 */
function updateTextFieldValue(textField, value) {
  const input = textField.querySelector('.text-field__input');
  if (input) {
    input.value = value;
  }
  textField.classList.toggle('text-field--has-value', Boolean(value));
}

/**
 * Updates text field placeholder
 * @param {HTMLDivElement} textField - The text field element
 * @param {string} placeholder - New placeholder text
 */
function updateTextFieldPlaceholder(textField, placeholder) {
  const input = textField.querySelector('.text-field__input');
  if (input) {
    input.placeholder = placeholder;
  }
}

/**
 * Toggles text field disabled state
 * @param {HTMLDivElement} textField - The text field element
 * @param {boolean} disabled - Whether to disable the input
 */
function toggleTextFieldDisabled(textField, disabled) {
  const input = textField.querySelector('.text-field__input');
  if (input) {
    input.disabled = disabled;
  }
  textField.classList.toggle('text-field--disabled', disabled);
}

/**
 * Updates text field contrast mode
 * @param {HTMLDivElement} textField - The text field element
 * @param {string} contrast - 'low' or 'high'
 */
function updateTextFieldContrast(textField, contrast) {
  textField.classList.remove('text-field--low', 'text-field--high');
  textField.classList.add(`text-field--${contrast}`);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTextField,
    updateTextFieldValue,
    updateTextFieldPlaceholder,
    toggleTextFieldDisabled,
    updateTextFieldContrast
  };
}
