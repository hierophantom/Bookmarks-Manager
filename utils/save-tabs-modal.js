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

        if (typeof createModal !== 'function' || typeof showModal !== 'function') {
          throw new Error('Design-system modal component is not available');
        }

        // Content
        const content = document.createElement('div');
        content.className = 'save-tabs-modal__content';

        // Tabs list
        const tabsLabel = document.createElement('div');
        tabsLabel.className = 'save-tabs-modal__label';
        tabsLabel.textContent = 'Select tabs to save:';
        content.appendChild(tabsLabel);

        const tabsList = document.createElement('div');
        tabsList.className = 'save-tabs-modal__tabs-list';

        tabCheckboxes.forEach(opt => {
          const row = document.createElement('label');
          row.className = 'save-tabs-modal__tab-row';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = opt.checked;
          checkbox.dataset.tabId = opt.value;
          checkbox.className = 'save-tabs-modal__checkbox';

          row.appendChild(checkbox);

          // Add favicon if available
          if (typeof FaviconService !== 'undefined' && opt.data && opt.data.url) {
            const favicon = FaviconService.createFaviconElement(opt.data.url, {
              size: 16,
              className: 'tab-favicon save-tabs-modal__favicon',
              alt: 'Favicon'
            });
            row.appendChild(favicon);
          }

          const label = document.createElement('span');
          label.className = 'save-tabs-modal__tab-title';
          label.setAttribute('dir', 'auto');
          label.textContent = opt.label;

          row.appendChild(label);
          tabsList.appendChild(row);
        });

        content.appendChild(tabsList);

        // Destination select
        const destWrapper = document.createElement('div');
        destWrapper.className = 'save-tabs-modal__destination';

        const destLabel = document.createElement('label');
        destLabel.className = 'save-tabs-modal__label';
        destLabel.textContent = 'Save to:';
        destWrapper.appendChild(destLabel);

        const select = document.createElement('select');
        select.className = 'save-tabs-modal__select';

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
        newFolderInput.className = 'save-tabs-modal__input';
        newFolderInput.style.display = 'none';
        destWrapper.appendChild(newFolderInput);

        const saveInfo = document.createElement('div');
        saveInfo.className = 'bmg-save-info';
        saveInfo.innerHTML = `
          <p id="bmg-save-message">Tabs will be saved in a new folder named: <strong id="bmg-folder-name-preview"></strong></p>
        `;
        content.insertBefore(saveInfo, tabsLabel);

        const folderNamePreview = saveInfo.querySelector('#bmg-folder-name-preview');

        const updateSaveInfo = () => {
          const creatingNewFolder = select.value === '__new__';
          const previewName = (newFolderInput.value || '').trim() || defaultFolderName;

          if (folderNamePreview) {
            folderNamePreview.textContent = previewName;
          }

          saveInfo.style.display = creatingNewFolder ? '' : 'none';
        };

        select.addEventListener('change', () => {
          const show = select.value === '__new__';
          newFolderInput.style.display = show ? 'block' : 'none';
          updateSaveInfo();
        });

        newFolderInput.addEventListener('input', updateSaveInfo);
        updateSaveInfo();

        content.appendChild(destWrapper);

        let submitResult = null;

        const modal = createModal({
          type: 'form',
          title: 'Save session',
          content,
          buttons: [
            { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
            { label: 'Save', type: 'primary', role: 'confirm', shortcut: '↵' }
          ],
          onSubmit: async () => {
            const selectedTabIds = Array.from(tabsList.querySelectorAll('input[type="checkbox"]'))
              .filter(cb => cb.checked)
              .map(cb => parseInt(cb.dataset.tabId, 10));

            if (selectedTabIds.length === 0) {
              await Modal.openError({
                title: 'No Tabs Selected',
                message: 'Please select at least one tab to save.'
              });
              return false;
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

            submitResult = { savedCount: selectedTabs.length, destinationFolderId };
            return true;
          },
          onClose: (confirmed) => {
            resolve(confirmed ? submitResult : null);
          }
        });

        modal.querySelector('.modal')?.classList.add('save-tabs-modal');

        showModal(modal);
      } catch (error) {
        console.error('Error in SaveTabsModal:', error);
        await Modal.openError({
          title: 'Save Failed',
          message: 'Failed to save tabs: ' + error.message
        });
        reject(error);
      }
    });
  }

  const api = {
    show
  };

  if (typeof window !== 'undefined') {
    window.SaveTabsModal = api;
  }

  return api;
})();
