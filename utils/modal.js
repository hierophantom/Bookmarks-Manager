const Modal = (() => {
  /**
   * BookmarkForm Modal
   */
  function openBookmarkForm(defaults = {}) {
    const tagArr = Array.isArray(defaults.tags) ? defaults.tags : [];

    const modal = new BaseModal({
      title: defaults.id ? 'Edit Bookmark' : 'Add Bookmark',
      fields: [
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
          label: 'Tags (comma-separated)',
          type: 'text',
          value: tagArr.join(', '),
          placeholder: 'tag1, tag2, tag3'
        }
      ]
    });

    return modal.show().then((data) => {
      if (!data) return null;
      
      // Parse tags from comma-separated string
      const tags = data.bm_tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      return {
        title: data.bm_title,
        url: data.bm_url || null,
        tags
      };
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
              <input type="checkbox" class="bm-tab-checkbox" data-index="${i}" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">${escapeHtml(t.title || t.url)}</div>
                <div class="text-xs text-gray-500 truncate">${escapeHtml(t.url)}</div>
              </div>
            </label>`
        )
        .join('');

      card.innerHTML = `
        <h2 class="text-xl font-bold text-gray-900 mb-4">Add Tabs to Folder</h2>
        <div class="bm-modal-form">
          <label class="flex items-center gap-2 p-2 mb-2 bg-gray-50 rounded font-medium">
            <input type="checkbox" id="bm_select_all" />
            Select all
          </label>
          <div id="bm_tabs_list" class="max-h-64 overflow-y-auto border border-gray-300 rounded mb-4">
            ${listHtml}
          </div>
          <div class="flex gap-3">
            <button id="bm_tabs_cancel" class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors">
              Cancel
            </button>
            <button id="bm_tabs_add" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium transition-colors">
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

        // Cmd/Ctrl+Enter to submit
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
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
          (w) =>
            `<button class="bm-widget-item w-full p-3 mb-2 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-md transition-colors" data-widget-id="${w.id}">
              <div class="text-lg">${w.icon}</div>
              <div class="font-medium text-gray-900">${w.title}</div>
            </button>`
        )
        .join('');

      card.innerHTML = `
        <h2 class="text-xl font-bold text-gray-900 mb-4">Add Widget</h2>
        <div class="bm-widget-list mb-4">
          ${widgetsHtml}
        </div>
        <button id="bm_widget_cancel" class="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors">
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

  return { openBookmarkForm, openFolderForm, openTabsPicker, openWidgetPicker };
})();
