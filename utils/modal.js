const Modal = (() => {
  /**
   * BookmarkForm Modal with Tagify integration
   * @param {Object} defaults - Default values { id, title, url, tags, folderId }
   * @param {Object} options - Options { showFolderSelector: boolean, showTabsSuggestions: boolean }
   */
  async function openBookmarkForm(defaults = {}, options = {}) {
    const tagArr = Array.isArray(defaults.tags) ? defaults.tags : [];
    const showFolderSelector = options.showFolderSelector || false;
    const showTabsSuggestions = options.showTabsSuggestions !== false; // Default true

    const fields = [
      {
        id: 'bm_title',
        label: 'Title',
        type: 'text',
        value: defaults.title || '',
        required: true
      },
      {
        id: 'bm_url',
        label: 'URL',
        type: 'url',
        value: defaults.url || '',
        placeholder: 'https://example.com'
      },
      {
        id: 'bm_tags',
        label: 'Tags',
        type: 'text',
        value: tagArr.join(','),
        placeholder: 'Add tags...'
      }
    ];

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

    // Store tabs for suggestions
    let openTabs = [];
    if (showTabsSuggestions) {
      openTabs = await new Promise(res => chrome.tabs.query({}, tabs => res(tabs)));
    }

    if (typeof createModal === 'function' && typeof showModal === 'function') {
      return new Promise((resolve) => {
        let submitResult = null;

        const cleanup = () => {
          const tagsInput = document.getElementById('bm_tags');
          if (tagsInput && tagsInput.tagify) {
            tagsInput.tagify.destroy();
          }
          const dropdown = document.getElementById('bm-tabs-suggestions');
          if (dropdown) dropdown.remove();
        };

        const modal = createModal({
          type: 'form',
          title: defaults.id ? 'Edit Bookmark' : 'Add Bookmark',
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

            if (!title) {
              await openError({
                title: 'Missing Title',
                message: 'Title is required.'
              });
              return false;
            }

            if (rawUrl) {
              try {
                new URL(rawUrl);
              } catch (error) {
                await openError({
                  title: 'Invalid URL',
                  message: 'URL appears invalid.'
                });
                return false;
              }
            }

            const tags = tagsInput && tagsInput.tagify
              ? tagsInput.tagify.value.map(item => (typeof item === 'string' ? item : item.value))
              : [];

            submitResult = {
              title,
              url: rawUrl || null,
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

        setTimeout(() => {
          initializeTagify();
          if (showTabsSuggestions && openTabs.length > 0) {
            setupTabsSuggestions(openTabs);
          }
        }, 60);
      });
    }

    const modal = new BaseModal({
      title: defaults.id ? 'Edit Bookmark' : 'Add Bookmark',
      fields: fields
    });

    const modalPromise = modal.show().then(async (data) => {
      console.log('[Modal] openBookmarkForm - received data from modal:', data);
      
      // Clean up Tagify instance
      const tagsInput = document.getElementById('bm_tags');
      if (tagsInput && tagsInput.tagify) {
        console.log('[Modal] openBookmarkForm - destroying Tagify instance');
        tagsInput.tagify.destroy();
      }
      
      if (!data) {
        console.log('[Modal] openBookmarkForm - modal was cancelled');
        // Clean up tabs suggestions dropdown if exists
        const dropdown = document.getElementById('bm-tabs-suggestions');
        if (dropdown) dropdown.remove();
        return null;
      }

      const result = {
        title: data.bm_title,
        url: data.bm_url || null,
        tags: data.bm_tags || [],
        folderId: data.bm_folder || null
      };
      
      // Clean up tabs suggestions dropdown
      const dropdown = document.getElementById('bm-tabs-suggestions');
      if (dropdown) dropdown.remove();
      
      console.log('[Modal] openBookmarkForm - returning result:', result);
      return result;
    });

    // After modal is shown, add tabs suggestions dropdown
    if (showTabsSuggestions && openTabs.length > 0) {
      // Wait for modal to be rendered
      setTimeout(() => {
        setupTabsSuggestions(openTabs);
      }, 100);
    }

    return modalPromise;
  }

  // Setup tabs suggestions dropdown
  function setupTabsSuggestions(tabs) {
    const urlInput = document.getElementById('bm_url');
    const titleInput = document.getElementById('bm_title');
    if (!urlInput || !titleInput) return;

    // Create suggestions dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'bm-tabs-suggestions';
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 200px;
      overflow-y: auto;
      background: white;
      border: 1px solid #d1d5db;
      border-top: none;
      border-radius: 0 0 0.375rem 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: none;
    `;

    // Find the URL field wrapper
    const urlField = urlInput.closest('.bm-field, .modal__field');
    if (!urlField) return;
    
    urlField.style.position = 'relative';
    urlField.appendChild(dropdown);

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
          if (!titleInput.value) {
            titleInput.value = tab.title || tab.url;
          }
          dropdown.style.display = 'none';
          urlInput.focus();
        });

        dropdown.appendChild(item);
      });

      dropdown.style.display = 'block';
    }

    // Show suggestions when URL field is focused
    urlInput.addEventListener('focus', () => {
      updateSuggestions(urlInput.value);
    });

    // Update suggestions as user types
    urlInput.addEventListener('input', () => {
      updateSuggestions(urlInput.value);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!urlField.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Hide dropdown on Escape
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.style.display === 'block') {
        e.stopPropagation();
        dropdown.style.display = 'none';
      }
    });
  }

  // Initialize Tagify on the tags input after modal is shown
  // This is called internally by BaseModal after rendering
  function initializeTagify() {
    console.log('[Modal] initializeTagify - starting');
    const tagsInput = document.getElementById('bm_tags');
    if (!tagsInput) {
      console.log('[Modal] initializeTagify - no tags input found');
      return;
    }
    
    if (typeof Tagify === 'undefined') {
      console.log('[Modal] initializeTagify - Tagify library not available');
      return;
    }

    console.log('[Modal] initializeTagify - Tagify found, initializing');
    // Get all existing tags for autocomplete
    TagsService.getAllTags().then(allTags => {
      console.log('[Modal] initializeTagify - all tags from service:', allTags);
      const tagify = new Tagify(tagsInput, {
        whitelist: allTags,
        maxTags: 20,
        dropdown: {
          maxItems: 10,
          enabled: 0,
          closeOnSelect: false
        },
        editTags: false,
        duplicates: false,
        trim: true,
        placeholder: 'Type to add tags...',
        originalInputValueFormat: valuesArr => valuesArr.map(item => item.value).join(',')
      });
      
      console.log('[Modal] initializeTagify - Tagify instance created, attaching to input');
      tagsInput.tagify = tagify;

      // Style the Tagify container to match modal styling
      const tagifyWrapper = tagsInput.nextElementSibling;
      if (tagifyWrapper && tagifyWrapper.classList.contains('tagify')) {
        console.log('[Modal] initializeTagify - styling Tagify wrapper');
        tagifyWrapper.style.cssText = `
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem;
          min-height: 42px;
        `;
      }
      
      console.log('[Modal] initializeTagify - complete');
    }).catch(err => {
      console.error('[Modal] initializeTagify - failed to load tags:', err);
    });
  }

  /**
   * FolderForm Modal with emoji and color customization
   */
  async function openFolderForm(defaults = {}) {
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

      const safeTitle = defaults.title !== undefined ? 'Edit Folder' : 'Create Folder';
      const colorOptions = typeof FolderCustomizationService !== 'undefined' && typeof FolderCustomizationService.getColors === 'function'
        ? FolderCustomizationService.getColors()
        : [];

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay folder-form-modal-overlay';

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'modal modal--form folder-form-modal';

      modal.innerHTML = `
        <div class="modal__content folder-form-modal__content">
          <h2 class="modal__title folder-form-modal__title">${safeTitle}</h2>

          <div class="folder-form-modal__field">
            <label class="folder-form-modal__label" for="folder-title-input">Folder Name <span class="folder-form-modal__required">*</span></label>
            <input id="folder-title-input" type="text" required class="bm-input folder-form-modal__input" placeholder="Enter folder name" />
          </div>

          <div class="folder-form-modal__field">
            <label class="folder-form-modal__label" for="select-emoji-btn">Folder Icon (optional)</label>
            <button id="select-emoji-btn" type="button" class="folder-form-modal__emoji-btn">
              <span id="selected-emoji-display" class="folder-form-modal__emoji">${selectedEmoji || '📁'}</span>
              <span class="folder-form-modal__emoji-copy">Click to ${selectedEmoji ? 'change' : 'select'}</span>
            </button>
          </div>

          <div class="folder-form-modal__field folder-form-modal__field--colors">
            <label class="folder-form-modal__label">Folder Color (optional)</label>
            <div id="color-picker-grid" class="folder-form-modal__color-grid">
              ${colorOptions.map(color => `
                <button type="button" class="color-option folder-form-modal__color-option" data-color="${color.value}" style="background:${color.value}; border-color:${selectedColor === color.value ? 'var(--theme-text, #1a1a1a)' : 'transparent'};">
                  ${selectedColor === color.value ? '<span class="folder-form-modal__color-check">✓</span>' : ''}
                </button>
              `).join('')}
            </div>
            ${selectedColor ? '<button id="clear-color-btn" type="button" class="button-common button-common--low folder-form-modal__clear-btn">Clear Color</button>' : ''}
          </div>
        </div>

        <div class="modal__actions folder-form-modal__actions" role="group" aria-label="Folder modal actions">
          <button id="folder-cancel-btn" type="button" class="button-common button-common--low">Cancel</button>
          <button id="folder-save-btn" type="button" class="button-primary button-primary--high">Save</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const titleInput = modal.querySelector('#folder-title-input');
      const emojiBtn = modal.querySelector('#select-emoji-btn');
      const emojiDisplay = modal.querySelector('#selected-emoji-display');
      const colorGrid = modal.querySelector('#color-picker-grid');
      const saveBtn = modal.querySelector('#folder-save-btn');
      const cancelBtn = modal.querySelector('#folder-cancel-btn');
      titleInput.value = defaults.title || '';

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
          const emojiCopy = emojiBtn.querySelector('.folder-form-modal__emoji-copy');
          if (emojiCopy) {
            emojiCopy.textContent = `Click to ${selectedEmoji ? 'change' : 'select'}`;
          }
        }
      });

      // Color picker
      colorGrid.addEventListener('click', (e) => {
        const colorBtn = e.target.closest('.color-option');
        if (!colorBtn) return;
        
        const color = colorBtn.dataset.color;
        selectedColor = selectedColor === color ? null : color;
        
        // Update UI
        modal.querySelectorAll('.color-option').forEach(btn => {
          const btnColor = btn.dataset.color;
          btn.style.borderColor = selectedColor === btnColor ? 'var(--theme-text, #1a1a1a)' : 'transparent';
          btn.innerHTML = selectedColor === btnColor ? '<span class="folder-form-modal__color-check">✓</span>' : '';
        });

        // Update clear button
        const clearBtn = modal.querySelector('#clear-color-btn');
        if (selectedColor && !clearBtn) {
          const btn = document.createElement('button');
          btn.id = 'clear-color-btn';
          btn.type = 'button';
          btn.textContent = 'Clear Color';
          btn.className = 'button-common button-common--low folder-form-modal__clear-btn';
          btn.addEventListener('click', () => {
            selectedColor = null;
            modal.querySelectorAll('.color-option').forEach(btn => {
              btn.style.borderColor = 'transparent';
              btn.innerHTML = '';
            });
            btn.remove();
          });
          colorGrid.parentElement.appendChild(btn);
        } else if (!selectedColor && clearBtn) {
          clearBtn.remove();
        }
      });

      // Clear color button (if color already selected)
      const clearColorBtn = modal.querySelector('#clear-color-btn');
      if (clearColorBtn) {
        clearColorBtn.addEventListener('click', () => {
          selectedColor = null;
          modal.querySelectorAll('.color-option').forEach(btn => {
            btn.style.borderColor = 'transparent';
            btn.innerHTML = '';
          });
          clearColorBtn.remove();
        });
      }

      // Save
      saveBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        if (!title) {
          openError({
            title: 'Missing Folder Name',
            message: 'Folder name is required.'
          });
          return;
        }
        
        overlay.remove();
        resolve({
          title,
          customization: (selectedEmoji || selectedColor) ? {
            emoji: selectedEmoji,
            color: selectedColor
          } : null
        });
      });

      // Cancel
      cancelBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });

      // Click outside to close
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });

      // ESC key
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          overlay.remove();
          resolve(null);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
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
          { id: 'clock', title: 'Clock', icon: '🕐' },
          { id: 'quicklinks', title: 'Quick Links', icon: '⚡' },
          { id: 'notes', title: 'Notes', icon: '📝' }
        ];

        let selectedWidget = null;
        const list = document.createElement('div');
        list.className = 'bm-widget-list';

        widgets.forEach((widget) => {
          const optionBtn = document.createElement('button');
          optionBtn.type = 'button';
          optionBtn.className = 'bm-widget-item-btn';
          optionBtn.textContent = `${widget.icon} ${widget.title}`;
          optionBtn.addEventListener('click', () => {
            selectedWidget = widget;
            list.querySelectorAll('.bm-widget-item-btn').forEach((btn) => btn.classList.remove('bm-widget-item-btn--selected'));
            optionBtn.classList.add('bm-widget-item-btn--selected');
          });
          list.appendChild(optionBtn);
        });

        const modal = createModal({
          type: 'form',
          title: 'Add Widget',
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
        <h2 id="bm-widget-title" class="text-xl font-bold text-gray-900 mb-4">Add Widget</h2>
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
            { label: confirmText, type: destructive ? 'primary' : 'primary', role: 'confirm', shortcut: '↵' }
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
    openPrompt,
    initializeTagify 
  };
})();
