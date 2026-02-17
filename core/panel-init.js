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
    const root = tree[0];
    
    if (root.children) {
      // Recursively add all folders with hierarchy
      for (const folder of root.children) {
        await addFolderHierarchy(panel, folder, 0);
      }
    }
  } catch (e) {
    console.error('Error loading folder data:', e);
  }
}

// Recursively add folders and subfolders
async function addFolderHierarchy(panel, folderNode, level) {
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
  panel.addFolderItem?.({
    id: folderNode.id,
    label: folderNode.title || 'Untitled',
    variant: childFolderCount > 0 ? 'expanded' : 'flat',
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
    }
  });
  
  // Recursively add subfolders
  if (folderNode.children) {
    for (const child of folderNode.children) {
      if (!child.url) { // Only show folders, not bookmarks
        await addFolderHierarchy(panel, child, level + 1);
      }
    }
  }
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
        onClose: () => leftPanel.hide(),
        onToggleMode: () => {
          leftPanel.isDocked() ? (leftPanel.setFloat(), leftPanel.show()) : leftPanel.setDocked();
        }
      });
      
      // Position within bookmarks page if available
      if (bookmarksPage) {
        bookmarksPage.style.position = 'relative';
        bookmarksPage.insertBefore(leftPanel.element, bookmarksPage.firstChild);
      } else {
        leftPanelContainer.appendChild(leftPanel.element);
      }
      
      window.folderTreeViewPanel = leftPanel;
      
      // Load folder tree data when panel shows
      const originalLeftShow = leftPanel.show.bind(leftPanel);
      leftPanel.show = function() {
        originalLeftShow();
        loadLeftPanelData(leftPanel);
      };
      
      // Initial load
      loadLeftPanelData(leftPanel);
      
      // Add expected button IDs for old code compatibility
      const leftButtons = leftPanel.element.querySelectorAll('.side-panel__btn');
      const leftModeToggle = leftButtons[0];
      const leftCloseBtn = leftButtons[1];
      if (leftModeToggle) {
        leftModeToggle.id = 'bmg-left-panel-mode-toggle';
        leftModeToggle.addEventListener('click', () => {
          leftPanel.isDocked() ? (leftPanel.setFloat(), leftPanel.show()) : leftPanel.setDocked();
        });
      }
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
        onClose: () => rightPanel.hide(),
        onToggleMode: () => {
          rightPanel.isDocked() ? (rightPanel.setFloat(), rightPanel.show()) : rightPanel.setDocked();
        }
      });
      
      // Position within bookmarks page if available
      if (bookmarksPage) {
        bookmarksPage.style.position = 'relative';
        bookmarksPage.appendChild(rightPanel.element);
      } else {
        rightPanelContainer.appendChild(rightPanel.element);
      }
      
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
