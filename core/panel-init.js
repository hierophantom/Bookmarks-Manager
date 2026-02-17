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
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        resolve(tabs || []);
      });
    });
    
    if (!tabs || tabs.length === 0) return;
    
    panel.clearSessions?.();
    
    // Group tabs by window
    const tabsByWindow = {};
    for (const tab of tabs) {
      const windowId = tab.windowId;
      if (!tabsByWindow[windowId]) {
        tabsByWindow[windowId] = [];
      }
      tabsByWindow[windowId].push(tab);
    }
    
    // Add sessions for each window
    for (const [windowId, windowTabs] of Object.entries(tabsByWindow)) {
      for (const tab of windowTabs.slice(0, 5)) {
        panel.addSession?.({
          id: tab.id.toString(),
          label: tab.title || tab.url || 'Untitled',
          onView: () => {
            chrome.tabs.update(tab.id, { active: true });
            chrome.windows.update(parseInt(windowId), { focused: true });
          }
        });
      }
      
      if (windowTabs.length > 5) {
        panel.addSession?.({
          id: `more-${windowId}`,
          label: `+${windowTabs.length - 5} more tabs`,
          onView: null
        });
      }
    }
  } catch (e) {
    console.error('Error loading tabs data:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Wait for bookmarks page to be ready
  setTimeout(() => {
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
      
      // Load folder tree data when panel shows
      const originalLeftShow = leftPanel.show.bind(leftPanel);
      leftPanel.show = function() {
        originalLeftShow();
        loadLeftPanelData(leftPanel);
      };
      
      // Initial load
      loadLeftPanelData(leftPanel);
      
      // Add expected close button ID for old code compatibility
      const leftCloseBtn = leftPanel.element.querySelector('.side-panel__btn');
      if (leftCloseBtn) {
        leftCloseBtn.id = 'bmg-left-panel-close-btn';
        leftCloseBtn.addEventListener('click', () => {
          // Clear folder filter when closing panel
          if (typeof window.clearFolderFilter === 'function') {
            window.clearFolderFilter();
          }
          leftPanel.hide();
          if (window.folderTreeViewTriggerButton) {
            window.folderTreeViewTriggerButton.style.display = '';
          }
        });
      }
      
      // Add main toggle button handler
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'bmg-left-panel-toggle';
      toggleBtn.style.display = 'none';
      toggleBtn.addEventListener('click', () => {
        if (leftPanel.isVisible()) {
          // Clear folder filter when closing panel
          if (typeof window.clearFolderFilter === 'function') {
            window.clearFolderFilter();
          }
          leftPanel.hide();
        } else {
          leftPanel.show();
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
      
      // Load tabs data when panel shows
      const originalRightShow = rightPanel.show.bind(rightPanel);
      rightPanel.show = function() {
        originalRightShow();
        loadRightPanelData(rightPanel);
      };
      
      // Initial load
      loadRightPanelData(rightPanel);
      
      // Add expected button IDs for old code compatibility
      const rightButtons = rightPanel.element.querySelectorAll('.side-panel__btn');
      const rightModeToggle = rightButtons[0];
      const rightCloseBtn = rightButtons[1];
      if (rightModeToggle) {
        rightModeToggle.id = 'bmg-right-panel-mode-toggle';
        rightModeToggle.addEventListener('click', () => {
          rightPanel.isDocked() ? (rightPanel.setFloat(), rightPanel.show()) : rightPanel.setDocked();
        });
      }
      if (rightCloseBtn) {
        rightCloseBtn.id = 'bmg-right-panel-close-btn';
        rightCloseBtn.addEventListener('click', () => {
          rightPanel.hide();
          if (window.activeSessionsTriggerButton) {
            window.activeSessionsTriggerButton.style.display = '';
          }
        });
      }
      
      // Add main toggle button handler
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'bmg-right-panel-toggle';
      toggleBtn.style.display = 'none';
      toggleBtn.addEventListener('click', () => {
        rightPanel.isVisible() ? rightPanel.hide() : rightPanel.show();
      });
      rightPanel.element.appendChild(toggleBtn);
    }
  }, 100); // Wait for page to render
});
