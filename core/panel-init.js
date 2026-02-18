/**
 * Panel Initialization
 * 
 * Initializes new side panel components (folder tree view and active sessions)
 * Must run after panel component scripts are loaded
 */

// Load folder tree data
async function loadLeftPanelData(panel) {
  if (!panel || typeof BookmarksService === 'undefined') return;
  
  try {
    const tree = await BookmarksService.getTree();
    if (!tree || !tree[0]) return;
    
    panel.clearFolders?.();
    const allItem = panel.addFolderItem?.({
      id: 'ALL_BOOKMARKS',
      label: 'All bookmarks',
      variant: 'flat',
      level: 0,
      counter: 0,
      onClick: () => {
        if (typeof window.clearFolderFilter === 'function') {
          window.clearFolderFilter();
        }
        panel.setActiveFolder?.('ALL_BOOKMARKS');
      }
    });
    if (allItem) {
      allItem.dataset.folderId = 'ALL_BOOKMARKS';
      allItem.dataset.parentId = '';
      allItem.dataset.level = '0';
      allItem.dataset.hasChildren = 'false';
    }
    panel.setActiveFolder?.('ALL_BOOKMARKS');
    const root = tree[0];
    
    if (root.children) {
      // Recursively add all folders with hierarchy
      for (const folder of root.children) {
        await addFolderHierarchy(panel, folder, 0, '');
      }
    }

    updateFolderTreeVisibility(panel);
  } catch (e) {
    console.error('Error loading folder data:', e);
  }
}

// Recursively add folders and subfolders
async function addFolderHierarchy(panel, folderNode, level, parentId) {
  // Skip non-folders
  if (folderNode.url) return;
  
  // Count ONLY child folders (not bookmarks)
  let childFolderCount = 0;
  let totalItemCount = 0;
  if (folderNode.children) {
    for (const child of folderNode.children) {
      if (!child.url) {
        childFolderCount++;
      }
      totalItemCount++;
    }
  }
  
  // Add folder item to panel
  const hasChildren = childFolderCount > 0;
  const item = panel.addFolderItem?.({
    id: folderNode.id,
    label: folderNode.title || 'Untitled',
    variant: hasChildren ? 'expanded' : 'flat',
    level: level,
    counter: totalItemCount,
    onClick: () => {
      console.log('[FolderPanel] Clicked folder:', folderNode.id, 'Current filter:', window.currentFolderFilter);
      // Toggle: if already active, clear filter; otherwise set it
      const isCurrentlyActive = window.currentFolderFilter === folderNode.id;
      
      if (isCurrentlyActive) {
        console.log('[FolderPanel] Toggling OFF - clearing filter');
        // Clear filter - show normal view
        if (typeof window.clearFolderFilter === 'function') {
          window.clearFolderFilter();
        }
        panel.setActiveFolder?.(null);
      } else {
        console.log('[FolderPanel] Toggling ON - setting filter to:', folderNode.id);
        // Set filter to this folder
        if (typeof window.showBookmarksInFolder === 'function') {
          window.showBookmarksInFolder(folderNode.id);
        }
        // Mark as active
        panel.setActiveFolder?.(folderNode.id);
      }
    },
    onExpand: () => {
      toggleFolderExpansion(panel, folderNode.id);
    }
  });

  if (item) {
    item.dataset.folderId = folderNode.id;
    item.dataset.parentId = parentId || '';
    item.dataset.level = `${level}`;
    item.dataset.hasChildren = hasChildren ? 'true' : 'false';
    if (hasChildren) {
      item.dataset.expanded = 'true';
    }
  }
  
  // Recursively add subfolders
  if (folderNode.children) {
    for (const child of folderNode.children) {
      if (!child.url) { // Only show folders, not bookmarks
        await addFolderHierarchy(panel, child, level + 1, folderNode.id);
      }
    }
  }
}

function toggleFolderExpansion(panel, folderId) {
  const item = panel.content?.querySelector(`[data-folder-id="${folderId}"]`);
  if (!item) return;
  const isExpanded = item.dataset.expanded === 'true';
  setFolderExpanded(panel, folderId, !isExpanded);
}

