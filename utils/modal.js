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

    const modal = new BaseModal({
      title: defaults.id ? 'Edit Bookmark' : 'Add Bookmark',
      fields: fields
    });

    // Store tabs for suggestions
    let openTabs = [];
    if (showTabsSuggestions) {
      openTabs = await new Promise(res => chrome.tabs.query({}, tabs => res(tabs)));
    }

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
    const urlField = urlInput.closest('.bm-field');
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
   * FolderForm Modal
   */
  function openFolderForm(defaults = {}) {
    const modal = new BaseModal({
      title: 'Edit Folder',
      fields: [
        {
          id: 'bm_folder_title',
          label: 'Folder name',
          type: 'text',
          value: defaults.title || '',
          required: true
        }
      ]
    });

    return modal.show().then((data) => {
      if (!data) return null;
      return { title: data.bm_folder_title };
    });
  }

  /**
   * TabsPicker Modal
   */
  function openTabsPicker(tabs = []) {
    return new Promise((resolve) => {
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
      cancelText = 'Cancel' 
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
      customContent: `<p style="margin: 1rem 0; line-height: 1.5;">${escapeHtml(message)}</p>`,
      confirmText: confirmText,
      cancelText: cancelText
    });

    return modal.show().then(data => {
      // Return true if confirmed, false if cancelled
      return data !== null;
    });
  }

  return { 
    openBookmarkForm, 
    openFolderForm, 
    openTabsPicker, 
    openWidgetPicker, 
    openConfirmation,
    initializeTagify 
  };
})();
