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
function createModal(options = {}) {
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
  overlay.className = 'modal-overlay modal-overlay--entering';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title');

  const modal = document.createElement('div');
  modal.className = `modal modal--${type} modal--entering`;

  const contentSection = document.createElement('div');
  contentSection.className = 'modal__content';

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.id = 'modal-title';
    titleEl.className = 'modal__title';
    titleEl.textContent = title;
    contentSection.appendChild(titleEl);
  }

  if (subtitle) {
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'modal__subtitle';
    subtitleEl.textContent = subtitle;
    contentSection.appendChild(subtitleEl);
  }

  const body = document.createElement('div');
  body.className = 'modal__body';

  if (content) {
    if (typeof content === 'string') {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'modal__form';
      contentDiv.innerHTML = content;
      body.appendChild(contentDiv);
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }
  }

  if (Array.isArray(fields) && fields.length > 0) {
    const fieldsWrap = document.createElement('div');
    fieldsWrap.className = 'modal__fields';

    fields.forEach((field) => {
      const fieldEl = createModalField(field);
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
    actionsSection.className = 'modal__actions';

    buttons.forEach((btn, index) => {
      const button = createModalActionButton(btn, index);

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
    overlay.classList.add('modal-overlay--exiting');
    modal.classList.add('modal--exiting');

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

function createModalField(field = {}) {
  const {
    id = '',
    label = '',
    type = 'text',
    placeholder = '',
    value = '',
    required = false,
    contrast = 'low',
    options = []
  } = field;

  if (!id) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'modal__field';

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'modal__field-label';
    labelEl.setAttribute('for', id);
    labelEl.textContent = required ? `${label} *` : label;
    wrapper.appendChild(labelEl);
  }

  if (['text', 'url', 'email', 'password', 'search'].includes(type) && typeof createTextField === 'function') {
    const textField = createTextField({
      placeholder,
      value,
      type,
      contrast,
      ariaLabel: label || id
    });

    const input = textField.querySelector('.text-field__input');
    if (input) {
      input.id = id;
      input.dataset.modalField = id;
      if (required) input.required = true;
    }

    wrapper.appendChild(textField);
    return wrapper;
  }

  if (type === 'select') {
    if (typeof createSelectionField === 'function' && typeof createSelectionMenu === 'function') {
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

      const closeMenu = () => {
        if (!fieldEl || !menuEl) return;
        menuEl.style.display = 'none';
        applySelectionFieldState(fieldEl, hiddenInput.value ? 'selection' : 'idle');
      };

      const openMenu = () => {
        if (!fieldEl || !menuEl) return;
        menuEl.style.display = 'block';
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

      fieldEl = createSelectionField({
        label: activeOption.label || label,
        contrast,
        state: hiddenInput.value ? 'selection' : 'idle',
        menu: menuEl,
        onToggle: () => {
          if (!menuEl) return;
          if (menuEl.style.display === 'block') {
            closeMenu();
          } else {
            openMenu();
          }
        }
      });

      fieldEl.classList.add('modal__selection-field');
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
      return wrapper;
    }

    const select = document.createElement('select');
    select.className = 'modal__native-input';
    select.id = id;
    select.dataset.modalField = id;
    if (required) select.required = true;

    (options || []).forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (String(opt.value) === String(value)) option.selected = true;
      select.appendChild(option);
    });

    wrapper.appendChild(select);
    return wrapper;
  }

  const input = document.createElement('input');
  input.className = 'modal__native-input';
  input.type = type;
  input.id = id;
  input.value = value;
  input.placeholder = placeholder;
  input.dataset.modalField = id;
  if (required) input.required = true;

  wrapper.appendChild(input);
  return wrapper;
}

function createModalActionButton(btn = {}, index = 0) {
  const type = btn.type || (index === 0 ? 'common' : 'primary');
  const label = btn.label || 'Button';
  const disabled = Boolean(btn.disabled);
  const shortcutKeys = normalizeShortcutKeys(btn.shortcut);

  if (type === 'primary' && typeof createPrimaryButton === 'function') {
    const button = createPrimaryButton({
      label,
      contrast: 'high',
      shortcutKeys,
      shortcutText: true,
      disabled
    });
    button.classList.add('modal__action-btn', 'modal__action-btn--primary');
    return button;
  }

  if (typeof createCommonButton === 'function') {
    const button = createCommonButton({
      label,
      contrast: 'low',
      shortcutKeys,
      shortcutText: true,
      disabled
    });
    button.classList.add('modal__action-btn', 'modal__action-btn--common');
    return button;
  }

  const fallback = document.createElement('button');
  fallback.type = 'button';
  fallback.className = `modal__button modal__button--${type}`;
  fallback.textContent = label;
  fallback.disabled = disabled;
  return fallback;
}

function normalizeShortcutKeys(shortcut) {
  if (!shortcut) return null;
  const normalized = String(shortcut).trim();
  if (!normalized) return null;

  if (normalized === 'ESC' || normalized.toLowerCase() === 'esc') {
    return ['Esc'];
  }

  if (normalized === '↵' || normalized.toLowerCase() === 'enter' || normalized.toLowerCase() === 'return') {
    return ['↵'];
  }

  return [normalized];
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
    const firstInput = modal.querySelector('.text-field__input, input, textarea, select, button');
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
    const modal = createModal({
      type: 'dialog',
      title: options.title || 'Confirm',
      subtitle: options.subtitle || '',
      buttons: [
        {
          label: options.cancelLabel || 'Cancel',
          type: 'common',
          shortcut: 'ESC',
          role: 'cancel'
        },
        {
          label: options.confirmLabel || 'Confirm',
          type: 'primary',
          shortcut: '↵',
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
    createModal,
    showModal,
    confirmDialog
  };
}
