const RightPanelService = (() => {
  const STORAGE_KEY_OPEN = 'rightPanel_isOpen';
  const STORAGE_KEY_MODE = 'rightPanel_mode'; // 'floating' or 'docked'

  /**
   * Get right panel state from storage
   */
  async function getState() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEY_OPEN, STORAGE_KEY_MODE], (result) => {
        resolve({
          isOpen: result[STORAGE_KEY_OPEN] ?? false,
          mode: result[STORAGE_KEY_MODE] ?? 'floating'
        });
      });
    });
  }

  /**
   * Save right panel state to storage
   */
  async function setState(state) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({
        [STORAGE_KEY_OPEN]: state.isOpen,
        [STORAGE_KEY_MODE]: state.mode
      }, resolve);
    });
  }

  /**
   * Get all open tabs grouped by window
   * Excludes the bookmark manager tab
   */
  async function getTabsByWindow() {
    const windows = await chrome.windows.getAll({ populate: true });
    const currentUrl = chrome.runtime.getURL('core/main.html');
    
    const windowsWithTabs = [];
    
    windows.forEach((window, index) => {
      const tabs = window.tabs
        .filter(tab => tab.url && !tab.url.includes(currentUrl)) // Exclude bookmark manager tab
        .map(tab => ({
          id: tab.id,
          title: tab.title || tab.url,
          url: tab.url,
          favIconUrl: tab.favIconUrl || null,
          active: tab.active,
          windowId: window.id
        }));

      if (tabs.length > 0) {
        windowsWithTabs.push({
          id: window.id,
          label: `Window ${windowsWithTabs.length + 1}`,
          tabs: tabs,
          focused: window.focused
        });
      }
    });

    return windowsWithTabs;
  }

  /**
   * Close a tab by ID
   */
  async function closeTab(tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Toggle panel open/closed
   */
  async function togglePanel() {
    const state = await getState();
    state.isOpen = !state.isOpen;
    await setState(state);
    return state;
  }

  /**
   * Open panel
   */
  async function openPanel() {
    const state = await getState();
    state.isOpen = true;
    await setState(state);
    return state;
  }

  /**
   * Close panel
   */
  async function closePanel() {
    const state = await getState();
    state.isOpen = false;
    await setState(state);
    return state;
  }

  /**
   * Toggle between floating and docked mode
   */
  async function toggleMode() {
    const state = await getState();
    state.mode = state.mode === 'floating' ? 'docked' : 'floating';
    await setState(state);
    return state;
  }

  return {
    getState,
    setState,
    getTabsByWindow,
    closeTab,
    togglePanel,
    openPanel,
    closePanel,
    toggleMode
  };
})();
