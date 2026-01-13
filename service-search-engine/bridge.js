/**
 * Background Service Worker - Handles searches and actions
 * Simpler than before: just route searches from content scripts
 */

import SearchEngine from './shared/search-engine.js';

const engine = new SearchEngine();
const readyTabs = new Set();

/**
 * Initialize service worker
 */
function init() {
  console.log('[Bridge] Service worker initialized');

  // Listen for commands (keyboard shortcuts)
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-search') {
      handleToggleCommand();
    }
  });

  // Listen for messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Keep channel open for async
  });

  // Track tab readiness
  chrome.tabs.onRemoved.addListener((tabId) => {
    readyTabs.delete(tabId);
  });
}

/**
 * Handle keyboard shortcut
 */
async function handleToggleCommand() {
  console.log('[Bridge] Toggle command received');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    console.warn('[Bridge] No active tab');
    return;
  }

  console.log('[Bridge] Active tab:', tab.id, tab.url);

  // Skip extension pages (main.html handles its own toggle)
  if (tab.url.startsWith('chrome-extension://') || tab.url.startsWith('chrome://')) {
    console.log('[Bridge] Extension page - skipping toggle');
    return;
  }

  // Send toggle to content script
  console.log('[Bridge] Sending TOGGLE_OVERLAY to tab:', tab.id);
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Bridge] Toggle failed:', chrome.runtime.lastError.message);
    } else {
      console.log('[Bridge] Toggle sent successfully');
    }
  });
}

/**
 * Handle messages from content scripts
 */
function handleMessage(request, sender, sendResponse) {
  console.log('[Bridge] Message:', request.type, 'from:', sender.url);

  switch (request.type) {
    case 'SEARCH':
      handleSearch(request, sender, sendResponse);
      break;

    case 'EXECUTE_RESULT':
      handleExecuteResult(request, sender, sendResponse);
      break;

    case 'OPEN_SAVE_SESSION_MODAL':
      handleOpenSaveSessionModal(request, sender, sendResponse);
      break;

    case 'SAVE_TABS_AS_BOOKMARKS':
      handleSaveTabsAsBookmarks(request, sender, sendResponse);
      break;

    case 'GET_CURRENT_WINDOW_TABS':
      handleGetCurrentWindowTabs(request, sender, sendResponse);
      break;

    case 'OVERLAY_READY':
      readyTabs.add(request.tabId);
      console.log('[Bridge] Tab ready:', request.tabId, 'Total ready:', readyTabs.size);
      sendResponse({ success: true });
      break;

    default:
      console.warn('[Bridge] Unknown message type:', request.type);
      sendResponse({ error: 'Unknown message type' });
  }
}

/**
 * Handle search request from content script
 */
