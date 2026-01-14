const LeftPanelUI = (() => {
  let currentState = null;
  let onFolderSelected = null;
  let onPanelToggle = null;

  /**
   * Render the folder tree recursively
   */
  function renderFolderTree(folders, expandedFolders = []) {
    const ul = document.createElement('ul');
    ul.className = 'bmg-left-panel-tree';

    folders.forEach(folder => {
      const li = document.createElement('li');
      li.className = 'bmg-left-panel-item';
      li.dataset.folderId = folder.id;

      const hasChildren = (folder.children && folder.children.length > 0) || (folder.bookmarks && folder.bookmarks.length > 0);
      const isExpanded = expandedFolders.includes(folder.id);

      // Folder header with expand/collapse toggle
      const folderHeader = document.createElement('div');
      folderHeader.className = 'bmg-left-panel-folder-header';

      // Expand/collapse chevron
      if (hasChildren) {
        const chevron = document.createElement('span');
        chevron.className = `bmg-left-panel-chevron ${isExpanded ? 'expanded' : ''}`;
        chevron.innerHTML = '▶';
        chevron.addEventListener('click', (e) => {
          e.stopPropagation();
          handleFolderToggle(folder.id);
        });
        folderHeader.appendChild(chevron);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'bmg-left-panel-chevron-spacer';
        folderHeader.appendChild(spacer);
      }

      // Folder name and bookmark count
      const folderLabel = document.createElement('span');
      folderLabel.className = 'bmg-left-panel-folder-label';
      folderLabel.textContent = folder.title;
      folderHeader.appendChild(folderLabel);

      // Bookmark count badge
      if (folder.bookmarkCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'bmg-left-panel-count-badge';
        badge.textContent = folder.bookmarkCount;
        folderHeader.appendChild(badge);
      }

      // Add click handler for folder expansion (same as chevron)
      folderHeader.addEventListener('click', () => {
        if (hasChildren) {
          handleFolderToggle(folder.id);
        }
      });

      li.appendChild(folderHeader);

      // Render children if expanded
      if (hasChildren && isExpanded) {
        const childrenContainer = document.createElement('ul');
        childrenContainer.className = 'bmg-left-panel-tree';

        // Render subfolders first
        if (folder.children && folder.children.length > 0) {
          const subfoldersTree = renderFolderTree(folder.children, expandedFolders);
          subfoldersTree.childNodes.forEach(child => childrenContainer.appendChild(child));
        }

        // Then render bookmarks
        if (folder.bookmarks && folder.bookmarks.length > 0) {
          folder.bookmarks.forEach(bookmark => {
            const bookmarkLi = document.createElement('li');
            bookmarkLi.className = 'bmg-left-panel-bookmark-item';
            bookmarkLi.dataset.bookmarkId = bookmark.id;

            const bookmarkLink = document.createElement('a');
            bookmarkLink.className = 'bmg-left-panel-bookmark-link';
            bookmarkLink.href = bookmark.url;
            bookmarkLink.target = '_blank';
            bookmarkLink.title = bookmark.url;
            
            // Add favicon
            if (typeof FaviconService !== 'undefined') {
              const favicon = FaviconService.createFaviconElement(bookmark.url, {
                size: 16,
                className: 'bmg-left-panel-favicon',
                alt: 'Favicon'
              });
              bookmarkLink.appendChild(favicon);
            }
            
            // Add bookmark title as text node
            const titleSpan = document.createElement('span');
            titleSpan.textContent = bookmark.title;
            bookmarkLink.appendChild(titleSpan);
            
            // Prevent the link from propagating click to parent
            bookmarkLink.addEventListener('click', (e) => {
              e.stopPropagation();
            });

            bookmarkLi.appendChild(bookmarkLink);
            childrenContainer.appendChild(bookmarkLi);
          });
        }

        li.appendChild(childrenContainer);
      }

      ul.appendChild(li);
    });

    return ul;
  }

  /**
   * Handle folder click (select folder for filtering)
   */
  async function handleFolderClick(folderId) {
    try {
      // Toggle selection - if clicking same folder, deselect it
      const state = await LeftPanelService.getState();
      if (state.selectedFolderId === folderId) {
        await LeftPanelService.clearSelection();
      } else {
        await LeftPanelService.selectFolder(folderId);
      }

      // Update UI and notify
      currentState = await LeftPanelService.getState();
      updatePanelUI();

      if (onFolderSelected) {
        onFolderSelected(currentState.selectedFolderId);
      }
    } catch (e) {
      console.error('Error selecting folder:', e);
    }
  }

  /**
   * Handle folder expand/collapse toggle
   */
  async function handleFolderToggle(folderId) {
    try {
      await LeftPanelService.toggleFolderExpansion(folderId);
      currentState = await LeftPanelService.getState();
      updatePanelUI();
    } catch (e) {
      console.error('Error toggling folder:', e);
    }
  }

  /**
   * Update the panel UI
   */
  async function updatePanelUI() {
    const panelContent = document.getElementById('bmg-left-panel-content');
    if (!panelContent) return;

    try {
      const state = await LeftPanelService.getState();
      currentState = state;

      // Clear existing tree
      panelContent.innerHTML = '';

      // Build and render tree
      const folderTree = await LeftPanelService.buildFolderTree();
      const treeElement = renderFolderTree(folderTree, state.expandedFolders);
      panelContent.appendChild(treeElement);

      // Highlight selected folder
      document.querySelectorAll('.bmg-left-panel-item').forEach(item => {
        item.classList.remove('selected');
      });

      // No clear selection button needed anymore
    } catch (e) {
      console.error('Error updating panel UI:', e);
      panelContent.innerHTML = '<div class="bmg-left-panel-error">Error loading folders</div>';
    }
  }

  /**
   * Initialize the left panel UI
   */
  async function init(options = {}) {
    onFolderSelected = options.onFolderSelected || null;
    onPanelToggle = options.onPanelToggle || null;

    try {
      currentState = await LeftPanelService.getState();

      const panel = document.getElementById('bmg-left-panel');
      if (!panel) {
        console.error('Left panel container not found');
        return;
      }

      // Set panel visibility based on state
      if (currentState.isOpen) {
        panel.classList.add('open');
      } else {
        panel.classList.remove('open');
      }

      // Set panel mode
      panel.classList.remove('floating', 'docked');
      panel.classList.add(currentState.mode);

      // Render initial tree
      await updatePanelUI();

      // Setup event listeners
      setupEventListeners();
    } catch (e) {
      console.error('Error initializing left panel:', e);
    }
  }

  /**
   * Setup event listeners for panel controls
   */
  function setupEventListeners() {
    const toggleBtn = document.getElementById('bmg-left-panel-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', handlePanelToggle);
    }

    const modeBtn = document.getElementById('bmg-left-panel-mode-toggle');
    if (modeBtn) {
      modeBtn.addEventListener('click', handleModeToggle);
    }

    const closeBtn = document.getElementById('bmg-left-panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', handleCloseButtonClick);
    }
  }

  /**
   * Handle panel toggle
   */
  async function handlePanelToggle() {
    try {
      const state = await LeftPanelService.togglePanel();
      const panel = document.getElementById('bmg-left-panel');

      if (state.isOpen) {
        panel.classList.add('open');
        await updatePanelUI();
      } else {
        panel.classList.remove('open');
      }

      if (onPanelToggle) {
        onPanelToggle(state.isOpen);
      }
    } catch (e) {
      console.error('Error toggling panel:', e);
    }
  }

  /**
   * Handle mode toggle
   */
  async function handleModeToggle() {
    try {
      const state = await LeftPanelService.toggleMode();
      const panel = document.getElementById('bmg-left-panel');

      panel.classList.remove('floating', 'docked');
      panel.classList.add(state.mode);
    } catch (e) {
      console.error('Error toggling mode:', e);
    }
  }

  /**
   * Handle clear selection
   */
  async function handleClearSelection() {
    try {
      await LeftPanelService.clearSelection();
      currentState = await LeftPanelService.getState();
      updatePanelUI();

      if (onFolderSelected) {
        onFolderSelected(null);
      }
    } catch (e) {
      console.error('Error clearing selection:', e);
    }
  }

  /**
   * Open panel (without storing state change if it's just a temporary display)
   */
  async function showPanel() {
    const panel = document.getElementById('bmg-left-panel');
    if (panel) {
      panel.classList.add('open');
      await updatePanelUI();
    }
  }

  /**
   * Close panel
   */
  async function hidePanel() {
    const panel = document.getElementById('bmg-left-panel');
    if (panel) {
      panel.classList.remove('open');
    }
  }

  /**
   * Refresh tree (e.g., after bookmarks change)
   */
  async function refresh() {
    await updatePanelUI();
  }

  /**
   * Handle close button (toggles panel to floating, or closes if already floating)
   */
  async function handleCloseButtonClick() {
    try {
      const state = await LeftPanelService.getState();
      
      if (state.mode === 'docked') {
        // If docked, switch to floating mode instead of closing
        await LeftPanelService.toggleMode();
        currentState = await LeftPanelService.getState();
        const panel = document.getElementById('bmg-left-panel');
        panel.classList.remove('floating', 'docked');
        panel.classList.add(currentState.mode);
      } else {
        // If floating, just toggle the panel closed
        await LeftPanelUI.handlePanelToggle();
      }
    } catch (e) {
      console.error('Error closing panel:', e);
    }
  }

  return {
    init,
    showPanel,
    hidePanel,
    refresh,
    handlePanelToggle,
    updatePanelUI,
    handleCloseButtonClick
  };
})();
