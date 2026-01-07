import ResultAggregator from './result-aggregator.js';

/**
 * service-search-engine/bridge.js
 * 
 * Background service worker message handler for the search overlay.
 * Coordinates result aggregation, action execution, and configuration management.
 */

// Debounce timer for search requests
let searchDebounceTimer = null;
let lastEligibleTabId = null;
const readyTabs = new Set();

/**
 * Initialize search overlay background handlers
 */
function initSearchOverlay() {
  // Register command listener for keyboard shortcut
  try {
    if (chrome.commands && chrome.commands.onCommand) {
      chrome.commands.onCommand.addListener((command) => {
        console.log('Chrome command received:', command);
        if (command === 'toggle-search') {
          console.log('Executing toggle-search from keyboard shortcut');
          toggleSearchOverlay();
        }
      });
      console.log('Command listener registered for toggle-search');
    }
  } catch (error) {
    console.warn('Commands API not available:', error);
  }

  // Register message listener for overlay communication
  try {
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // IMPORTANT: return the boolean from handler so Chrome keeps the message channel open
        return handleSearchMessage(request, sender, sendResponse);
      });
    }
  } catch (error) {
    console.warn('Runtime messaging not available:', error);
  }

  // Seed last eligible tab on startup
  seedLastEligibleTab();

  // Track last eligible tab (http/https) so UI pages (chrome-extension://) can still trigger overlay
  try {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
      updateLastEligibleTab(tab);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        updateLastEligibleTab(tab);
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      readyTabs.delete(tabId);
      if (lastEligibleTabId === tabId) {
        lastEligibleTabId = null;
      }
    });
  } catch (error) {
    console.warn('Tab listeners not available:', error);
  }
}

function isContentScriptEligible(url) {
  if (!url) return false;
  if (/^https?:\/\//.test(url)) return true;
  // Allow extension pages (e.g., main.html) where we manually inject the overlay
  const extPrefix = `chrome-extension://${chrome.runtime.id}/`;
  return url.startsWith(extPrefix);
}

function updateLastEligibleTab(tab) {
  if (tab && isContentScriptEligible(tab.url)) {
    lastEligibleTabId = tab.id;
  }
}

async function seedLastEligibleTab() {
  try {
    const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
    const httpTabs = tabs.filter(t => isContentScriptEligible(t.url));
    if (httpTabs.length > 0) {
      // Prefer active http tab; otherwise take most recently accessed
      const activeHttp = httpTabs.find(t => t.active);
      const chosen = activeHttp || httpTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
      lastEligibleTabId = chosen.id;
    }
  } catch (error) {
    console.warn('Failed to seed eligible tab:', error);
  }
}

/**
 * Toggle search overlay in the active tab
 */
async function toggleSearchOverlay() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const trySend = (targetTab) => {
    if (!targetTab) return false;
    // chrome.tabs.sendMessage with callback returns undefined, so no .catch() needed
    chrome.tabs.sendMessage(targetTab.id, { type: 'TOGGLE_OVERLAY' }, () => {
      if (chrome.runtime.lastError) {
        console.debug('Toggle overlay message failed:', chrome.runtime.lastError.message);
      }
    });
    lastEligibleTabId = targetTab.id;
    return true;
  };

  if (tab && isContentScriptEligible(tab.url) && readyTabs.has(tab.id)) {
    if (trySend(tab)) return;
  }

  // Fallback: if active tab is not eligible or not ready, try the last known ready tab
  if (lastEligibleTabId !== null && readyTabs.has(lastEligibleTabId)) {
    const t = await chrome.tabs.get(lastEligibleTabId).catch(() => null);
    if (t && trySend(t)) return;
  }

  // Final attempt: find any ready http/https tab now
  const tabs = await chrome.tabs.query({});
  const readyTab = tabs.find(t => readyTabs.has(t.id) && isContentScriptEligible(t.url));
  if (readyTab) {
    trySend(readyTab);
    return;
  }
}

/**
 * Handle messages from content script/overlay UI
 */
