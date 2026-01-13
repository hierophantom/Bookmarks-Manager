const SaveTabsModal = (() => {
  /**
   * Show modal to save tabs
   * @param {Array} tabs - Array of tab objects with {id, title, url}
   * @returns {Promise} Resolves when save is complete or modal is cancelled
   */
  async function show(tabs) {
    return new Promise(async (resolve, reject) => {
      try {
        // Build tab list for selection
        const tabCheckboxes = tabs.map((tab, index) => {
          return {
            label: tab.title || tab.url,
            value: tab.id,
            checked: true,
            data: tab
          };
        });

        // Get folder tree for destination selection
        const tree = await BookmarksService.getTree();
        const folders = [];
        
        function collectFolders(node, depth = 0) {
          if (!node || node.url) return; // Skip bookmarks
          
          if (node.id !== '0') { // Skip root
            folders.push({
              id: node.id,
              title: node.title || '(Untitled)',
              depth: depth
            });
          }
          
          if (node.children) {
            node.children.forEach(child => collectFolders(child, depth + 1));
          }
        }
        
        if (tree[0] && tree[0].children) {
          tree[0].children.forEach(child => collectFolders(child, 0));
        }

        // Build folder options
        const folderOptions = folders.map(folder => ({
          value: folder.id,
          label: '  '.repeat(folder.depth) + folder.title
        }));

        // Add "Create new folder" option
        folderOptions.unshift({ value: '__new__', label: '+ Create New Folder' });

        // Generate default folder name
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const defaultFolderName = `Session - ${dateStr} ${timeStr}`;

        // Build custom modal DOM (avoids Modal.open dependency)
        const overlayId = 'save-tabs-modal-overlay';
        const existingOverlay = document.getElementById(overlayId);
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1000';

        const modal = document.createElement('div');
        modal.style.background = '#fff';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        modal.style.width = '420px';
        modal.style.maxHeight = '80vh';
        modal.style.overflow = 'hidden';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';

        // Header
        const header = document.createElement('div');
        header.style.padding = '16px';
        header.style.borderBottom = '1px solid #e5e7eb';
        header.innerHTML = '<h2 style="margin:0;font-size:16px;font-weight:700;color:#111827;">Save Tabs as Bookmarks</h2>';
        modal.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.style.padding = '16px';
        content.style.overflowY = 'auto';
        content.style.flex = '1';

        // Tabs list
        const tabsLabel = document.createElement('div');
        tabsLabel.style.marginBottom = '8px';
        tabsLabel.style.fontWeight = '600';
        tabsLabel.style.fontSize = '13px';
        tabsLabel.textContent = 'Select tabs to save:';
        content.appendChild(tabsLabel);

        const tabsList = document.createElement('div');
        tabsList.style.border = '1px solid #e5e7eb';
        tabsList.style.borderRadius = '6px';
        tabsList.style.padding = '8px';
        tabsList.style.maxHeight = '220px';
        tabsList.style.overflowY = 'auto';

        tabCheckboxes.forEach(opt => {
          const row = document.createElement('label');
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.gap = '8px';
          row.style.padding = '6px 4px';
          row.style.borderBottom = '1px solid #f3f4f6';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = opt.checked;
          checkbox.dataset.tabId = opt.value;
          checkbox.style.cursor = 'pointer';

          const label = document.createElement('span');
          label.style.fontSize = '13px';
          label.style.color = '#111827';
          label.textContent = opt.label;

          row.appendChild(checkbox);
          row.appendChild(label);
          tabsList.appendChild(row);
        });

        content.appendChild(tabsList);

        // Destination select
        const destWrapper = document.createElement('div');
        destWrapper.style.marginTop = '14px';
        destWrapper.style.display = 'flex';
        destWrapper.style.flexDirection = 'column';
        destWrapper.style.gap = '6px';

        const destLabel = document.createElement('label');
        destLabel.style.fontWeight = '600';
        destLabel.style.fontSize = '13px';
        destLabel.textContent = 'Save to:';
        destWrapper.appendChild(destLabel);

        const select = document.createElement('select');
        select.style.padding = '8px';
        select.style.border = '1px solid #d1d5db';
        select.style.borderRadius = '6px';
        select.style.fontSize = '13px';

        folderOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          select.appendChild(option);
        });

        destWrapper.appendChild(select);

        const newFolderInput = document.createElement('input');
        newFolderInput.type = 'text';
        newFolderInput.placeholder = 'New folder name';
        newFolderInput.value = defaultFolderName;
        newFolderInput.style.padding = '8px';
        newFolderInput.style.border = '1px solid #d1d5db';
        newFolderInput.style.borderRadius = '6px';
        newFolderInput.style.fontSize = '13px';
        newFolderInput.style.display = 'none';
        destWrapper.appendChild(newFolderInput);

        select.addEventListener('change', () => {
          const show = select.value === '__new__';
          newFolderInput.style.display = show ? 'block' : 'none';
        });

        content.appendChild(destWrapper);

        modal.appendChild(content);

        // Actions
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.borderTop = '1px solid #e5e7eb';
        actions.style.padding = '12px 16px';
        actions.style.justifyContent = 'flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.padding = '8px 12px';
        cancelBtn.style.background = '#e5e7eb';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.style.cursor = 'pointer';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.textContent = 'Save';
        saveBtn.style.padding = '8px 12px';
        saveBtn.style.background = '#4f46e5';
        saveBtn.style.color = '#fff';
        saveBtn.style.border = 'none';
        saveBtn.style.borderRadius = '6px';
        saveBtn.style.cursor = 'pointer';

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const cleanup = () => {
          overlay.remove();
          document.removeEventListener('keydown', escHandler, true);
        };

        const escHandler = (e) => {
          if (e.key === 'Escape') {
            cleanup();
            resolve(null);
          }
        };

        document.addEventListener('keydown', escHandler, true);

        cancelBtn.addEventListener('click', () => {
          cleanup();
          resolve(null);
        });

        saveBtn.addEventListener('click', async () => {
          const selectedTabIds = Array.from(tabsList.querySelectorAll('input[type="checkbox"]'))
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.dataset.tabId, 10));

          if (selectedTabIds.length === 0) {
            alert('Please select at least one tab to save');
            return;
          }

          let destinationFolderId = select.value;
          if (destinationFolderId === '__new__') {
            const folderName = newFolderInput.value.trim() || defaultFolderName;
            const newFolder = await BookmarksService.createFolder('1', folderName);
            destinationFolderId = newFolder.id;
          }

          const selectedTabs = tabs.filter(tab => selectedTabIds.includes(tab.id));
          for (const tab of selectedTabs) {
            await chrome.bookmarks.create({
              parentId: destinationFolderId,
              title: tab.title || tab.url,
              url: tab.url
            });
          }

          alert(`Successfully saved ${selectedTabs.length} ${selectedTabs.length === 1 ? 'tab' : 'tabs'}!`);
          cleanup();
          resolve({ savedCount: selectedTabs.length, destinationFolderId });
        });
      } catch (error) {
        console.error('Error in SaveTabsModal:', error);
        alert('Failed to save tabs: ' + error.message);
        reject(error);
      }
    });
  }

  return {
    show
  };
})();