async function handleSearch(request, sender, sendResponse) {
  try {
    console.log('[Bridge] Search:', request.query, 'from tab:', sender.tab?.id);

    // Enrich tab data from sender if needed
    let currentTab = sender.tab;
    if (sender.tab?.id) {
      try {
        const tab = await chrome.tabs.get(sender.tab.id);
        currentTab = tab;
      } catch (error) {
        console.warn('[Bridge] Could not fetch full tab data:', error);
      }
    }

    // Use sender.tab as context (content scripts always provide this)
    const results = await engine.search(request.query, {
      currentTab: currentTab,
      isExtensionPage: false
    });

    console.log('[Bridge] Results keys:', Object.keys(results));

    sendResponse({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('[Bridge] Search error:', error);
    sendResponse({
      success: false,
      error: error.message,
      results: {}
    });
  }
}

/**
 * Handle result execution from content script
 */
async function handleExecuteResult(request, sender, sendResponse) {
  try {
    console.log('[Bridge] Execute:', request.resultType, request.resultId, 'from tab:', sender.tab?.id);

    const metadata = {
      ...request.metadata,
      currentTabId: sender.tab?.id  // Keep current tab ID separate from target tab ID
    };

    let success = false;

    // Handle different result types
    if (request.resultType === 'action') {
      // Actions use executeAction
      success = await engine.executeAction(request.resultId, metadata);
    } else if (request.resultType === 'tab' && metadata.tabId) {
      // Switch to tab - metadata.tabId is the target tab from the result item
      await chrome.tabs.update(metadata.tabId, { active: true });
      await chrome.windows.update(await chrome.tabs.get(metadata.tabId).then(t => t.windowId), { focused: true });
      success = true;
    } else if (metadata.url) {
      // Open URL (bookmarks, history, downloads, chrome:// URLs, show-more)
      await chrome.tabs.create({ url: metadata.url });
      success = true;
    } else {
      console.warn('[Bridge] Unknown result type or missing data:', request);
    }

    sendResponse({ success });
  } catch (error) {
    console.error('[Bridge] Execute error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle open save session modal request
 */
async function handleOpenSaveSessionModal(request, sender, sendResponse) {
  try {
    console.log('[Bridge] Opening save session modal');

    // Get all windows with tabs
    const windows = await chrome.windows.getAll({ populate: true });
    const mainExtensionUrl = chrome.runtime.getURL('core/main.html');
    
    // Find the focused window
    const focusedWindow = windows.find(w => w.focused);
    if (!focusedWindow) {
      console.error('[Bridge] No focused window found');
      sendResponse({ success: false, error: 'No focused window' });
      return;
    }

    // Filter tabs (exclude extension UI)
    const tabs = focusedWindow.tabs
      .filter(tab => tab.url && !tab.url.includes(mainExtensionUrl))
      .map(tab => ({
        id: tab.id,
        title: tab.title || tab.url,
        url: tab.url
      }));

    if (!tabs.length) {
      sendResponse({ success: false, error: 'No tabs to save' });
      return;
    }

    console.log('[Bridge] Found', tabs.length, 'tabs to save');

    // Store tabs in chrome.storage for main.html to access
    await chrome.storage.session.set({
      'pendingSaveSessionTabs': tabs
    });

    // Find or open main.html window
    const mainWindows = await chrome.windows.getAll();
    let mainWindow = null;
    let mainTab = null;

    // Look for existing main.html tab
    for (const w of mainWindows) {
      const tabs = await chrome.tabs.query({ windowId: w.id });
      const found = tabs.find(t => t.url && t.url.includes('core/main.html'));
      if (found) {
        mainWindow = w;
        mainTab = found;
        break;
      }
    }

    // If no main.html tab found, open it
    if (!mainTab) {
      mainTab = await chrome.tabs.create({
        url: chrome.runtime.getURL('core/main.html'),
        active: true
      });
    } else {
      // Activate existing tab
      await chrome.tabs.update(mainTab.id, { active: true });
      if (mainWindow) {
        await chrome.windows.update(mainWindow.id, { focused: true });
      }
    }

    // Send message to main.html to open the modal
    chrome.tabs.sendMessage(mainTab.id, {
      type: 'OPEN_SAVE_SESSION_MODAL',
      tabs: tabs
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Bridge] Failed to send modal message:', chrome.runtime.lastError.message);
      } else {
        console.log('[Bridge] Modal message sent successfully');
      }
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error('[Bridge] handleOpenSaveSessionModal error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Save tabs as bookmarks
 */
async function handleSaveTabsAsBookmarks(request, sender, sendResponse) {
  try {
    console.log('[Bridge] Saving tabs:', request.tabs.length, 'folder name:', request.folderName);
    
    // Create session folder in Bookmarks Bar (parentId: '1')
    const sessionFolder = await chrome.bookmarks.create({
      title: request.folderName,
      parentId: '1'
    });

    console.log('[Bridge] Created session folder:', sessionFolder.id, sessionFolder.title);

    // Save each tab as a bookmark inside the session folder
    for (const tab of request.tabs) {
      const bookmark = await chrome.bookmarks.create({
        title: tab.title,
        url: tab.url,
        parentId: sessionFolder.id
      });
      console.log('[Bridge] Created bookmark:', bookmark.title);
    }

    console.log('[Bridge] Successfully saved', request.tabs.length, 'bookmarks');
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Bridge] Save tabs error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get current window tabs for content script
 */
async function handleGetCurrentWindowTabs(request, sender, sendResponse) {
  try {
    const windows = await chrome.windows.getAll({ populate: true });
    const mainExtensionUrl = chrome.runtime.getURL('core/main.html');
    
    // Find the window containing the sender tab
    let targetWindow = null;
    if (sender.tab?.windowId) {
      targetWindow = windows.find(w => w.id === sender.tab.windowId);
    }
    
    // Fallback to focused window
    if (!targetWindow) {
      targetWindow = windows.find(w => w.focused);
    }

    if (!targetWindow) {
      sendResponse({ success: false, error: 'No window found' });
      return;
    }

    const tabs = targetWindow.tabs
      .filter(tab => tab.url && !tab.url.includes(mainExtensionUrl))
      .map(tab => ({
        id: tab.id,
        title: tab.title || tab.url,
        url: tab.url
      }));

    sendResponse({ success: true, tabs });
  } catch (error) {
    console.error('[Bridge] Get current window tabs error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Initialize on load
init();

console.log('[Bridge] Service worker ready');
