const RightPanelUI = (() => {
  let currentState = null;
  let onPanelToggle = null;
  let refreshInterval = null;

  /**
   * Render tabs grouped by window
   */
  async function renderTabs() {
    const panelContent = document.getElementById('bmg-right-panel-content');
    if (!panelContent) return;

    try {
      const windowsWithTabs = await RightPanelService.getTabsByWindow();

      // Clear existing content
      panelContent.innerHTML = '';

      if (windowsWithTabs.length === 0) {
        panelContent.innerHTML = '<div class="bmg-right-panel-empty">No tabs to display</div>';
        return;
      }

      // Render each window
      windowsWithTabs.forEach((window, index) => {
        const windowSection = document.createElement('div');
        windowSection.className = 'bmg-right-panel-window';
        windowSection.dataset.windowId = window.id;

        // Window header
        const windowHeader = document.createElement('div');
        windowHeader.className = 'bmg-right-panel-window-header';
        windowHeader.innerHTML = `
          <span class="bmg-right-panel-window-label">${window.label}</span>
          <span class="bmg-right-panel-tab-count">${window.tabs.length} ${window.tabs.length === 1 ? 'tab' : 'tabs'}</span>
        `;
        windowSection.appendChild(windowHeader);

        // Tabs list
        const tabsList = document.createElement('div');
        tabsList.className = 'bmg-right-panel-tabs-list';

        window.tabs.forEach(tab => {
          const tabItem = document.createElement('div');
          tabItem.className = 'bmg-right-panel-tab-item';
          tabItem.dataset.tabId = tab.id;

          // Favicon with fallback
          if (typeof FaviconService !== 'undefined' && tab.url) {
            const favicon = FaviconService.createFaviconElement(tab.url, {
              size: 16,
              className: 'bmg-right-panel-tab-favicon',
              alt: 'Favicon'
            });
            tabItem.appendChild(favicon);
          } else {
            const favicon = document.createElement('span');
            favicon.className = 'bmg-right-panel-tab-favicon';
            favicon.textContent = '📄'; // Fallback placeholder
            tabItem.appendChild(favicon);
          }

          // Tab title
          const title = document.createElement('span');
          title.className = 'bmg-right-panel-tab-title';
          title.setAttribute('dir', 'auto');
          title.textContent = tab.title;
          title.title = tab.url;
          tabItem.appendChild(title);

          // Close button
          const closeBtn = document.createElement('button');
          closeBtn.className = 'bmg-right-panel-tab-close';
          closeBtn.innerHTML = '×';
          closeBtn.title = 'Close tab';
          closeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleTabClose(tab.id);
          });
          tabItem.appendChild(closeBtn);

          tabsList.appendChild(tabItem);
        });

        windowSection.appendChild(tabsList);

        // Add save window button
        const windowFooter = document.createElement('div');
        windowFooter.className = 'bmg-right-panel-window-footer';
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'bmg-right-panel-save-window-btn';
        saveBtn.innerHTML = `💾 Save Window ${index + 1}`;
        saveBtn.title = `Save this window's tabs`;
        saveBtn.dataset.windowId = window.id;
        saveBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await handleSaveWindow(window.id);
        });
        windowFooter.appendChild(saveBtn);
        
        windowSection.appendChild(windowFooter);
        panelContent.appendChild(windowSection);
      });
    } catch (e) {
      console.error('Error rendering tabs:', e);
      panelContent.innerHTML = '<div class="bmg-right-panel-error">Error loading tabs</div>';
    }
  }

  /**
   * Handle tab close
   */
  async function handleTabClose(tabId) {
    try {
      await RightPanelService.closeTab(tabId);
      await renderTabs();
    } catch (e) {
      console.error('Error closing tab:', e);
    }
  }

  /**
   * Handle save window session button
   */
  async function handleSaveWindow(windowId) {
    try {
      const windowsWithTabs = await RightPanelService.getTabsByWindow();
      
      // Find the specific window
      const targetWindow = windowsWithTabs.find(w => w.id === windowId);
      
      if (!targetWindow || targetWindow.tabs.length === 0) {
        await Modal.openNotice({
          title: 'No Tabs to Save',
          message: 'No tabs to save in this window.'
        });
        return;
      }

      // Open the save tabs modal with this window's tabs
      if (typeof SaveTabsModal !== 'undefined') {
        await SaveTabsModal.show(targetWindow.tabs);
        await renderTabs(); // Refresh after save
      } else {
        console.error('SaveTabsModal not loaded');
        await Modal.openError({
          title: 'Modal Unavailable',
          message: 'Save tabs modal not available.'
        });
      }
    } catch (e) {
      console.error('Error saving window session:', e);
      await Modal.openError({
        title: 'Save Failed',
        message: 'Failed to save window session.'
      });
    }
  }

  /**
   * Initialize the right panel UI
   */
  async function init(options = {}) {
    onPanelToggle = options.onPanelToggle || null;

    try {
      currentState = await RightPanelService.getState();

      const panel = document.getElementById('bmg-right-panel');
      if (!panel) {
        console.error('Right panel container not found');
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

      // Render initial tabs
      await renderTabs();

      // Setup event listeners
      setupEventListeners();

      // Auto-refresh tabs every 2 seconds when panel is open
      startAutoRefresh();
    } catch (e) {
      console.error('Error initializing right panel:', e);
    }
  }

  /**
   * Setup event listeners for panel controls
   */
  function setupEventListeners() {
    const modeBtn = document.getElementById('bmg-right-panel-mode-toggle');
    if (modeBtn) {
      modeBtn.addEventListener('click', handleModeToggle);
    }

    const closeBtn = document.getElementById('bmg-right-panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', handleCloseButtonClick);
    }
  }

  /**
   * Handle panel toggle
   */
  async function handlePanelToggle() {
    try {
      const state = await RightPanelService.togglePanel();
      const panel = document.getElementById('bmg-right-panel');

      if (state.isOpen) {
        panel.classList.add('open');
        await renderTabs();
        startAutoRefresh();
      } else {
        panel.classList.remove('open');
        stopAutoRefresh();
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
      const state = await RightPanelService.toggleMode();
      const panel = document.getElementById('bmg-right-panel');

      panel.classList.remove('floating', 'docked');
      panel.classList.add(state.mode);
    } catch (e) {
      console.error('Error toggling mode:', e);
    }
  }

  /**
   * Handle close button (switches mode or closes)
   */
  async function handleCloseButtonClick() {
    try {
      const state = await RightPanelService.getState();
      
      if (state.mode === 'docked') {
        // If docked, switch to floating mode
        await RightPanelService.toggleMode();
        currentState = await RightPanelService.getState();
        const panel = document.getElementById('bmg-right-panel');
        panel.classList.remove('floating', 'docked');
        panel.classList.add(currentState.mode);
      } else {
        // If floating, close the panel
        await handlePanelToggle();
      }
    } catch (e) {
      console.error('Error handling close button:', e);
    }
  }

  /**
   * Start auto-refresh interval
   */
  function startAutoRefresh() {
    if (refreshInterval) return; // Already running
    
    refreshInterval = setInterval(async () => {
      const state = await RightPanelService.getState();
      if (state.isOpen) {
        await renderTabs();
      }
    }, 2000); // Refresh every 2 seconds
  }

  /**
   * Stop auto-refresh interval
   */
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  /**
   * Refresh tabs manually
   */
  async function refresh() {
    await renderTabs();
  }

  return {
    init,
    handlePanelToggle,
    refresh
  };
})();
