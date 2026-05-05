/**
 * EditTabGroupModal
 * Shelf-style dialog for renaming a tab group and changing its color.
 * Uses createModal + showModal — same pattern as openFolderForm / openBookmarkForm.
 */
const EditTabGroupModal = (() => {
  const TAB_GROUP_COLORS = [
    { value: 'grey', hex: '#9AA0A6', label: 'Grey' },
    { value: 'blue', hex: '#1A73E8', label: 'Blue' },
    { value: 'red', hex: '#EA4335', label: 'Red' },
    { value: 'yellow', hex: '#F9AB00', label: 'Yellow' },
    { value: 'green', hex: '#34A853', label: 'Green' },
    { value: 'pink', hex: '#E52592', label: 'Pink' },
    { value: 'purple', hex: '#A142F4', label: 'Purple' },
    { value: 'cyan', hex: '#00ACC1', label: 'Cyan' },
    { value: 'orange', hex: '#FB8C00', label: 'Orange' }
  ];

  function getColorByValue(value) {
    return TAB_GROUP_COLORS.find((color) => color.value === value) || TAB_GROUP_COLORS[1];
  }

  /**
   * @param {{ id: number, title: string, colorName: string }} group
   * @param {'name'|'color'} [focusField='name']
   * @returns {Promise<void>} Resolves when modal closes.
   */
  function show(group, focusField = 'name') {
    if (typeof createModal !== 'function' || typeof showModal !== 'function') {
      if (typeof Modal !== 'undefined' && typeof Modal.openError === 'function') {
        Modal.openError({
          title: 'Edit tab group unavailable',
          message: 'Modal component is unavailable. Please reload and try again.'
        });
      }
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let selectedColorName = group.colorName || 'blue';
      let submitResult = null;
      let modal = null;

      // ── Content ──────────────────────────────────────────────────────────────
      const content = document.createElement('div');
      content.className = 'folder-form-modal__content';

      // Name field
      const nameField = document.createElement('div');
      nameField.className = 'folder-form-modal__field';

      const nameLabel = document.createElement('label');
      nameLabel.className = 'folder-form-modal__label';
      nameLabel.setAttribute('for', 'edit-tab-group-name-input');
      nameLabel.textContent = 'Group name';

      const nameFieldControl = typeof createTextField === 'function'
        ? createTextField({
          placeholder: 'Unnamed',
          value: group.title || '',
          contrast: 'low',
          ariaLabel: 'Group name'
        })
        : document.createElement('div');

      let nameInput = nameFieldControl.querySelector ? nameFieldControl.querySelector('.text-field__input') : null;
      if (!nameInput) {
        nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Unnamed';
        nameInput.value = group.title || '';
        nameFieldControl.appendChild(nameInput);
      }
      nameInput.id = 'edit-tab-group-name-input';
      nameFieldControl.classList.add('folder-form-modal__input');

      nameField.appendChild(nameLabel);
      nameField.appendChild(nameFieldControl);
      content.appendChild(nameField);

      // Color field
      const colorField = document.createElement('div');
      colorField.className = 'folder-form-modal__field folder-form-modal__field--colors';

      const colorLabel = document.createElement('label');
      colorLabel.className = 'folder-form-modal__label';
      colorLabel.textContent = 'Group color';
      colorField.appendChild(colorLabel);

      const initialColor = getColorByValue(selectedColorName);

      const colorFieldControl = typeof createSelectionField === 'function'
        ? createSelectionField({
          label: initialColor.label,
          contrast: 'low',
          state: 'selection'
        })
        : document.createElement('button');

      // Inject color swatch into the selection field label area
      function updateColorFieldControl() {
        const currentColor = getColorByValue(selectedColorName);
        if (colorFieldControl.classList.contains('selection-field')) {
          const labelEl = colorFieldControl.querySelector('.selection-field__label');
          if (labelEl) {
            labelEl.innerHTML = '';
            const swatch = document.createElement('span');
            swatch.className = 'edit-tab-group__color-swatch-inline';
            swatch.style.cssText = `
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: ${currentColor.hex};
              margin-right: 6px;
              vertical-align: middle;
              flex-shrink: 0;
            `;
            const text = document.createElement('span');
            text.textContent = currentColor.label;
            labelEl.appendChild(swatch);
            labelEl.appendChild(text);
          }
        }
      }

      updateColorFieldControl();

      // Color dropdown menu
      const colorMenu = document.createElement('div');
      colorMenu.className = 'folder-form-modal__color-menu';
      colorMenu.hidden = true;

      function renderColorMenu() {
        colorMenu.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'folder-form-modal__color-menu-header';
        header.textContent = 'Select color';
        colorMenu.appendChild(header);

        TAB_GROUP_COLORS.forEach((color) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'folder-form-modal__color-row';

          const radio = document.createElement('span');
          radio.className = 'material-symbols-outlined folder-form-modal__color-radio';
          radio.textContent = selectedColorName === color.value ? 'radio_button_checked' : 'radio_button_unchecked';
          row.appendChild(radio);

          const swatch = document.createElement('span');
          swatch.className = 'folder-form-modal__color-swatch';
          swatch.style.background = color.hex;
          row.appendChild(swatch);

          const labelNode = document.createElement('span');
          labelNode.className = 'folder-form-modal__color-text';
          labelNode.textContent = color.label;
          row.appendChild(labelNode);

          row.addEventListener('click', () => {
            selectedColorName = color.value;
            updateColorFieldControl();
            renderColorMenu();
            colorMenu.hidden = true;
          });

          colorMenu.appendChild(row);
        });
      }

      renderColorMenu();

      colorFieldControl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        colorMenu.hidden = !colorMenu.hidden;
        if (!colorMenu.hidden) renderColorMenu();
      });

      const handleDocumentClick = () => { colorMenu.hidden = true; };
      document.addEventListener('click', handleDocumentClick);

      colorField.appendChild(colorFieldControl);
      colorField.appendChild(colorMenu);
      content.appendChild(colorField);

      // ── Modal ─────────────────────────────────────────────────────────────────
      modal = createModal({
        type: 'form',
        title: 'Edit Tab Group',
        content,
        buttons: [
          { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
          { label: 'Save', type: 'primary', role: 'confirm', shortcut: '↵' }
        ],
        onSubmit: async () => {
          const nameValue = nameInput.value.trim();
          submitResult = { title: nameValue, colorName: selectedColorName };
          return true;
        },
        onClose: async (confirmed) => {
          document.removeEventListener('click', handleDocumentClick);
          if (confirmed && submitResult) {
            try {
              await chrome.tabGroups.update(group.id, {
                title: submitResult.title,
                color: submitResult.colorName
              });
            } catch (_error) {
              // Group may no longer exist — close gracefully.
            }
          }
          resolve();
        }
      });

      showModal(modal);

      window.requestAnimationFrame(() => {
        if (focusField === 'color') {
          colorFieldControl.click();
          return;
        }
        nameInput.focus();
        nameInput.select();
      });
    });
  }

  return { show };
})();