function handleSearchMessage(request, sender, sendResponse) {
  switch (request.type) {
    case 'SEARCH':
      handleSearch(request.query, sendResponse);
      return true; // Async response

    case 'EXECUTE_RESULT':
      handleExecuteResult(request, sender, sendResponse);
      return true;

    case 'WEB_SEARCH':
      handleWebSearch(request.query, sendResponse);
      return true;

    case 'OVERLAY_OPENED':
      handleOverlayOpened(sender, sendResponse);
      break;

    case 'OVERLAY_CLOSED':
      handleOverlayClosed(sender, sendResponse);
      break;

    case 'TOGGLE_OVERLAY_FROM_UI':
      toggleSearchOverlay();
      sendResponse({ success: true });
      break;

    case 'OVERLAY_READY':
      if (sender.tab && sender.tab.id !== undefined) {
        readyTabs.add(sender.tab.id);
        updateLastEligibleTab(sender.tab);
      }
      sendResponse({ success: true });
      break;

    case 'GET_SEARCH_ENGINE':
      getSearchEnginePreference(sendResponse);
      return true;

    case 'SET_SEARCH_ENGINE':
      setSearchEnginePreference(request.engine, sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

/**
 * Handle search request
 */
async function handleSearch(query, sendResponse) {
  try {
    console.log('Search request received for query:', query);
    const aggregator = new ResultAggregator();
    const results = await aggregator.aggregateResults(query || '');
    console.log('Sending search results:', results);
    sendResponse({ success: true, results });
  } catch (error) {
    console.error('Search error:', error);
    sendResponse({ success: false, error: error.message, results: {} });
  }
}

/**
 * Execute selected result action
 */
async function handleExecuteResult(request, sender, sendResponse) {
  try {
    const { resultId, action } = request;

    // Parse result ID to get metadata
    const [type, ...rest] = resultId.split('-');

    // Execute action based on type
    let success = false;

    switch (type) {
      case 'tab':
        success = await executeTabAction(resultId);
        break;

      case 'bookmark':
        success = await executeBookmarkAction(resultId, action);
        break;

      case 'history':
        success = await executeHistoryAction(resultId);
        break;

      case 'folder':
        success = await executeFolderAction(resultId);
        break;

      case 'extension':
        success = await executeExtensionAction(resultId);
        break;

      case 'download':
        success = await executeDownloadAction(resultId);
        break;

      default:
        // Handle generic actions
        success = await executeGenericAction(action, request);
    }

    sendResponse({ success });
  } catch (error) {
    console.error('Error executing result:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Execute tab-related actions
 */
async function executeTabAction(resultId) {
  const tabId = parseInt(resultId.split('-')[1]);

  if (resultId.includes('close-tab')) {
    await chrome.tabs.remove(tabId);
    return true;
  } else if (resultId.includes('close-all-except')) {
    const tab = await chrome.tabs.get(tabId);
    const allTabs = await chrome.tabs.query({ windowId: tab.windowId });
    const tabsToClose = allTabs
      .filter(t => t.id !== tabId)
      .map(t => t.id);

    await Promise.all(tabsToClose.map(id => chrome.tabs.remove(id)));
    return true;
  } else {
    // Focus tab
    await chrome.tabs.update(tabId, { active: true });
    return true;
  }
}

/**
 * Execute bookmark-related actions
 */
async function executeBookmarkAction(resultId, action) {
  const urlMatch = resultId.match(/bookmark-(.+)/);
  if (!urlMatch) return false;

  const bookmarkId = urlMatch[1];

  if (action === 'remove-from-favorites') {
    await chrome.bookmarks.remove(bookmarkId);
    return true;
  } else {
    // Open bookmark
    const bookmark = await chrome.bookmarks.get(bookmarkId);
    if (bookmark && bookmark[0] && bookmark[0].url) {
      await chrome.tabs.create({ url: bookmark[0].url });
      return true;
    }
  }

  return false;
}

/**
 * Execute history-related actions
 */
async function executeHistoryAction(resultId) {
  // Open history item
  const urlMatch = resultId.match(/history-(.+)-/);
  if (urlMatch) {
    const encodedUrl = urlMatch[1];
    try {
      const url = decodeURIComponent(encodedUrl);
      await chrome.tabs.create({ url });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Execute folder-related actions
 */
async function executeFolderAction(resultId) {
  // Open folder in new tab (could also expand inline)
  const folderId = resultId.replace('folder-', '');
  const folder = await chrome.bookmarks.getChildren(folderId);

  if (folder && folder.length > 0) {
    // For now, open all bookmarks in folder
    for (const item of folder) {
      if (item.url) {
        await chrome.tabs.create({ url: item.url });
      }
    }
    return true;
  }

  return false;
}

/**
 * Execute extension-related actions
 */
async function executeExtensionAction(resultId) {
  const extensionId = resultId.replace('ext-', '');
  const url = `chrome://extensions/?id=${extensionId}`;
  await chrome.tabs.create({ url });
  return true;
}

/**
 * Execute download-related actions
 */
async function executeDownloadAction(resultId) {
  const downloadId = parseInt(resultId.replace('download-', ''));
  const download = await chrome.downloads.search({ id: downloadId });

  if (download && download[0]) {
    // Show file in folder
    if (chrome.downloads.show) {
      chrome.downloads.show(downloadId);
    }
    return true;
  }

  return false;
}

/**
 * Execute generic actions (settings, etc.)
 */
async function executeGenericAction(action, request) {
  switch (action) {
    case 'close-tab':
      if (request.metadata?.tabId) {
        await chrome.tabs.remove(request.metadata.tabId);
        return true;
      }
      break;

    case 'close-all-except':
      if (request.metadata?.tabId) {
        const tab = await chrome.tabs.get(request.metadata.tabId);
        const allTabs = await chrome.tabs.query({ windowId: tab.windowId });
        const tabsToClose = allTabs
          .filter(t => t.id !== request.metadata.tabId)
          .map(t => t.id);
        await Promise.all(tabsToClose.map(id => chrome.tabs.remove(id)));
        return true;
      }
      break;

    case 'save-to-favorites':
      if (request.metadata?.url && request.metadata?.title) {
        await chrome.bookmarks.create({
          title: request.metadata.title,
          url: request.metadata.url
        });
        return true;
      }
      break;

    case 'remove-from-favorites':
      if (request.metadata?.bookmarkId) {
        await chrome.bookmarks.remove(request.metadata.bookmarkId);
        return true;
      }
      break;

    case 'open-history':
      await chrome.tabs.create({ url: 'chrome://history' });
      return true;

    case 'open-downloads':
      await chrome.tabs.create({ url: 'chrome://downloads' });
      return true;

    case 'open-settings':
      // Open extension settings or Chrome settings
      await chrome.tabs.create({ url: 'chrome://settings' });
      return true;

    case 'open-setting':
      // Open specific setting if available
      if (request.metadata?.settingTitle) {
        const settingMap = {
          'Clear Browsing Data': 'chrome://settings/clearBrowserData',
          'Privacy & Security Settings': 'chrome://settings/privacy',
          'Extensions': 'chrome://extensions',
          'Downloads Settings': 'chrome://settings/downloads',
          'Keyboard Shortcuts': 'chrome://extensions/shortcuts',
          'History': 'chrome://history'
        };

        const settingUrl = settingMap[request.metadata.settingTitle];
        if (settingUrl) {
          await chrome.tabs.create({ url: settingUrl });
          return true;
        }
      }
      break;

    default:
      return false;
  }

  return false;
}

/**
 * Handle web search with configured search engine
 */
async function handleWebSearch(query, sendResponse) {
  try {
    const searchEngine = await getSearchEnginePreference();
    const searchUrls = {
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      yahoo: `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`
    };

    const searchUrl = searchUrls[searchEngine] || searchUrls.google;
    await chrome.tabs.create({ url: searchUrl });

    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle overlay opened event
 */
async function handleOverlayOpened(sender, sendResponse) {
  // Could track analytics or perform setup here
  console.log('Overlay opened in tab:', sender.tab.id);
  sendResponse({ success: true });
}

/**
 * Handle overlay closed event
 */
async function handleOverlayClosed(sender, sendResponse) {
  // Could track analytics here
  console.log('Overlay closed in tab:', sender.tab.id);
  sendResponse({ success: true });
}

/**
 * Get current search engine preference
 */
async function getSearchEnginePreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['searchEngine'], (result) => {
      resolve(result.searchEngine || 'google');
    });
  });
}

/**
 * Set search engine preference
 */
async function setSearchEnginePreference(engine, sendResponse) {
  const validEngines = ['google', 'bing', 'yahoo'];
  if (!validEngines.includes(engine)) {
    sendResponse({ success: false, error: 'Invalid search engine' });
    return;
  }

  await chrome.storage.sync.set({ searchEngine: engine });
  sendResponse({ success: true });
}

/**
 * Initialize on load
 */
initSearchOverlay();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleSearch,
    handleExecuteResult,
    handleWebSearch,
    toggleSearchOverlay
  };
}