function setFolderExpanded(panel, folderId, expanded) {
  const item = panel.content?.querySelector(`[data-folder-id="${folderId}"]`);
  if (!item || item.dataset.hasChildren !== 'true') return;

  const parentId = item.dataset.parentId || '';
  const items = panel.content?.querySelectorAll('.folder-tree-item') || [];

  if (expanded) {
    items.forEach((node) => {
      if (node.dataset.parentId === parentId && node.dataset.folderId !== folderId && node.dataset.hasChildren === 'true') {
        node.dataset.expanded = 'false';
        panel.updateFolderItem?.(node.dataset.folderId, { variant: 'collapsed' });
        collapseDescendants(panel, node.dataset.folderId);
      }
    });
  }

  item.dataset.expanded = expanded ? 'true' : 'false';
  panel.updateFolderItem?.(folderId, { variant: expanded ? 'expanded' : 'collapsed' });

  if (!expanded) {
    collapseDescendants(panel, folderId);
  }

  updateFolderTreeVisibility(panel);
}

function collapseDescendants(panel, ancestorId) {
  const items = panel.content?.querySelectorAll('.folder-tree-item') || [];
  items.forEach((node) => {
    if (isDescendant(panel, node, ancestorId) && node.dataset.hasChildren === 'true') {
      node.dataset.expanded = 'false';
      panel.updateFolderItem?.(node.dataset.folderId, { variant: 'collapsed' });
    }
  });
}

function isDescendant(panel, node, ancestorId) {
  let current = node;
  const lookup = panel.content;
  while (current && current.dataset && current.dataset.parentId) {
    if (current.dataset.parentId === ancestorId) {
      return true;
    }
    current = lookup?.querySelector(`[data-folder-id="${current.dataset.parentId}"]`);
  }
  return false;
}

function updateFolderTreeVisibility(panel) {
  const items = panel.content?.querySelectorAll('.folder-tree-item') || [];
  items.forEach((node) => {
    if (!node.dataset || !node.dataset.parentId) {
      node.style.display = '';
      return;
    }
    const isVisible = areAncestorsExpanded(panel, node);
    node.style.display = isVisible ? '' : 'none';
  });
}

function areAncestorsExpanded(panel, node) {
  let current = node;
  const lookup = panel.content;
  while (current && current.dataset && current.dataset.parentId) {
    const parent = lookup?.querySelector(`[data-folder-id="${current.dataset.parentId}"]`);
    if (!parent) return true;
    if (parent.dataset.hasChildren === 'true' && parent.dataset.expanded !== 'true') {
      return false;
    }
    current = parent;
  }
  return true;
}

