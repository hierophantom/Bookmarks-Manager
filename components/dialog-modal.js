/**
 * Modal Component
 *
 * Design System Component - BMG-93
 */

/**
 * Creates a modal dialog
 * @param {Object} options - Modal configuration
 * @param {string} [options.type='dialog'] - Modal type: 'dialog' or 'form'
 * @param {string} [options.title=''] - Modal title
 * @param {string} [options.subtitle=''] - Optional subtitle
 * @param {HTMLElement|string} [options.content] - Content element or HTML string
 * @param {Array<Object>} [options.fields=[]] - Optional form fields config
 * @param {Array<Object>} [options.buttons=[]] - Button configurations
 * @param {Function} [options.onClose] - Callback when modal closes
 * @param {Function} [options.onSubmit] - Callback when form is submitted
 * @param {boolean} [options.closeOnEscape=true] - Close on ESC key
 * @param {boolean} [options.closeOnBackdrop=true] - Close on backdrop click
 * @returns {HTMLDivElement} The modal overlay element
 */
function createDialogModal(options = {}) {
  const {
    type = 'dialog',
    title = '',
    subtitle = '',
    content = null,
    fields = [],
    buttons = [],
    onClose = null,
    onSubmit = null,
    closeOnEscape = true,
    closeOnBackdrop = true
  } = options;

  const overlay = document.createElement('div');
  overlay.className = 'dialog-modal-overlay dialog-modal-overlay--entering';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'dialog-modal-title');

  const modal = document.createElement('div');
  modal.className = `dialog-modal dialog-modal--${type} dialog-modal--entering`;

  const contentSection = document.createElement('div');
  contentSection.className = 'dialog-modal__content';

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.id = 'dialog-modal-title';
    titleEl.className = 'dialog-modal__title';
    titleEl.textContent = title;
    contentSection.appendChild(titleEl);
  }

  if (subtitle) {
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'dialog-modal__subtitle';
    subtitleEl.textContent = subtitle;
    contentSection.appendChild(subtitleEl);
  }

  const body = document.createElement('div');
  body.className = 'dialog-modal__body';

  if (content) {
    if (typeof content === 'string') {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'dialog-modal__form';
      contentDiv.innerHTML = content;
      body.appendChild(contentDiv);
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }
  }

  if (Array.isArray(fields) && fields.length > 0) {
    const fieldsWrap = document.createElement('div');
    fieldsWrap.className = 'dialog-modal__fields';

    fields.forEach((field) => {
      const fieldEl = createDialogModalField(field);
      if (fieldEl) {
        fieldsWrap.appendChild(fieldEl);
      }
    });

    body.appendChild(fieldsWrap);
  }

  if (body.childNodes.length > 0) {
    contentSection.appendChild(body);
  }

  modal.appendChild(contentSection);

  if (buttons.length > 0) {
    const actionsSection = document.createElement('div');
    actionsSection.className = 'dialog-modal__actions';

    buttons.forEach((btn, index) => {
      const button = createDialogModalActionButton(btn, index);

      button.addEventListener('click', async (event) => {
        if (typeof btn.onClick === 'function') {
          const clickResult = btn.onClick(event);
          if (clickResult instanceof Promise) {
            await clickResult;
          }
        }

        if (shouldTreatAsCancel(btn, index, buttons.length)) {
          closeModal(false);
          return;
        }

        if (typeof onSubmit === 'function') {
          const result = await onSubmit();
          if (result !== false) {
            closeModal(true);
          }
        } else {
          closeModal(true);
        }
      });

      actionsSection.appendChild(button);
    });

    modal.appendChild(actionsSection);
  }

  overlay.appendChild(modal);

  function closeModal(confirmed = false) {
    overlay.classList.add('dialog-modal-overlay--exiting');
    modal.classList.add('dialog-modal--exiting');

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      document.removeEventListener('keydown', handleKeyDown);

      if (typeof onClose === 'function') {
        onClose(confirmed);
      }
    }, 200);
  }

  function handleKeyDown(e) {
    if (closeOnEscape && e.key === 'Escape') {
      e.preventDefault();
      closeModal(false);
      return;
    }

    if (e.key === 'Enter' && type === 'form') {
      const targetTag = e.target && e.target.tagName;
      if (targetTag === 'TEXTAREA') return;
      e.preventDefault();
      if (typeof onSubmit === 'function') {
        Promise.resolve(onSubmit()).then((result) => {
          if (result !== false) closeModal(true);
        });
      } else {
        closeModal(true);
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  overlay.addEventListener('click', (e) => {
    if (closeOnBackdrop && e.target === overlay) {
      closeModal(false);
    }
  });

  return overlay;
}

function createDialogModalField(field = {}) {
  const {
    id = '',
    label = '',
    type = 'text',
    placeholder = '',
    value = '',
    required = false,
    contrast = 'low',
    options = [],
    helperText = ''
  } = field;

  if (!id) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'dialog-modal__field';

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'dialog-modal__field-label';
    labelEl.setAttribute('for', id);
    labelEl.textContent = required ? `${label} *` : label;
    wrapper.appendChild(labelEl);
  }

  if (['text', 'url', 'email', 'password', 'search'].includes(type)) {
    if (typeof createTextInput !== 'function') {
      throw new Error('Design-system text-input component is not available');
    }
    const textField = createTextInput({
      placeholder,
      value,
      type,
      contrast,
      ariaLabel: label || id
    });

    const input = textField.querySelector('.text-input__input');
    if (!input) {
      throw new Error('Design-system text-input input is not available');
    }

    textField.classList.add('dialog-modal__text-input');
    input.id = id;
    input.dataset.modalField = id;
    input.classList.add('dialog-modal__text-input-input');
    if (required) input.required = true;

    wrapper.appendChild(textField);
    return wrapper;
  }

  if (type === 'chip-input') {
    if (typeof createChipInput !== 'function') {
      throw new Error('Design-system chip-input component is not available');
    }

    const normalizedOptions = Array.isArray(options)
      ? options.map((option) => (typeof option === 'string' ? option : option && option.label)).filter(Boolean)
      : [];
    const selectedValues = Array.isArray(value)
      ? value
      : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = id;
    hiddenInput.dataset.modalField = id;
    hiddenInput.value = selectedValues.join(',');

    const fieldEl = createChipInput({
      label,
      contrast,
      selectedValues,
      availableItems: normalizedOptions,
      menuTitle: `Select ${label.toLowerCase()}:`,
      inputPlaceholder: placeholder || label,
      allowCustom: field.allowCustom !== false,
      onChange: (values) => {
        hiddenInput.value = values.join(',');
      }
    });

    fieldEl.classList.add('dialog-modal__chip-input');
    wrapper.appendChild(fieldEl);
    wrapper.appendChild(hiddenInput);

    if (helperText) {
      const helperEl = document.createElement('div');
      helperEl.className = 'dialog-modal__field-helper';
      helperEl.textContent = helperText;
      wrapper.appendChild(helperEl);
    }

    return wrapper;
  }

  if (type === 'select') {
    if (typeof createSelectionInput !== 'function' || typeof createSelectionMenu !== 'function') {
      throw new Error('Design-system selection components are not available');
    }
    const normalizedOptions = Array.isArray(options) ? options : [];
    const selectedIndex = Math.max(0, normalizedOptions.findIndex((opt) => String(opt.value) === String(value)));
    const activeOption = normalizedOptions[selectedIndex] || normalizedOptions[0] || { value: '', label: '' };

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = id;
    hiddenInput.dataset.modalField = id;
    hiddenInput.value = activeOption.value || '';

    const menuItems = normalizedOptions.map((opt) => opt.label);
    let fieldEl = null;
    let menuEl = null;

    const getMenuWrapper = () => fieldEl ? fieldEl.querySelector('.selection-input__menu') : null;

    const closeMenu = () => {
      if (!fieldEl) return;
      const wrapper = getMenuWrapper();
      if (wrapper) wrapper.style.display = 'none';
      applySelectionFieldState(fieldEl, hiddenInput.value ? 'selection' : 'idle');
    };

    const openMenu = () => {
      if (!fieldEl) return;
      const wrapper = getMenuWrapper();
      if (wrapper) wrapper.style.display = 'block';
      applySelectionFieldState(fieldEl, 'active');
    };

    menuEl = createSelectionMenu({
      type: 'sort',
      contrast,
      items: menuItems,
      selectedIndex,
      onSelect: (index) => {
        const selected = normalizedOptions[index];
        if (!selected) return;

        hiddenInput.value = selected.value;
        updateSelectionFieldLabel(fieldEl, selected.label);
        updateSelectionFieldSelectionState(fieldEl, true);
        closeMenu();
      }
    });

    fieldEl = createSelectionInput({
      label: activeOption.label || label,
      selectionText: activeOption.label || label,
      contrast,
      state: hiddenInput.value ? 'selection' : 'idle',
      menu: menuEl,
      onToggle: () => {
        const wrapper = getMenuWrapper();
        if (!wrapper) return;
        if (wrapper.style.display === 'block') {
          closeMenu();
        } else {
          openMenu();
        }
      }
    });

    fieldEl.classList.add('dialog-modal__selection-input');
    fieldEl.dataset.modalSelect = id;

    const outsideHandler = (event) => {
      if (!fieldEl.contains(event.target)) {
        closeMenu();
      }
    };
    document.addEventListener('click', outsideHandler);

    const originalRemove = fieldEl.remove.bind(fieldEl);
    fieldEl.remove = function removeWithCleanup() {
      document.removeEventListener('click', outsideHandler);
      return originalRemove();
    };

    wrapper.appendChild(fieldEl);
    wrapper.appendChild(hiddenInput);

    if (helperText) {
      const helperEl = document.createElement('div');
      helperEl.className = 'dialog-modal__field-helper';
      helperEl.textContent = helperText;
      wrapper.appendChild(helperEl);
    }

    return wrapper;
  }

  throw new Error(`Unsupported dialog-modal field type: ${type}`);
}

function createDialogModalActionButton(btn = {}, index = 0) {
  const requestedRole = btn.role || btn.action || null;
  const inferredType = requestedRole === 'cancel'
    ? 'common'
    : (requestedRole === 'submit' || requestedRole === 'confirm')
      ? 'primary'
      : (index === 0 ? 'common' : 'primary');
  const type = btn.type || inferredType;
  const label = btn.label || getModalActionLabel(requestedRole || (type === 'primary' ? 'submit' : 'cancel'), type);
  const disabled = Boolean(btn.disabled);

  if ((type === 'primary' || type === 'destructive') && typeof createPrimaryButton === 'function') {
    const button = createPrimaryButton({
      label,
      contrast: 'high',
      disabled
    });
    button.classList.add(
      'dialog-modal__action-btn',
      type === 'destructive' ? 'dialog-modal__action-btn--destructive' : 'dialog-modal__action-btn--primary'
    );
    return button;
  }

  if (typeof createCommonButton === 'function') {
    const button = createCommonButton({
      label,
      contrast: 'low',
      disabled
    });
    button.classList.add('dialog-modal__action-btn', 'dialog-modal__action-btn--common');
    return button;
  }

  const fallback = document.createElement('button');
  fallback.type = 'button';
  fallback.className = `dialog-modal__button dialog-modal__button--${type} dialog-modal__action-btn dialog-modal__action-btn--${type}`;
  fallback.disabled = disabled;

  const labelEl = document.createElement('span');
  labelEl.className = 'dialog-modal__button-label';
  labelEl.textContent = label;
  fallback.appendChild(labelEl);

  return fallback;
}

function getModalActionLabel(role, type) {
  if (role === 'cancel') return 'Close';
  if (role === 'submit' || role === 'confirm') return 'Save';
  return type === 'primary' || type === 'destructive' ? 'Save' : 'Close';
}

function shouldTreatAsCancel(btn, index, totalButtons) {
  if (btn && btn.role === 'cancel') return true;
  if (btn && btn.action === 'cancel') return true;
  return totalButtons > 1 && index === 0;
}

/**
 * Shows a modal by appending it to the document body
 * @param {HTMLDivElement} modal - The modal overlay element
 */
function showModal(modal) {
  document.body.appendChild(modal);

  setTimeout(() => {
    const firstInput = modal.querySelector('.text-input__input, input, textarea, select, button');
    if (firstInput) {
      firstInput.focus();
    }
  }, 80);
}

/**
 * Creates and shows a confirmation dialog
 * @param {Object} options - Dialog options
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
function confirmDialog(options = {}) {
  return new Promise((resolve) => {
    const modal = createDialogModal({
      type: 'dialog',
      title: options.title || 'Confirm',
      subtitle: options.subtitle || '',
      buttons: [
        {
          label: options.cancelLabel || 'Close',
          type: 'common',
          role: 'cancel'
        },
        {
          label: options.confirmLabel || 'Save',
          type: 'primary',
          role: 'confirm'
        }
      ],
      onClose: (confirmed) => {
        resolve(confirmed);
      }
    });

    showModal(modal);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createDialogModal,
    showModal,
    confirmDialog
  };
}
