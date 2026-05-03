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
      if (showTabsSuggestions && typeof chrome !== 'undefined') {
        const suggestionSources = {
          tabs: [],
          historyEnabled: Boolean(chrome.history && typeof chrome.history.search === 'function')
        };

        if (chrome.tabs && typeof chrome.tabs.query === 'function') {
          chrome.tabs.query({ currentWindow: true }, (tabs) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              return;
            }

            suggestionSources.tabs = Array.isArray(tabs) ? tabs : [];
            cleanupTabsSuggestions = setupTabsSuggestions(suggestionSources);
          });
        } else {
          cleanupTabsSuggestions = setupTabsSuggestions(suggestionSources);
        }
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

  // Setup URL suggestions dropdown using open tabs and browsing history
  function setupTabsSuggestions(sources = {}) {
    const urlInput = document.getElementById('bm_url');
    const titleInput = document.getElementById('bm_title');
    const tabs = Array.isArray(sources.tabs) ? sources.tabs : [];
    const historyEnabled = Boolean(sources.historyEnabled);
    if (!urlInput || !titleInput || (!tabs.length && !historyEnabled)) return null;

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

    function normalizeSourceUrl(value) {
      return String(value || '').trim().toLowerCase();
    }

    function createSuggestionItem(data) {
      return {
        title: data.title || data.url || 'Untitled',
        url: data.url || '',
        source: data.source || 'tab',
        lastVisitTime: Number(data.lastVisitTime || 0)
      };
    }

    async function getHistorySuggestions(filter) {
      if (!historyEnabled || !chrome.history || typeof chrome.history.search !== 'function') {
        return [];
      }

      try {
        const historyItems = await chrome.history.search({
          text: filter,
          startTime: 0,
          maxResults: 25
        });

        return (Array.isArray(historyItems) ? historyItems : [])
          .filter((item) => item && item.url)
          .map((item) => createSuggestionItem({
            title: item.title || item.url,
            url: item.url,
            source: 'history',
            lastVisitTime: item.lastVisitTime || 0
          }));
      } catch (error) {
        console.warn('Bookmark history suggestions failed:', error);
        return [];
      }
    }

    async function updateSuggestions(filter = '') {
      dropdown.innerHTML = '';
      const filterLower = filter.toLowerCase();
      const filteredTabs = tabs
        .filter((tab) =>
          (tab.title && tab.title.toLowerCase().includes(filterLower)) ||
          (tab.url && tab.url.toLowerCase().includes(filterLower))
        )
        .map((tab) => createSuggestionItem({
          title: tab.title || tab.url,
          url: tab.url,
          source: 'tab'
        }));

      const historySuggestions = await getHistorySuggestions(filter);
      const mergedSuggestions = [];
      const seenUrls = new Set();

      [...filteredTabs, ...historySuggestions].forEach((item) => {
        const normalizedUrl = normalizeSourceUrl(item.url);
        if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
          return;
        }
        seenUrls.add(normalizedUrl);
        mergedSuggestions.push(item);
      });

      const visibleSuggestions = mergedSuggestions.slice(0, 10);

      if (visibleSuggestions.length === 0) {
        dropdown.style.display = 'none';
        return;
      }

      visibleSuggestions.forEach((suggestion) => {
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
        if (typeof FaviconService !== 'undefined' && suggestion.url) {
          faviconElement = FaviconService.createFaviconElement(suggestion.url, { size: 16 });
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
        titleDiv.textContent = suggestion.title || suggestion.url;
        
        const urlDiv = document.createElement('div');
        urlDiv.style.cssText = 'font-size: 11px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        urlDiv.textContent = suggestion.url;

        const metaDiv = document.createElement('div');
        metaDiv.style.cssText = 'font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;';
        metaDiv.textContent = suggestion.source === 'history' ? 'History' : 'Open tab';
        
        textContainer.appendChild(titleDiv);
        textContainer.appendChild(urlDiv);
        textContainer.appendChild(metaDiv);
        
        item.appendChild(faviconElement);
        item.appendChild(textContainer);

        item.addEventListener('mouseenter', () => {
          item.style.background = '#f3f4f6';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'white';
        });
        item.addEventListener('click', () => {
          urlInput.value = suggestion.url;
          if (!titleInput.value || !userEdited.title) {
            titleInput.value = suggestion.title || suggestion.url;
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
      emojiLabel.textContent = 'Folder icon (optional)';
      emojiField.appendChild(emojiLabel);

      const emojiFieldControl = typeof createSelectionField === 'function'
        ? createSelectionField({
          label: selectedEmoji ? `Emoji: ${selectedEmoji}` : 'Select emoji',
          contrast: 'low',
          state: selectedEmoji ? 'selection' : 'idle',
          onClear: () => {
            selectedEmoji = null;
            updateEmojiFieldControl();
          }
        })
        : document.createElement('button');

      if (!emojiFieldControl.classList.contains('selection-field')) {
        emojiFieldControl.className = 'folder-form-modal__selection-fallback';
        emojiFieldControl.textContent = selectedEmoji ? `Emoji: ${selectedEmoji}` : 'Select emoji';
      }

      emojiField.appendChild(emojiFieldControl);

      content.appendChild(emojiField);

      const colorField = document.createElement('div');
      colorField.className = 'folder-form-modal__field folder-form-modal__field--colors';

      const colorLabel = document.createElement('label');
      colorLabel.className = 'folder-form-modal__label';
      colorLabel.textContent = 'Folder color (optional)';

      colorField.appendChild(colorLabel);

      const colorFieldControl = typeof createSelectionField === 'function'
        ? createSelectionField({
          label: selectedColor ? `Color: ${selectedColor}` : 'Color: None',
          contrast: 'low',
          state: selectedColor ? 'selection' : 'idle'
        })
        : document.createElement('button');

      if (!colorFieldControl.classList.contains('selection-field')) {
        colorFieldControl.className = 'folder-form-modal__selection-fallback';
        colorFieldControl.textContent = selectedColor ? `Color: ${selectedColor}` : 'Color: None';
      }

      const colorMenu = document.createElement('div');
      colorMenu.className = 'folder-form-modal__color-menu';
      colorMenu.hidden = true;

      colorField.appendChild(colorFieldControl);
      colorField.appendChild(colorMenu);
      content.appendChild(colorField);

      let modal = null;
      let submitResult = null;

      function updateEmojiFieldControl() {
        const nextLabel = selectedEmoji ? `Emoji: ${selectedEmoji}` : 'Select emoji';
        if (typeof updateSelectionFieldLabel === 'function' && emojiFieldControl.classList.contains('selection-field')) {
          updateSelectionFieldLabel(emojiFieldControl, nextLabel);
        } else {
          emojiFieldControl.textContent = nextLabel;
        }
      }

      function updateColorFieldControl() {
        const selectedOption = colorOptions.find((color) => color.value === selectedColor) || null;
        const nextLabel = selectedOption ? `Color: ${selectedOption.name}` : 'Color: None';

        if (typeof applySelectionFieldState === 'function' && colorFieldControl.classList.contains('selection-field')) {
          applySelectionFieldState(colorFieldControl, selectedOption ? 'selection' : 'idle');
        }

        if (typeof updateSelectionFieldSelectionState === 'function' && colorFieldControl.classList.contains('selection-field')) {
          updateSelectionFieldSelectionState(colorFieldControl, Boolean(selectedOption));
        }

        if (colorFieldControl.classList.contains('selection-field')) {
          const labelEl = colorFieldControl.querySelector('.selection-field__label');
          if (labelEl) {
            labelEl.textContent = '';

            const labelWrap = document.createElement('span');
            labelWrap.className = 'folder-form-modal__selected-color-label';

            if (selectedOption) {
              const swatch = document.createElement('span');
              swatch.className = 'folder-form-modal__selected-color-swatch';
              swatch.style.background = selectedOption.value;
              labelWrap.appendChild(swatch);
            }

            const text = document.createElement('span');
            text.className = 'folder-form-modal__selected-color-text';
            text.textContent = nextLabel;
            labelWrap.appendChild(text);

            labelEl.appendChild(labelWrap);
          }
        } else {
          colorFieldControl.textContent = nextLabel;
        }
      }

      const renderColorMenu = () => {
        colorMenu.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'folder-form-modal__color-menu-header';
        header.textContent = 'Select color';
        colorMenu.appendChild(header);

        const renderOption = (label, value, swatchColor = null) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'folder-form-modal__color-row';

          const radio = document.createElement('span');
          radio.className = 'material-symbols-outlined folder-form-modal__color-radio';
          radio.textContent = selectedColor === value ? 'radio_button_checked' : 'radio_button_unchecked';
          row.appendChild(radio);

          if (swatchColor) {
            const swatch = document.createElement('span');
            swatch.className = 'folder-form-modal__color-swatch';
            swatch.style.background = swatchColor;
            row.appendChild(swatch);
          }

          const labelNode = document.createElement('span');
          labelNode.className = 'folder-form-modal__color-text';
          labelNode.textContent = label;
          row.appendChild(labelNode);

          row.addEventListener('click', () => {
            selectedColor = value;
            updateColorFieldControl();
            renderColorMenu();
            colorMenu.hidden = true;
          });

          colorMenu.appendChild(row);
        };

        renderOption('None', null);
        colorOptions.forEach((color) => {
          renderOption(color.name, color.value, color.value);
        });
      };

      updateEmojiFieldControl();
      updateColorFieldControl();
      renderColorMenu();

      emojiFieldControl.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
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
          updateEmojiFieldControl();
        }
      });

      colorFieldControl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        colorMenu.hidden = !colorMenu.hidden;
      });

      const handleDocumentClick = () => {
        colorMenu.hidden = true;
      };
      document.addEventListener('click', handleDocumentClick);

      // Focus title input
      setTimeout(() => titleInput.focus(), 50);

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
          document.removeEventListener('click', handleDocumentClick);
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
        listWrap.className = 'save-tabs-modal__content';

        const tabsLabel = document.createElement('div');
        tabsLabel.className = 'save-tabs-modal__label';
        tabsLabel.textContent = 'Select tabs to add:';
        listWrap.appendChild(tabsLabel);

        const list = document.createElement('div');
        list.className = 'save-tabs-modal__tabs-list';
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', 'Tab selection list');

        tabs.forEach((tab, index) => {
          const row = document.createElement('label');
          row.className = 'save-tabs-modal__tab-row';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'bm-tab-checkbox save-tabs-modal__checkbox';
          checkbox.dataset.index = String(index);
          checkbox.checked = true;
          checkbox.setAttribute('aria-label', `Select ${tab.title || tab.url}`);
          row.appendChild(checkbox);

          if (typeof FaviconService !== 'undefined' && tab && tab.url) {
            const favicon = FaviconService.createFaviconElement(tab.url, {
              size: 16,
              className: 'tab-favicon save-tabs-modal__favicon',
              alt: 'Favicon'
            });
            row.appendChild(favicon);
          }

          const title = document.createElement('span');
          title.className = 'save-tabs-modal__tab-title';
          title.setAttribute('dir', 'auto');
          title.textContent = tab.title || tab.url;
          row.appendChild(title);

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

        modal.querySelector('.modal')?.classList.add('save-tabs-modal');

        showModal(modal);

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
    return new Promise(async (resolve) => {
      if (typeof WidgetRegistryService === 'undefined' || !WidgetRegistryService) {
        await openError({
          title: 'Widget shop unavailable',
          message: 'The widget registry is missing. Please reload and try again.'
        });
        resolve(null);
        return;
      }

      const categories = WidgetRegistryService.getCategories();
      const defaultWidgetId = defaults.widgetId || defaults.id || null;
      const defaultDefinition = WidgetRegistryService.getDefinition(defaultWidgetId);
      const state = {
        activeCategoryId: defaultDefinition?.categoryId || 'all',
        query: ''
      };

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay modal-overlay--entering widget-shop-shell-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'widget-shop-title');

      const shell = document.createElement('div');
      shell.className = 'theme-settings-shell theme-settings-shell--entering widget-shop-shell';

      const shellHeader = document.createElement('div');
      shellHeader.className = 'widget-shop-modal__shell-header';

      const shellTitle = document.createElement('h2');
      shellTitle.id = 'widget-shop-title';
      shellTitle.className = 'widget-shop-modal__shell-title';
      shellTitle.textContent = 'Widgets store';

      const closeButton = createActionButton({
        icon: createWidgetShopIcon('close'),
        label: 'Close widget store',
        onClick: () => closeOverlay(null)
      });
      closeButton.classList.add('theme-settings-modal__close', 'widget-shop-modal__close');

      shellHeader.append(shellTitle, closeButton);

      const content = document.createElement('div');
      content.className = 'theme-settings-modal__content widget-shop-modal__content';

      const layout = document.createElement('div');
      layout.className = 'theme-settings-modal__layout widget-shop-modal__layout';

      const sidebar = document.createElement('aside');
      sidebar.className = 'theme-settings-modal__sidebar widget-shop-modal__sidebar';

      const sidebarContent = document.createElement('div');
      sidebarContent.className = 'theme-settings-modal__sidebar-content widget-shop-modal__sidebar-content';

      const tabsWrap = document.createElement('div');
      tabsWrap.className = 'widget-shop-modal__tabs';
      sidebarContent.appendChild(tabsWrap);
      sidebar.appendChild(sidebarContent);

      const panel = document.createElement('section');
      panel.className = 'theme-settings-modal__panel widget-shop-modal__panel';

      const panelHeader = document.createElement('div');
      panelHeader.className = 'theme-settings-modal__panel-header widget-shop-modal__panel-header';

      const contentTitle = document.createElement('h3');
      contentTitle.className = 'theme-settings-modal__title widget-shop-modal__content-title';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'theme-settings-modal__title-wrap widget-shop-modal__title-wrap';

      const searchField = createTextField({
        placeholder: 'Search this category',
        value: '',
        contrast: 'high',
        ariaLabel: 'Search widgets in the active category',
        onInput: (_event, value) => {
          state.query = value;
          renderWidgetCatalog();
        }
      });
      searchField.classList.add('widget-shop-modal__search');

      const searchInput = searchField.querySelector('.text-field__input');

      const cardsWrap = document.createElement('div');
  cardsWrap.className = 'theme-settings-modal__panel-body widget-shop-modal__panel-body widget-shop-modal__cards';

  titleWrap.appendChild(contentTitle);
  panelHeader.append(titleWrap, searchField);
  panel.append(panelHeader, cardsWrap);
      layout.append(sidebar, panel);
      content.append(shellHeader, layout);
  shell.appendChild(content);
  overlay.appendChild(shell);

      let closed = false;

      function closeOverlay(result = null) {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', handleKeyDown);
        overlay.classList.add('modal-overlay--exiting');
        shell.classList.add('theme-settings-shell--exiting');

        window.setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 200);
      }

      function handleKeyDown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeOverlay(null);
        }
      }

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          closeOverlay(null);
        }
      });

      document.addEventListener('keydown', handleKeyDown);

      const renderTabs = () => {
        tabsWrap.innerHTML = '';

        const allWidgets = WidgetRegistryService.getCatalogWidgets();
        tabsWrap.appendChild(createTab({
          label: 'All widgets',
          badgeCount: allWidgets.length,
          active: state.activeCategoryId === 'all',
          onClick: () => {
            if (state.activeCategoryId === 'all') return;
            state.activeCategoryId = 'all';
            state.query = '';
            if (searchInput) {
              searchInput.value = '';
            }
            renderWidgetCatalog();
          }
        }));

        categories.forEach((category) => {
          const totalWidgets = WidgetRegistryService.getCatalogWidgets({ categoryId: category.id }).length;
          const tab = createTab({
            label: category.label,
            badgeCount: totalWidgets,
            active: state.activeCategoryId === category.id,
            onClick: () => {
              if (state.activeCategoryId === category.id) return;

              state.activeCategoryId = category.id;
              state.query = '';
              if (searchInput) {
                searchInput.value = '';
              }
              renderWidgetCatalog();
            }
          });

          tabsWrap.appendChild(tab);
        });
      };

      const renderWidgetCatalog = () => {
        const filteredWidgets = WidgetRegistryService.getCatalogWidgets({
          categoryId: state.activeCategoryId === 'all' ? null : state.activeCategoryId,
          query: state.query
        });
        const activeCategory = categories.find((category) => category.id === state.activeCategoryId);

        contentTitle.textContent = activeCategory ? activeCategory.label : 'All widgets';

        cardsWrap.innerHTML = '';

        if (!filteredWidgets.length) {
          const emptyState = document.createElement('div');
          emptyState.className = 'widget-shop-modal__empty-state';

          const emptyMessage = document.createElement('p');
          emptyMessage.className = 'widget-shop-modal__empty-message';
          emptyMessage.textContent = state.query
            ? 'No results found'
            : 'No widgets found';

          emptyState.appendChild(emptyMessage);
          cardsWrap.appendChild(emptyState);
          return;
        }

        filteredWidgets.forEach((definition) => {
          const card = createWidgetShopCard(definition, () => {
            const widgetInstance = WidgetRegistryService.createInstance(definition.id);
            closeOverlay(widgetInstance);
          });
          cardsWrap.appendChild(card);
        });
      };

      renderTabs();
      renderWidgetCatalog();
      document.body.appendChild(overlay);
      window.setTimeout(() => {
        if (searchInput) {
          searchInput.focus();
        }
      }, 50);
    });
  }

  function openWidgetSettings(widgetRecord) {
    return new Promise(async (resolve) => {
      if (typeof createModal !== 'function' || typeof showModal !== 'function') {
        resolve(null);
        return;
      }

      if (typeof WidgetRegistryService === 'undefined' || !WidgetRegistryService) {
        await openError({
          title: 'Widget settings unavailable',
          message: 'The widget registry is missing. Please reload and try again.'
        });
        resolve(null);
        return;
      }

      const normalizedRecord = WidgetRegistryService.normalizeStoredRecord(widgetRecord);
      const definition = WidgetRegistryService.getDefinition(normalizedRecord?.widgetId);

      if (!definition || !WidgetRegistryService.hasSettings(normalizedRecord)) {
        await openNotice({
          title: 'No settings yet',
          message: 'This widget does not have editable settings yet.'
        });
        resolve(null);
        return;
      }

      const state = {
        ...definition.sanitizeSettings(normalizedRecord.settings || {})
      };

      if (definition.id === 'quick-note') {
        const content = document.createElement('div');
        content.className = 'widget-settings-modal__content';

        const stack = document.createElement('div');
        stack.className = 'widget-settings-modal__stack';

        const noteField = createTextField({
          value: state.note || '',
          placeholder: 'Capture your next step',
          contrast: 'low',
          ariaLabel: 'Quick note text',
          onInput: (_event, value) => {
            state.note = value;
          }
        });
        noteField.classList.add('widget-settings-modal__field');
        const noteInput = noteField.querySelector('.text-field__input');

        stack.appendChild(createSettingSection({
          title: 'Note',
          description: 'Keep this short so it stays glanceable on the home page.',
          contrast: 'low',
          content: noteField,
          divided: false
        }));

        content.appendChild(stack);

        let submitResult = null;
        let modal = null;

        modal = createModal({
          type: 'form',
          title: `${definition.name} settings`,
          subtitle: 'This note is saved per widget instance.',
          content,
          buttons: [
            { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
            { label: 'Save', type: 'primary', role: 'confirm', shortcut: '↵' }
          ],
          onSubmit: () => {
            clearModalInlineError(modal);

            submitResult = {
              ...normalizedRecord,
              settings: definition.sanitizeSettings({
                note: (noteInput?.value || state.note || '').trim()
              })
            };
            return true;
          },
          onClose: (confirmed) => {
            resolve(confirmed ? submitResult : null);
          }
        });

        modal.querySelector('.modal')?.classList.add('widget-settings-modal');
        showModal(modal);
        window.setTimeout(() => {
          if (noteInput) {
            noteInput.focus();
            noteInput.select();
          }
        }, 50);
        return;
      }

      const content = document.createElement('div');
      content.className = 'widget-settings-modal__content';

      const stack = document.createElement('div');
      stack.className = 'widget-settings-modal__stack';

      stack.appendChild(createSettingSection({
        title: 'Display',
        description: 'Choose how this clock instance should look.',
        contrast: 'low',
        content: [
          createChoiceGroup({
            type: 'radio',
            contrast: 'low',
            items: [
              { label: '24-hour', value: '24-hour', checked: state.timeFormat === '24-hour' },
              { label: '12-hour', value: '12-hour', checked: state.timeFormat === '12-hour' }
            ],
            onChange: ({ changedValue }) => {
              state.timeFormat = changedValue;
            }
          }),
          createChoiceGroup({
            type: 'radio',
            contrast: 'low',
            items: [
              { label: 'Hide seconds', value: 'hide', checked: !state.showSeconds },
              { label: 'Show seconds', value: 'show', checked: state.showSeconds }
            ],
            onChange: ({ changedValue }) => {
              state.showSeconds = changedValue === 'show';
            }
          })
        ]
      }));

      const timezoneField = createTextField({
        value: state.timezone === 'local' ? '' : state.timezone,
        placeholder: 'local or Europe/London',
        contrast: 'low',
        ariaLabel: 'Clock timezone',
        onInput: (_event, value) => {
          state.timezone = value;
        }
      });
      timezoneField.classList.add('widget-settings-modal__field');
      const timezoneInput = timezoneField.querySelector('.text-field__input');

      const labelField = createTextField({
        value: state.label,
        placeholder: 'Optional label',
        contrast: 'low',
        ariaLabel: 'Clock label',
        onInput: (_event, value) => {
          state.label = value;
        }
      });
      labelField.classList.add('widget-settings-modal__field');
      const labelInput = labelField.querySelector('.text-field__input');

      stack.appendChild(createSettingSection({
        title: 'Location',
        description: 'Use local or a valid IANA timezone to pin another city.',
        contrast: 'low',
        content: timezoneField
      }));

      stack.appendChild(createSettingSection({
        title: 'Label',
        description: 'Optional short label shown under the time.',
        contrast: 'low',
        content: labelField,
        divided: false
      }));

      content.appendChild(stack);

      let submitResult = null;
      let modal = null;

      modal = createModal({
        type: 'form',
        title: `${definition.name} settings`,
        subtitle: 'These settings are saved per widget instance.',
        content,
        buttons: [
          { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
          { label: 'Save', type: 'primary', role: 'confirm', shortcut: '↵' }
        ],
        onSubmit: () => {
          clearModalInlineError(modal);

          const nextSettings = definition.sanitizeSettings({
            timeFormat: state.timeFormat,
            showSeconds: state.showSeconds,
            timezone: (timezoneInput?.value || state.timezone || '').trim() || 'local',
            label: (labelInput?.value || state.label || '').trim()
          });

          const validation = WidgetRegistryService.validateWidgetSettings(definition.id, nextSettings);
          if (!validation.valid) {
            showModalInlineError(modal, timezoneInput, validation.message || 'Please enter a valid timezone.');
            return false;
          }

          submitResult = {
            ...normalizedRecord,
            settings: nextSettings
          };
          return true;
        },
        onClose: (confirmed) => {
          resolve(confirmed ? submitResult : null);
        }
      });

      modal.querySelector('.modal')?.classList.add('widget-settings-modal');
      showModal(modal);
      window.setTimeout(() => {
        if (timezoneInput) {
          timezoneInput.focus();
          timezoneInput.select();
        }
      }, 50);
    });
  }

  function createWidgetShopIcon(iconName) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined widget-shop-modal__card-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = iconName || 'widgets';
    return icon;
  }

  function createWidgetShopCard(definition, onAdd) {
    const card = document.createElement('div');
    card.className = 'widget-shop-modal__card';

    const icon = createWidgetShopIcon(definition.icon || 'widgets');

    const copy = document.createElement('div');
    copy.className = 'widget-shop-modal__card-copy';

    const title = document.createElement('p');
    title.className = 'widget-shop-modal__card-title';
    title.textContent = definition.name;

    const description = document.createElement('p');
    description.className = 'widget-shop-modal__card-description';
    description.textContent = definition.description;

    const addButton = createPrimaryButton({
      label: 'Add widget',
      contrast: 'high',
      onClick: onAdd
    });
    addButton.classList.add('widget-shop-modal__card-button');

    copy.append(title, description);
    card.append(icon, copy, addButton);
    return card;
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
    openWidgetSettings,
    openConfirmation,
    openError,
    openNotice,
    openPrompt
  };
})();