// Load tabs/sessions data
async function loadRightPanelData(panel) {
  if (!panel) return;
  
  try {
    const windows = await new Promise((resolve) => {
      chrome.windows.getAll({ populate: true }, (allWindows) => {
        resolve(allWindows || []);
      });
    });

    const currentUrl = chrome.runtime.getURL('core/main.html');

    const windowsWithTabs = windows
      .map((windowInfo) => {
        const tabs = Array.isArray(windowInfo.tabs)
          ? windowInfo.tabs.filter((tab) => tab && tab.url && !tab.url.includes(currentUrl))
          : [];

        return {
          id: windowInfo.id,
          tabs
        };
      })
      .filter((windowInfo) => windowInfo.tabs.length > 0);

    if (typeof panel.clearWindowGroups === 'function') {
      panel.clearWindowGroups();
    } else {
      panel.clearSessions?.();
    }

    if (windowsWithTabs.length === 0) return;

    for (let index = 0; index < windowsWithTabs.length; index += 1) {
      const windowInfo = windowsWithTabs[index];
      const tabs = windowInfo.tabs.map((tab) => ({
        id: tab.id,
        title: tab.title || tab.url || 'Untitled',
        url: tab.url,
        windowId: tab.windowId
      }));

      panel.addWindowGroup?.({
        id: windowInfo.id,
        label: `Window ${index + 1}`,
        tabs,
        onOpenTab: (tab) => {
          if (!tab || !tab.id) return;
          chrome.tabs.update(tab.id, { active: true });
          chrome.windows.update(windowInfo.id, { focused: true });
        },
        onSaveSession: async (windowTabs) => {
          if (!Array.isArray(windowTabs) || windowTabs.length === 0) {
            return;
          }

          if (typeof SaveTabsModal !== 'undefined') {
            await SaveTabsModal.show(windowTabs);
            await loadRightPanelData(panel);
          }
        },
        onExportSession: async (windowTabs) => {
          if (!Array.isArray(windowTabs) || windowTabs.length === 0) {
            return false;
          }

          const urls = windowTabs
            .map((tab) => tab?.url)
            .filter((url) => typeof url === 'string' && url.length > 0);

          if (urls.length === 0) {
            return false;
          }

          const payload = urls.join('\n');

          try {
            await navigator.clipboard.writeText(payload);
            return true;
          } catch (error) {
            try {
              const fallbackTextArea = document.createElement('textarea');
              fallbackTextArea.value = payload;
              fallbackTextArea.setAttribute('readonly', '');
              fallbackTextArea.style.position = 'absolute';
              fallbackTextArea.style.left = '-9999px';
              document.body.appendChild(fallbackTextArea);
              fallbackTextArea.select();
              const copied = document.execCommand('copy');
              document.body.removeChild(fallbackTextArea);
              return copied;
            } catch (fallbackError) {
              return false;
            }
          }
        }
      });
    }
  } catch (e) {
    console.error('Error loading tabs data:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Wait for bookmarks page to be ready
  setTimeout(async () => {
    const bookmarksPage = document.querySelector('.page.bookmarks-page');
    
    // Initialize left panel (Folder Tree View)
    const leftPanelContainer = document.getElementById('bmg-left-panel');
    if (leftPanelContainer && typeof createFolderTreeViewPanel !== 'undefined') {
      const leftPanel = createFolderTreeViewPanel({
        title: 'Folders',
        position: 'left',
        docked: false,
        onClose: () => leftPanel.hide()
      });
      
      leftPanelContainer.appendChild(leftPanel.element);
      
      window.folderTreeViewPanel = leftPanel;
      
      // Load folder tree data and persist visibility state when panel shows/hides
      const originalLeftShow = leftPanel.show.bind(leftPanel);
      const originalLeftHide = leftPanel.hide.bind(leftPanel);

      leftPanel.show = async function(options = {}) {
        const { persist = true } = options;
        originalLeftShow();
        loadLeftPanelData(leftPanel);
        if (window.folderTreeViewTriggerButton) {
          window.folderTreeViewTriggerButton.style.display = 'none';
        }
        if (persist && typeof LeftPanelService !== 'undefined') {
          try {
            await LeftPanelService.openPanel();
          } catch (e) {
            console.warn('Failed to persist left panel open state', e);
          }
        }
      };

      leftPanel.hide = async function(options = {}) {
        const {
          persist = true,
          clearFilter = true
        } = options;

        if (clearFilter && typeof window.clearFolderFilter === 'function') {
          window.clearFolderFilter();
        }

        originalLeftHide();

        if (window.folderTreeViewTriggerButton) {
          window.folderTreeViewTriggerButton.style.display = '';
        }

        if (persist && typeof LeftPanelService !== 'undefined') {
          try {
            await LeftPanelService.closePanel();
          } catch (e) {
            console.warn('Failed to persist left panel closed state', e);
          }
        }
      };

      // Restore persisted visibility state
      try {
        if (typeof LeftPanelService !== 'undefined') {
          const leftPanelState = await LeftPanelService.getState();
          if (leftPanelState?.isOpen) {
            await leftPanel.show({ persist: false });
          } else {
            await leftPanel.hide({ persist: false, clearFilter: false });
          }
        }
      } catch (e) {
        console.warn('Failed to restore left panel state', e);
      }
      
      // Initial load
      loadLeftPanelData(leftPanel);
      
      // Add expected close button ID for old code compatibility
      const leftCloseBtn = leftPanel.element.querySelector('.side-panel__btn');
      if (leftCloseBtn) {
        leftCloseBtn.id = 'bmg-left-panel-close-btn';
      }
      
      // Add main toggle button handler
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'bmg-left-panel-toggle';
      toggleBtn.style.display = 'none';
      toggleBtn.addEventListener('click', async () => {
        if (leftPanel.isVisible()) {
          await leftPanel.hide();
        } else {
          await leftPanel.show();
        }
      });
      leftPanel.element.appendChild(toggleBtn);
    }

    // Initialize right panel (Active Sessions)
    const rightPanelContainer = document.getElementById('bmg-right-panel');
    if (rightPanelContainer && typeof createActiveSessionsPanel !== 'undefined') {
      const rightPanel = createActiveSessionsPanel({
        title: 'Active Tabs',
        position: 'right',
        docked: false,
        onClose: () => rightPanel.hide()
      });
      
      rightPanelContainer.appendChild(rightPanel.element);
      
      window.activeSessionsPanel = rightPanel;

      let rightPanelRefreshInterval = null;
      const REFRESH_INTERVAL_MS = 2000;

      const stopRightPanelAutoRefresh = () => {
        if (rightPanelRefreshInterval) {
          clearInterval(rightPanelRefreshInterval);
          rightPanelRefreshInterval = null;
        }
      };

      const startRightPanelAutoRefresh = () => {
        stopRightPanelAutoRefresh();
        rightPanelRefreshInterval = setInterval(() => {
          if (rightPanel.isVisible()) {
            loadRightPanelData(rightPanel);
          }
        }, REFRESH_INTERVAL_MS);
      };
      
      // Load tabs data when panel shows
      const originalRightShow = rightPanel.show.bind(rightPanel);
      const originalRightHide = rightPanel.hide.bind(rightPanel);

      rightPanel.show = async function(options = {}) {
        const { persist = true } = options;
        originalRightShow();
        await loadRightPanelData(rightPanel);
        startRightPanelAutoRefresh();
        if (window.activeSessionsTriggerButton) {
          window.activeSessionsTriggerButton.style.display = 'none';
        }
        if (persist && typeof RightPanelService !== 'undefined') {
          try {
            await RightPanelService.openPanel();
          } catch (e) {
            console.warn('Failed to persist right panel open state', e);
          }
        }
      };

      rightPanel.hide = async function(options = {}) {
        const { persist = true } = options;
        originalRightHide();
        stopRightPanelAutoRefresh();
        if (window.activeSessionsTriggerButton) {
          window.activeSessionsTriggerButton.style.display = '';
        }
        if (persist && typeof RightPanelService !== 'undefined') {
          try {
            await RightPanelService.closePanel();
          } catch (e) {
            console.warn('Failed to persist right panel closed state', e);
          }
        }
      };

      // Restore persisted visibility state
      try {
        if (typeof RightPanelService !== 'undefined') {
          const rightPanelState = await RightPanelService.getState();
          if (rightPanelState?.isOpen) {
            await rightPanel.show({ persist: false });
          } else {
            await rightPanel.hide({ persist: false });
          }
        }
      } catch (e) {
        console.warn('Failed to restore right panel state', e);
      }
      
      // Initial load
      loadRightPanelData(rightPanel);

      // Refresh immediately when returning to this page with panel visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && rightPanel.isVisible()) {
          loadRightPanelData(rightPanel);
        }
      });
      
      // Add expected button IDs for old code compatibility
      const rightModeToggle = rightPanel.element.querySelector('.side-panel__btn--toggle');
      const rightCloseBtn = rightPanel.element.querySelector('.side-panel__btn--close');
      if (rightCloseBtn) {
        rightCloseBtn.id = 'bmg-right-panel-close-btn';
      }
      if (rightModeToggle) {
        rightModeToggle.id = 'bmg-right-panel-mode-toggle';
        rightModeToggle.addEventListener('click', () => {
          rightPanel.isDocked() ? (rightPanel.setFloat(), rightPanel.show()) : rightPanel.setDocked();
        });
      }
      
      // Add main toggle button handler
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'bmg-right-panel-toggle';
      toggleBtn.style.display = 'none';
      toggleBtn.addEventListener('click', async () => {
        rightPanel.isVisible() ? await rightPanel.hide() : await rightPanel.show();
      });
      rightPanel.element.appendChild(toggleBtn);
    }
  }, 100); // Wait for page to render
});
