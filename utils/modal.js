const Modal = (() => {
  /**
   * BookmarkForm Modal with Shelf chips-field integration
   * @param {Object} defaults - Default values { id, title, url, tags, folderId }
   * @param {Object} options - Options { showFolderSelector: boolean, showTabsSuggestions: boolean }
   */
  async function openBookmarkForm(defaults = {}, options = {}) {
    const tagArr = Array.isArray(defaults.tags) ? defaults.tags : [];
    const showFolderSelector = options.showFolderSelector || false;
    const showTabsSuggestions = options.showTabsSuggestions || false;
    const showTags = options.showTags !== false;
    const allTags = showTags && typeof TagsService !== 'undefined'
      ? await TagsService.getAllTags().catch(() => [])
      : [];

    const fields = [
      {
        id: 'bm_url',
        label: 'URL',
        type: 'url',
        value: defaults.url || '',
        placeholder: 'https://example.com'
      },
      {
        id: 'bm_title',
        label: 'Title',
        type: 'text',
        value: defaults.title || '',
        required: true
      }
    ];

    if (showTags) {
      fields.push({
        id: 'bm_tags',
        label: 'Tags',
        type: 'chips-field',
        value: tagArr,
        placeholder: 'Add tags...',
        options: allTags,
        allowCustom: true,
        helperText: 'Separate tags with commas or pick from the list.'
      });
    }

    // Add folder selector if requested
    if (showFolderSelector) {
      // Fetch folder tree
      const tree = await BookmarksService.getTree();
      const folders = [];
      
      function collectFolders(node, depth = 0) {
        if (!node || node.url) return; // Skip bookmarks
        if (node.id !== '0') { // Skip root
          folders.push({
            value: node.id,
            label: '  '.repeat(depth) + (node.title || '(Untitled)')
          });
        }
        if (node.children) {
          node.children.forEach(child => collectFolders(child, depth + 1));
        }
      }
      
      if (tree[0] && tree[0].children) {
        tree[0].children.forEach(child => collectFolders(child, 0));
      }

      fields.splice(2, 0, {
        id: 'bm_folder',
        label: 'Folder',
        type: 'select',
        value: defaults.folderId || '1',
        required: true,
        options: folders
      });
    }

    if (typeof createModal !== 'function' || typeof showModal !== 'function') {
      console.error('[Modal] openBookmarkForm - design-system modal component not available');
      await openError({
        title: 'Modal unavailable',
        message: 'Bookmark modal component is unavailable. Please reload and try again.'
      });
      return null;
    }

    return new Promise((resolve) => {
      let submitResult = null;

      const cleanup = () => {
        if (typeof cleanupTabsSuggestions === 'function') {
          cleanupTabsSuggestions();
        }
      };

      let cleanupTabsSuggestions = null;

      const modal = createModal({
        type: 'form',
        title: defaults.id ? 'Edit bookmark' : 'Add bookmark',
        fields,
        buttons: [
          { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
          { label: 'Save', type: 'primary', role: 'confirm', shortcut: '↵' }
        ],
        onSubmit: async () => {
          const titleInput = document.getElementById('bm_title');
          const urlInput = document.getElementById('bm_url');
          const folderInput = document.getElementById('bm_folder');
          const tagsInput = document.getElementById('bm_tags');

          const title = (titleInput?.value || '').trim();
          const rawUrl = (urlInput?.value || '').trim();

          clearModalInlineError(modal);

          if (!title) {
            showModalInlineError(modal, titleInput, 'Title is required.');
            return false;
          }

          if (!rawUrl) {
            showModalInlineError(modal, urlInput, 'URL is required.');
            return false;
          }

          // Normalize: prepend https:// if no protocol is present so Chrome accepts it
          const normalizedUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(rawUrl)
            ? rawUrl
            : 'https://' + rawUrl;

          const tags = (tagsInput?.value || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

          submitResult = {
            title,
            url: normalizedUrl,
            tags,
            folderId: folderInput ? folderInput.value : null
          };

          return true;
        },
        onClose: (confirmed) => {
          cleanup();
          if (!confirmed) {
            resolve(null);
            return;
          }
          resolve(submitResult);
        }
      });

      showModal(modal);
      if (showTabsSuggestions && typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.query === 'function') {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            return;
          }
          cleanupTabsSuggestions = setupTabsSuggestions(Array.isArray(tabs) ? tabs : []);
        });
      }
    });
  }

  // Show an inline error message inside an already-open modal
  function showModalInlineError(modalOverlay, fieldInput, message) {
    const modalEl = modalOverlay.querySelector('.modal');
    if (!modalEl) return;

    // Remove any previous error
    clearModalInlineError(modalOverlay);

    const banner = document.createElement('div');
    banner.className = 'modal__inline-error';
    banner.setAttribute('role', 'alert');
    banner.textContent = message;

    // Insert before the actions bar so it sits at the bottom of the form
    const actions = modalEl.querySelector('.modal__actions');
    if (actions) {
      modalEl.insertBefore(banner, actions);
    } else {
      modalEl.appendChild(banner);
    }

    // Highlight the offending field
    if (fieldInput) {
      fieldInput.closest('.modal__text-field')?.classList.add('modal__text-field--error');
      fieldInput.classList.add('modal__text-field-input--error');
      fieldInput.focus();
      // Clear highlight as soon as the user edits the field
      const clearOnInput = () => {
        fieldInput.closest('.modal__text-field')?.classList.remove('modal__text-field--error');
        fieldInput.classList.remove('modal__text-field-input--error');
        clearModalInlineError(modalOverlay);
        fieldInput.removeEventListener('input', clearOnInput);
      };
      fieldInput.addEventListener('input', clearOnInput);
    }
  }

  function clearModalInlineError(modalOverlay) {
    const existing = modalOverlay.querySelector('.modal__inline-error');
    if (existing) existing.remove();
    const highlightedFields = modalOverlay.querySelectorAll('.modal__text-field--error');
    highlightedFields.forEach((el) => el.classList.remove('modal__text-field--error'));
    const highlighted = modalOverlay.querySelectorAll('.modal__text-field-input--error');
    highlighted.forEach((el) => el.classList.remove('modal__text-field-input--error'));
  }

  // Setup tabs suggestions dropdown
  function setupTabsSuggestions(tabs) {
    const urlInput = document.getElementById('bm_url');
    const titleInput = document.getElementById('bm_title');
    if (!urlInput || !titleInput || !Array.isArray(tabs) || tabs.length === 0) return null;

    const userEdited = {
      url: false,
      title: false
    };

    const markUrlEdited = () => {
      userEdited.url = true;
    };
    const markTitleEdited = () => {
      userEdited.title = true;
    };

    urlInput.addEventListener('input', markUrlEdited);
    titleInput.addEventListener('input', markTitleEdited);

    // Create suggestions dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'bm-tabs-suggestions';
    dropdown.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 320px;
      max-height: 200px;
      overflow-y: auto;
      background: white;
      border: 1px solid #d1d5db;
      border-top: none;
      border-radius: 0 0 0.375rem 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 100000;
      display: none;
    `;

    // Find the URL field wrapper
    const urlField = urlInput.closest('.bm-field, .modal__field');
    if (!urlField) {
      urlInput.removeEventListener('input', markUrlEdited);
      titleInput.removeEventListener('input', markTitleEdited);
      return null;
    }
    
    document.body.appendChild(dropdown);

    function positionDropdown() {
      const rect = urlInput.getBoundingClientRect();
      const desiredTop = rect.bottom;
      const maxHeight = 200;
      const viewportPadding = 8;
      const availableBelow = window.innerHeight - desiredTop - viewportPadding;
      const showAbove = availableBelow < 120 && rect.top > maxHeight;

      dropdown.style.left = `${Math.round(rect.left)}px`;
      dropdown.style.width = `${Math.round(rect.width)}px`;

      if (showAbove) {
        dropdown.style.top = `${Math.round(rect.top - maxHeight)}px`;
        dropdown.style.borderTop = '1px solid #d1d5db';
        dropdown.style.borderBottom = 'none';
        dropdown.style.borderRadius = '0.375rem 0.375rem 0 0';
      } else {
        dropdown.style.top = `${Math.round(desiredTop)}px`;
        dropdown.style.borderTop = 'none';
        dropdown.style.borderBottom = '1px solid #d1d5db';
        dropdown.style.borderRadius = '0 0 0.375rem 0.375rem';
      }
    }

    // Populate dropdown with tabs
    function updateSuggestions(filter = '') {
      dropdown.innerHTML = '';
      const filterLower = filter.toLowerCase();
      const filteredTabs = tabs.filter(tab => 
        (tab.title && tab.title.toLowerCase().includes(filterLower)) ||
        (tab.url && tab.url.toLowerCase().includes(filterLower))
      ).slice(0, 10); // Limit to 10 suggestions

      if (filteredTabs.length === 0) {
        dropdown.style.display = 'none';
        return;
      }

      filteredTabs.forEach(tab => {
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          gap: 8px;
          align-items: center;
        `;
        
        // Create favicon element - use FaviconService for proper handling
        let faviconElement;
        if (typeof FaviconService !== 'undefined' && tab.url) {
          faviconElement = FaviconService.createFaviconElement(tab.url, { size: 16 });
        } else {
          // Fallback if FaviconService not available
          faviconElement = document.createElement('span');
          faviconElement.textContent = '📄';
          faviconElement.style.cssText = 'flex-shrink: 0; width: 16px; height: 16px; font-size: 12px; text-align: center;';
        }
        
        // Create text container
        const textContainer = document.createElement('div');
        textContainer.style.cssText = 'flex: 1; min-width: 0;';
        
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-size: 13px; font-weight: 500; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        titleDiv.textContent = tab.title || tab.url;
        
        const urlDiv = document.createElement('div');
        urlDiv.style.cssText = 'font-size: 11px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        urlDiv.textContent = tab.url;
        
        textContainer.appendChild(titleDiv);
        textContainer.appendChild(urlDiv);
        
        item.appendChild(faviconElement);
        item.appendChild(textContainer);

        item.addEventListener('mouseenter', () => {
          item.style.background = '#f3f4f6';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'white';
        });
        item.addEventListener('click', () => {
          urlInput.value = tab.url;
          if (!titleInput.value || !userEdited.title) {
            titleInput.value = tab.title || tab.url;
          }
          dropdown.style.display = 'none';
          urlInput.focus();
        });

        dropdown.appendChild(item);
      });

      positionDropdown();
      dropdown.style.display = 'block';
    }

    // Show suggestions when URL field is focused
    const onUrlFocus = () => {
      updateSuggestions(urlInput.value);
    };
    urlInput.addEventListener('focus', onUrlFocus);

    // Update suggestions as user types
    const onUrlInput = () => {
      updateSuggestions(urlInput.value);
    };
    urlInput.addEventListener('input', onUrlInput);

    const onWindowResize = () => {
      if (dropdown.style.display === 'block') {
        positionDropdown();
      }
    };
    window.addEventListener('resize', onWindowResize);

    const onDocumentScroll = () => {
      if (dropdown.style.display === 'block') {
        positionDropdown();
      }
    };
    document.addEventListener('scroll', onDocumentScroll, true);

    // Hide suggestions when clicking outside
    const onDocumentClick = (e) => {
      if (!urlField.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    };
    document.addEventListener('click', onDocumentClick);

    // Hide dropdown on Escape
    const onUrlKeydown = (e) => {
      if (e.key === 'Escape' && dropdown.style.display === 'block') {
        e.stopPropagation();
        dropdown.style.display = 'none';
      }
    };
    urlInput.addEventListener('keydown', onUrlKeydown);

    return () => {
      urlInput.removeEventListener('focus', onUrlFocus);
      urlInput.removeEventListener('input', onUrlInput);
      urlInput.removeEventListener('input', markUrlEdited);
      urlInput.removeEventListener('keydown', onUrlKeydown);
      titleInput.removeEventListener('input', markTitleEdited);
      document.removeEventListener('click', onDocumentClick);
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('scroll', onDocumentScroll, true);
      if (dropdown.parentNode) {
        dropdown.parentNode.removeChild(dropdown);
      }
    };
  }

  /**
   * FolderForm Modal with emoji and color customization
   */
  async function openFolderForm(defaults = {}) {
    if (typeof createModal !== 'function' || typeof showModal !== 'function') {
      console.error('[Modal] openFolderForm - design-system modal component not available');
      await openError({
        title: 'Modal unavailable',
        message: 'Folder modal component is unavailable. Please reload and try again.'
      });
      return null;
    }

    return new Promise(async (resolve) => {
      // Get folder customization if editing existing folder
      let customization = null;
      if (defaults.folderId && typeof FolderCustomizationService !== 'undefined') {
        customization = await FolderCustomizationService.get(defaults.folderId);
      }

      const currentEmoji = customization?.emoji || null;
      const currentColor = customization?.color || null;
      let selectedEmoji = currentEmoji;
      let selectedColor = currentColor;

      const modalTitle = defaults.folderId ? 'Edit folder' : 'Add folder';
      const colorOptions = typeof FolderCustomizationService !== 'undefined' && typeof FolderCustomizationService.getColors === 'function'
        ? FolderCustomizationService.getColors()
        : [];

      const content = document.createElement('div');
      content.className = 'folder-form-modal__content';

      const titleField = document.createElement('div');
      titleField.className = 'folder-form-modal__field';

      const titleLabel = document.createElement('label');
      titleLabel.className = 'folder-form-modal__label';
      titleLabel.setAttribute('for', 'folder-title-input');
      titleLabel.textContent = 'Folder name';

      const requiredMark = document.createElement('span');
      requiredMark.className = 'folder-form-modal__required';
      requiredMark.textContent = ' *';
      titleLabel.appendChild(requiredMark);

      const titleFieldControl = typeof createTextField === 'function'
        ? createTextField({
          placeholder: 'Enter folder name',
          value: defaults.title || '',
          contrast: 'low',
          ariaLabel: 'Folder name'
        })
        : document.createElement('div');

      let titleInput = titleFieldControl.querySelector ? titleFieldControl.querySelector('.text-field__input') : null;
      if (!titleInput) {
        titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'folder-form-modal__input';
        titleInput.placeholder = 'Enter folder name';
        titleInput.value = defaults.title || '';
        titleFieldControl.appendChild(titleInput);
      }
      titleFieldControl.classList.add('folder-form-modal__input');
      titleInput.id = 'folder-title-input';
      titleInput.required = true;

      titleField.appendChild(titleLabel);
      titleField.appendChild(titleFieldControl);
      content.appendChild(titleField);

      const emojiField = document.createElement('div');
      emojiField.className = 'folder-form-modal__field';

      const emojiLabel = document.createElement('label');
      emojiLabel.className = 'folder-form-modal__label';
      emojiLabel.setAttribute('for', 'select-emoji-btn');
      emojiLabel.textContent = 'Folder icon (optional)';

      const emojiBtn = document.createElement('button');
      emojiBtn.id = 'select-emoji-btn';
      emojiBtn.type = 'button';
      emojiBtn.className = 'folder-form-modal__emoji-btn';

      const emojiDisplay = document.createElement('span');
      emojiDisplay.id = 'selected-emoji-display';
      emojiDisplay.className = 'folder-form-modal__emoji';
      emojiDisplay.textContent = selectedEmoji || '📁';

      const emojiCopy = document.createElement('span');
      emojiCopy.className = 'folder-form-modal__emoji-copy';
      emojiCopy.textContent = `Click to ${selectedEmoji ? 'change' : 'select'}`;

      emojiBtn.appendChild(emojiDisplay);
      emojiBtn.appendChild(emojiCopy);
      emojiField.appendChild(emojiLabel);
      emojiField.appendChild(emojiBtn);
      content.appendChild(emojiField);

      const colorField = document.createElement('div');
      colorField.className = 'folder-form-modal__field folder-form-modal__field--colors';

      const colorLabel = document.createElement('label');
      colorLabel.className = 'folder-form-modal__label';
      colorLabel.textContent = 'Folder color (optional)';

      const colorGrid = document.createElement('div');
      colorGrid.id = 'color-picker-grid';
      colorGrid.className = 'folder-form-modal__color-grid';

      const clearColorWrap = document.createElement('div');
      clearColorWrap.className = 'folder-form-modal__clear-wrap';

      colorField.appendChild(colorLabel);
      colorField.appendChild(colorGrid);
      colorField.appendChild(clearColorWrap);
      content.appendChild(colorField);

      let modal = null;
      let submitResult = null;

      const renderColorOptions = () => {
        colorGrid.innerHTML = '';

        colorOptions.forEach((color) => {
          const colorBtn = document.createElement('button');
          colorBtn.type = 'button';
          colorBtn.className = 'color-option folder-form-modal__color-option';
          colorBtn.dataset.color = color.value;
          colorBtn.style.background = color.value;
          colorBtn.style.borderColor = selectedColor === color.value
            ? 'var(--theme-text, #1a1a1a)'
            : 'transparent';

          if (selectedColor === color.value) {
            const check = document.createElement('span');
            check.className = 'folder-form-modal__color-check';
            check.textContent = '✓';
            colorBtn.appendChild(check);
          }

          colorBtn.addEventListener('click', () => {
            selectedColor = selectedColor === color.value ? null : color.value;
            renderColorOptions();
            renderClearColorButton();
          });

          colorGrid.appendChild(colorBtn);
        });
      };

      const renderClearColorButton = () => {
        clearColorWrap.innerHTML = '';
        if (!selectedColor) return;

        const clearBtn = typeof createCommonButton === 'function'
          ? createCommonButton({ label: 'Clear color', contrast: 'low' })
          : document.createElement('button');

        if (!clearBtn.classList.contains('button-common')) {
          clearBtn.type = 'button';
          clearBtn.textContent = 'Clear color';
          clearBtn.className = 'button-common button-common--low';
        }

        clearBtn.id = 'clear-color-btn';
        clearBtn.classList.add('folder-form-modal__clear-btn');
        clearBtn.addEventListener('click', () => {
          selectedColor = null;
          renderColorOptions();
          renderClearColorButton();
        });

        clearColorWrap.appendChild(clearBtn);
      };

      renderColorOptions();
      renderClearColorButton();

      // Focus title input
      setTimeout(() => titleInput.focus(), 50);

      // Emoji picker
      emojiBtn.addEventListener('click', async () => {
        if (typeof EmojiPicker === 'undefined') {
          await openError({
            title: 'Picker Unavailable',
            message: 'Emoji picker not available.'
          });
          return;
        }
        const emoji = await EmojiPicker.show(selectedEmoji);
        if (emoji !== null) {
          selectedEmoji = emoji || null;
          emojiDisplay.textContent = selectedEmoji || '📁';
          emojiCopy.textContent = `Click to ${selectedEmoji ? 'change' : 'select'}`;
        }
      });

      modal = createModal({
        type: 'form',
        title: modalTitle,
        content,
        buttons: [
          { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
          { label: 'Save', type: 'primary', role: 'confirm', shortcut: '↵' }
        ],
        onSubmit: () => {
        const title = titleInput.value.trim();
          clearModalInlineError(modal);

        if (!title) {
            showModalInlineError(modal, titleInput, 'Folder name is required.');
            return false;
        }

          submitResult = {
          title,
          customization: (selectedEmoji || selectedColor) ? {
            emoji: selectedEmoji,
            color: selectedColor
          } : null
          };

          return true;
        },
        onClose: (confirmed) => {
          resolve(confirmed ? submitResult : null);
        }
      });

      showModal(modal);
    });
  }

  /**
   * TabsPicker Modal
   */
  function openTabsPicker(tabs = []) {
    return new Promise((resolve) => {
      if (typeof createModal === 'function' && typeof showModal === 'function') {
        const listWrap = document.createElement('div');
        listWrap.className = 'bm-modal-form';

        const selectAllLabel = document.createElement('label');
        selectAllLabel.className = 'bm-select-all-container';
        selectAllLabel.innerHTML = '<input type="checkbox" id="bm_select_all" aria-label="Select all tabs" /> Select all';
        listWrap.appendChild(selectAllLabel);

        const list = document.createElement('div');
        list.id = 'bm_tabs_list';
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', 'Tab selection list');

        tabs.forEach((tab, index) => {
          const row = document.createElement('label');
          row.className = 'save-tabs-modal__tab-row';
          row.innerHTML = `
            <input type="checkbox" class="bm-tab-checkbox" data-index="${index}" aria-label="Select ${escapeHtml(tab.title || tab.url)}" />
            <span class="save-tabs-modal__tab-title" dir="auto">${escapeHtml(tab.title || tab.url)}</span>
          `;
          list.appendChild(row);
        });

        listWrap.appendChild(list);

        let selectedTabs = [];
        const modal = createModal({
          type: 'form',
          title: 'Add Tabs to Folder',
          content: listWrap,
          buttons: [
            { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
            { label: 'Add Selected', type: 'primary', role: 'confirm', shortcut: '↵' }
          ],
          onSubmit: () => {
            selectedTabs = Array.from(list.querySelectorAll('.bm-tab-checkbox'))
              .filter(cb => cb.checked)
              .map(cb => tabs[parseInt(cb.dataset.index, 10)]);
            return true;
          },
          onClose: (confirmed) => {
            resolve(confirmed ? selectedTabs : []);
          }
        });

        showModal(modal);

        const selectAll = listWrap.querySelector('#bm_select_all');
        const checkboxes = listWrap.querySelectorAll('.bm-tab-checkbox');
        selectAll.addEventListener('change', () => {
          checkboxes.forEach((cb) => (cb.checked = selectAll.checked));
        });
        checkboxes.forEach((cb) => {
          cb.addEventListener('change', () => {
            const allChecked = Array.from(checkboxes).every((c) => c.checked);
            selectAll.checked = allChecked;
          });
        });

        return;
      }

      // Create custom modal for tabs picker (special case)
      const overlay = document.createElement('div');
      overlay.id = 'bm-modal-overlay';
      overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'bm-tabs-title');

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve([]);
        }
      });

      const card = document.createElement('div');
      card.className = 'bm-modal-card bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4';

      const listHtml = tabs
        .map(
          (t, i) =>
            `<label class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
              <input type="checkbox" class="bm-tab-checkbox" data-index="${i}" aria-label="Select ${escapeHtml(t.title || t.url)}" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">${escapeHtml(t.title || t.url)}</div>
                <div class="text-xs text-gray-500 truncate">${escapeHtml(t.url)}</div>
              </div>
            </label>`
        )
        .join('');

      card.innerHTML = `
        <h2 id="bm-tabs-title" class="text-xl font-bold text-gray-900 mb-4">Add Tabs to Folder</h2>
        <div class="bm-modal-form" role="group">
          <label class="flex items-center gap-2 p-2 mb-2 bg-gray-50 rounded font-medium">
            <input type="checkbox" id="bm_select_all" aria-label="Select all tabs" />
            Select all
          </label>
          <div id="bm_tabs_list" class="max-h-64 overflow-y-auto border border-gray-300 rounded mb-4" role="listbox" aria-label="Tab selection list">
            ${listHtml}
          </div>
          <div class="flex gap-3">
            <button id="bm_tabs_cancel" type="button" aria-label="Cancel and close dialog" class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors">
              Cancel
            </button>
            <button id="bm_tabs_add" type="button" aria-label="Add selected tabs to folder" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium transition-colors">
              Add Selected
            </button>
          </div>
        </div>
      `;

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      const selectAll = card.querySelector('#bm_select_all');
      const checkboxes = card.querySelectorAll('.bm-tab-checkbox');

      // Handle submit action
      const handleSubmit = () => {
        const selected = [];
        checkboxes.forEach((cb) => {
          if (cb.checked) {
            selected.push(tabs[parseInt(cb.dataset.index, 10)]);
          }
        });
        overlay.remove();
        resolve(selected);
      };

      selectAll.addEventListener('change', () => {
        checkboxes.forEach((cb) => (cb.checked = selectAll.checked));
      });

      // Update select-all when individual checkboxes change
      checkboxes.forEach((cb) => {
        cb.addEventListener('change', () => {
          const allChecked = Array.from(checkboxes).every((c) => c.checked);
          selectAll.checked = allChecked;
        });
      });

      card.querySelector('#bm_tabs_cancel').addEventListener('click', () => {
        overlay.remove();
        resolve([]);
      });

      card.querySelector('#bm_tabs_add').addEventListener('click', () => {
        handleSubmit();
      });

      // Keyboard accessibility
      document.addEventListener('keydown', (e) => {
        // Only handle if overlay is visible
        if (!document.body.contains(overlay)) return;

        // Escape to close
        if (e.key === 'Escape') {
          e.preventDefault();
          overlay.remove();
          resolve([]);
        }
      }, true);
    });
  }

  /**
   * WidgetPicker Modal
   */
  function openWidgetPicker(defaults = {}) {
    return new Promise((resolve) => {
      if (typeof createModal === 'function' && typeof showModal === 'function') {
        const widgets = [
          { id: 'search-bar-widget', title: 'Search', subtitle: 'Web + bookmarks', icon: 'search' },
          { id: 'clock', title: 'Clock', subtitle: 'Time', icon: 'schedule' },
          { id: 'quicklinks', title: 'Quick Links', subtitle: 'Shortcuts', icon: 'bolt' },
          { id: 'notes', title: 'Notes', subtitle: 'Scratchpad', icon: 'sticky_note_2' }
        ];

        let selectedWidget = widgets.find((widget) => widget.id === defaults.id) || null;
        const list = document.createElement('div');
        list.className = 'bm-widget-list';

        widgets.forEach((widget) => {
          const optionBtn = document.createElement('button');
          optionBtn.type = 'button';
          optionBtn.className = 'bm-widget-item-btn';

          const preview = typeof createWidgetSmall === 'function'
            ? createWidgetSmall({
              type: 'widget',
              state: 'idle',
              label: widget.title,
              subtext: widget.subtitle,
              icon: widget.icon
            })
            : null;

          if (preview) {
            optionBtn.appendChild(preview);
          } else {
            optionBtn.textContent = widget.title;
          }

          optionBtn.setAttribute('aria-label', `Select ${widget.title} widget`);
          optionBtn.setAttribute('aria-pressed', selectedWidget?.id === widget.id ? 'true' : 'false');
          optionBtn.addEventListener('click', () => {
            selectedWidget = widget;
            list.querySelectorAll('.bm-widget-item-btn').forEach((btn) => {
              btn.classList.remove('bm-widget-item-btn--selected');
              btn.setAttribute('aria-pressed', 'false');
            });
            optionBtn.classList.add('bm-widget-item-btn--selected');
            optionBtn.setAttribute('aria-pressed', 'true');
          });

          if (selectedWidget?.id === widget.id) {
            optionBtn.classList.add('bm-widget-item-btn--selected');
          }

          list.appendChild(optionBtn);
        });

        const modal = createModal({
          type: 'form',
          title: 'Add widget',
          content: list,
          buttons: [
            { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
            { label: 'Add', type: 'primary', role: 'confirm', shortcut: '↵' }
          ],
          onSubmit: async () => {
            if (!selectedWidget) {
              await openError({
                title: 'No Widget Selected',
                message: 'Please select a widget.'
              });
              return false;
            }
            return true;
          },
          onClose: (confirmed) => {
            resolve(confirmed ? selectedWidget : null);
          }
        });

        showModal(modal);
        return;
      }

      const overlay = document.createElement('div');
      overlay.id = 'bm-modal-overlay';
      overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'bm-widget-title');

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });

      const card = document.createElement('div');
      card.className = 'bm-modal-card bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4';

      const widgets = [
        { id: 'search-bar-widget', title: 'Search', icon: '🔎' },
        { id: 'clock', title: 'Clock', icon: '🕐' },
        { id: 'quicklinks', title: 'Quick Links', icon: '⚡' },
        { id: 'notes', title: 'Notes', icon: '📝' }
      ];

      const widgetsHtml = widgets
        .map(
          (w, i) =>
            `<button class="bm-widget-item w-full p-3 mb-2 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-md transition-colors" data-widget-id="${w.id}" aria-label="${w.title} widget (Press ${i + 1} to select)">
              <div class="text-lg">${w.icon}</div>
              <div class="font-medium text-gray-900">${w.title}</div>
            </button>`
        )
        .join('');

      card.innerHTML = `
        <h2 id="bm-widget-title" class="text-xl font-bold text-gray-900 mb-4">Add widget</h2>
        <div class="bm-widget-list mb-4" role="group" aria-label="Widget options">
          ${widgetsHtml}
        </div>
        <button id="bm_widget_cancel" type="button" aria-label="Cancel and close dialog" class="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors">
          Cancel
        </button>
      `;

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // Attach click handlers to widget buttons
      card.querySelectorAll('.bm-widget-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const widgetId = btn.dataset.widgetId;
          const widget = widgets.find((w) => w.id === widgetId);
          overlay.remove();
          resolve(widget);
        });
      });

      card.querySelector('#bm_widget_cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });

      // Keyboard accessibility
      document.addEventListener('keydown', (e) => {
        // Only handle if overlay is visible
        if (!document.body.contains(overlay)) return;

        // Escape to close
        if (e.key === 'Escape') {
          e.preventDefault();
          overlay.remove();
          resolve(null);
        }

        // Number keys 1-3 to select widgets
        if (['1', '2', '3'].includes(e.key)) {
          e.preventDefault();
          const index = parseInt(e.key, 10) - 1;
          if (index < widgets.length) {
            const widget = widgets[index];
            overlay.remove();
            resolve(widget);
          }
        }
      }, true);
    });
  }

  /**
   * Utility: Escape HTML
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Simple confirmation modal
   */
  function openConfirmation(options = {}) {
    const { 
      title = 'Confirm', 
      message = 'Are you sure?', 
      confirmText = 'Confirm', 
      cancelText = 'Cancel',
      destructive = false
    } = options;

    // Escape HTML to prevent XSS
    const escapeHtml = (str) => String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    if (typeof createModal === 'function' && typeof showModal === 'function') {
      return new Promise((resolve) => {
        const messageEl = document.createElement('p');
        messageEl.className = 'modal__subtitle';
        messageEl.style.whiteSpace = 'normal';
        messageEl.textContent = message;

        const modal = createModal({
          type: 'dialog',
          title,
          content: messageEl,
          buttons: [
            { label: cancelText, type: 'common', role: 'cancel', shortcut: 'ESC' },
            { label: confirmText, type: destructive ? 'destructive' : 'primary', role: 'confirm', shortcut: '↵' }
          ],
          onClose: (confirmed) => resolve(Boolean(confirmed))
        });

        showModal(modal);
      });
    }

    const modal = new BaseModal({
      title,
      customContent: `<p style="margin: 1rem 0; line-height: 1.5; color: var(--theme-text, #1a1a1a); word-break: break-word;">${escapeHtml(message)}</p>`,
      confirmText,
      cancelText,
      confirmVariant: destructive ? 'destructive' : 'primary'
    });

    return modal.show().then(data => data !== null);
  }

  /**
   * Error modal - shows critical errors that need acknowledgment
   */
  function openError(options = {}) {
    const { 
      title = 'Error', 
      message = 'An error occurred', 
      buttonText = 'OK' 
    } = options;

    // Escape HTML to prevent XSS
    const escapeHtml = (str) => String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const modal = new BaseModal({
      title: title,
      customContent: `
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 1rem 0;
          padding: 12px;
          background: var(--role-destructive-05, rgba(222, 48, 51, 0.2));
          border: 1px solid var(--role-destructive-15, rgba(222, 48, 51, 0.6));
          border-radius: var(--radius-medium, 8px);
        ">
          <span class="material-symbols-outlined" style="
            color: var(--role-destructive-25, #DE3033);
            font-size: 24px;
            flex-shrink: 0;
          ">error</span>
          <p style="
            margin: 0;
            line-height: 1.5;
            color: var(--theme-text, #1a1a1a);
            word-break: break-word;
          ">${escapeHtml(message)}</p>
        </div>
      `,
      confirmText: buttonText,
      cancelText: null // Hide cancel button
    });

    return modal.show();
  }

  /**
   * Notice modal - non-destructive message with acknowledgement button
   */
  function openNotice(options = {}) {
    const {
      title = 'Notice',
      message = '',
      buttonText = 'OK'
    } = options;

    const escapeHtml = (str) => String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const modal = new BaseModal({
      title,
      customContent: `<p style="margin: 1rem 0; line-height: 1.5; color: var(--theme-text, #1a1a1a); word-break: break-word;">${escapeHtml(message)}</p>`,
      confirmText: buttonText,
      cancelText: null
    });

    return modal.show();
  }

  /**
   * Prompt modal - collect a single text value
   */
  async function openPrompt(options = {}) {
    const {
      title = 'Enter Value',
      label = 'Value',
      message = '',
      placeholder = '',
      defaultValue = '',
      confirmText = 'Save',
      cancelText = 'Cancel',
      validator = null
    } = options;

    const escapeHtml = (str) => String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const messageHtml = message
      ? `<p style="margin: 0 0 0.75rem 0; line-height: 1.5; color: var(--theme-text, #1a1a1a);">${escapeHtml(message)}</p>`
      : '';

    const modal = new BaseModal({
      title,
      customContent: messageHtml,
      fields: [
        {
          id: 'modal_prompt_value',
          label,
          type: 'text',
          value: defaultValue,
          placeholder,
          required: true
        }
      ],
      confirmText,
      cancelText
    });

    while (true) {
      const data = await modal.show();
      if (!data) return null;

      const value = (data.modal_prompt_value || '').trim();
      if (typeof validator === 'function') {
        const validationResult = validator(value);
        if (validationResult !== true) {
          await openError({
            title: 'Invalid Value',
            message: typeof validationResult === 'string' ? validationResult : 'Please enter a valid value.'
          });
          continue;
        }
      }

      return value;
    }
  }

  return { 
    openBookmarkForm, 
    openFolderForm, 
    openTabsPicker, 
    openWidgetPicker, 
    openConfirmation,
    openError,
    openNotice,
    openPrompt
  };
})();
