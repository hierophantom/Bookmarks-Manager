const LeftPanelUI = (() => {
  let currentState = null;
  let onFolderSelected = null;
  let onPanelToggle = null;

  /**
   * Render the folder tree recursively
   */
  async function renderFolderTree(folders, expandedFolders = [], isRoot = true) {
    const ul = document.createElement('ul');
    ul.className = 'bmg-left-panel-tree';

    // Only add 'All bookmarks' at the root level
    if (isRoot) {
      const allLi = document.createElement('li');
      allLi.className = 'bmg-left-panel-item bmg-left-panel-all-bookmarks';
      allLi.dataset.folderId = 'ALL_BOOKMARKS';
      const allHeader = document.createElement('div');
      allHeader.className = 'bmg-left-panel-folder-header';
      const allLabel = document.createElement('span');
      allLabel.className = 'bmg-left-panel-folder-label';
      allLabel.textContent = 'All bookmarks';
      allHeader.appendChild(allLabel);
      allLi.appendChild(allHeader);
      allLi.addEventListener('click', async () => {
        await handleClearSelection();
      });
      ul.appendChild(allLi);
    }

    for (const folder of folders) {
      const li = document.createElement('li');
      li.className = 'bmg-left-panel-item';
      li.dataset.folderId = folder.id;

      const hasChildren = (folder.children && folder.children.length > 0) || (folder.bookmarks && folder.bookmarks.length > 0);
      const isExpanded = expandedFolders.includes(folder.id);

      // Get folder customization
      let customization = null;
      if (typeof FolderCustomizationService !== 'undefined') {
        customization = await FolderCustomizationService.get(folder.id);
      }

      // Folder header with expand/collapse toggle
      const folderHeader = document.createElement('div');
      folderHeader.className = 'bmg-left-panel-folder-header';

      // Apply custom color styles
      if (customization) {
        const styles = FolderCustomizationService.getFolderStyles(customization);
        if (styles.borderColor) {
          folderHeader.style.borderLeft = `3px solid ${styles.borderColor}`;
          folderHeader.style.paddingLeft = '8px';
        }
      }

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

      // Folder icon and name
      const folderLabel = document.createElement('span');
      folderLabel.className = 'bmg-left-panel-folder-label';
      
      if (customization) {
        const iconElement = document.createElement('span');
        if (customization.emoji && customization.color) {
          iconElement.style.cssText = `display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; background: ${customization.color}; border-radius: 3px; font-size: 12px; margin-right: 6px;`;
          iconElement.textContent = customization.emoji;
        } else if (customization.emoji) {
          iconElement.style.marginRight = '6px';
          iconElement.textContent = customization.emoji;
        }
        folderLabel.appendChild(iconElement);
        folderLabel.appendChild(document.createTextNode(folder.title));
      } else {
        folderLabel.textContent = folder.title;
      }
      
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
          const subfoldersTree = await renderFolderTree(folder.children, expandedFolders, false);
          subfoldersTree.childNodes.forEach(child => childrenContainer.appendChild(child));
        }

        li.appendChild(childrenContainer);
      }

      ul.appendChild(li);
    }

    return ul;
  }

  /**
   * Handle folder click (select folder for filtering)
   */
  async function handleFolderClick(folderId) {
    try {
      // If clicking the same active folder, clear filter and deselect
      const state = await LeftPanelService.getState();
      if (state.selectedFolderId === folderId) {
        await handleClearSelection();
        return;
      }
      await LeftPanelService.selectFolder(folderId);
      currentState = await LeftPanelService.getState();
      await updatePanelUI();
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
      await updatePanelUI();
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
    } catch (e) {
      console.error('Error updating panel UI:', e);
      panelContent.innerHTML = '';
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
      const state = await LeftPanelService.getState();
      currentState = state;
      await updatePanelUI();
    } catch (e) {
      console.error('Error toggling panel:', e);
    }
  }

  /**
   * Handle clear selection
   */
  async function handleClearSelection() {
    try {
      await LeftPanelService.clearSelection();
      currentState = await LeftPanelService.getState();
      await updatePanelUI();

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
   * Handle mode toggle (docked vs floating)
   */
  async function handleModeToggle() {
    try {
      await LeftPanelService.toggleMode();
      currentState = await LeftPanelService.getState();
      const panel = document.getElementById('bmg-left-panel');
      panel.classList.remove('floating', 'docked');
      panel.classList.add(currentState.mode);
    } catch (e) {
      console.error('Error toggling mode:', e);
    }
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
