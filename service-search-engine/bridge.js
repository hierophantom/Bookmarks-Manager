import ResultAggregator from './result-aggregator.js';

/**
 * service-search-engine/bridge.js
 * 
 * Background service worker message handler for the search overlay.
 * Coordinates result aggregation, action execution, and configuration management.
 */

// Track which tabs have overlay ready
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

  // Track tab lifecycle for overlay readiness
  try {
    chrome.tabs.onRemoved.addListener((tabId) => {
      readyTabs.delete(tabId);
      console.log('[Bridge] Tab removed:', tabId);
    });
  } catch (error) {
    console.warn('[Bridge] Tab listeners not available:', error);
  }
}

function isContentScriptEligible(url) {
  if (!url) return false;
  if (/^https?:\/\//.test(url)) return true;
  // Allow extension pages (e.g., main.html) where we manually inject the overlay
  const extPrefix = `chrome-extension://${chrome.runtime.id}/`;
  return url.startsWith(extPrefix);
}

/**
 * Toggle search overlay in the active tab only (context-aware)
 */
async function toggleSearchOverlay() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  console.log('toggleSearchOverlay: detected active tab:', { 
    id: tab?.id, 
    url: tab?.url,
    title: tab?.title 
  });

  if (!tab) {
    console.debug('No active tab found');
    return;
  }

  const isExtensionPage = (() => {
    const url = typeof tab.url === 'string' ? tab.url : '';
    const extPrefix = `chrome-extension://${chrome.runtime.id}/`;
    const isExt = url.startsWith(extPrefix);
    const isNewTabOverride = url.startsWith('chrome://newtab');
    return isExt || isNewTabOverride;
  })();
  
  console.log('toggleSearchOverlay: tab analysis:', { 
    isExtensionPage,
    url: tab.url
  });

  // If active tab is an extension page (main.html/new tab), let local handler manage shortcuts
  if (isExtensionPage) {
    console.log('toggleSearchOverlay: extension page detected; skipping background toggle');
    return;
  }

  const isReady = readyTabs.has(tab.id);
  
  console.log('toggleSearchOverlay: isReady =', isReady, 'readyTabs =', Array.from(readyTabs));
  
  // Try to send toggle even if not marked as ready (content script may be loaded but OVERLAY_READY not received)
  if (!isReady) {
    console.warn('toggleSearchOverlay: tab not marked as ready, but attempting toggle anyway');
  }

  // If active tab is http/https, send tabs message
  if (isContentScriptEligible(tab.url)) {
    console.log('toggleSearchOverlay: sending TOGGLE_OVERLAY via tabs.sendMessage to tab', tab.id);
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Toggle overlay message failed:', chrome.runtime.lastError.message);
      } else {
        console.log('Toggle overlay message sent successfully');
      }
    });
    return;
  }

  console.debug('Active tab is not eligible for overlay toggle:', tab.url);
}

/**
 * Handle messages from content script/overlay UI
 */
function handleSearchMessage(request, sender, sendResponse) {
  console.log('[Bridge] Message received:', request?.type, 'from tab:', request?.tabId || sender?.tab?.id || 'unknown');

  switch (request.type) {
    case 'SEARCH':
      handleSearch(request, sender, sendResponse);
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

    case 'OVERLAY_READY': {
      const tabId = request?.tabId;
      const isExtensionPage = request?.isExtensionPage === true;
      
      console.log('[Bridge] OVERLAY_READY:', { tabId, isExtensionPage, sender: sender?.tab?.id });

      if (tabId !== undefined) {
        readyTabs.add(tabId);
        console.log('[Bridge] Added tab to readyTabs:', tabId, 'Total ready:', readyTabs.size);
      }

      sendResponse({ success: true });
      break;
    }

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
async function handleSearch(request, sender, sendResponse) {
  try {
    const query = request && typeof request.query === 'string' ? request.query : '';
    
    console.log('[Bridge] === SEARCH START ===');
    console.log('[Bridge] Query:', query);
    console.log('[Bridge] request.tabId:', request?.tabId);
    console.log('[Bridge] request.pageUrl:', request?.pageUrl);
    console.log('[Bridge] sender.tab:', sender?.tab?.id);
    console.log('[Bridge] sender.url:', sender?.url);
    
    let contextTab = null;
    
    // PRIMARY METHOD: Use explicit tabId from request (extension pages send this)
    if (request && request.tabId !== undefined && request.tabId !== null) {
      console.log('[Bridge] Using explicit tabId from request:', request.tabId);
      try {
        contextTab = await chrome.tabs.get(request.tabId);
        console.log('[Bridge] ✓ Got tab by ID:', contextTab.id, contextTab.url);
      } catch (error) {
        console.warn('[Bridge] ✗ Failed to get tab by ID:', error.message);
      }
    }
    
    // FALLBACK 1: sender.tab (content scripts - this is the most reliable for http/https pages)
    if (!contextTab && sender?.tab?.id) {
      contextTab = sender.tab;
      console.log('[Bridge] ✓ Using sender.tab:', contextTab.id, contextTab.url);
    }
    
    // FALLBACK 2: Query for active http/https tab (last resort for extension pages)
    if (!contextTab) {
      console.log('[Bridge] No tab context found, querying for active http/https tab');
      const allTabs = await chrome.tabs.query({ active: true }).catch(() => []);
      const activeHttpTab = allTabs.find(t => t.url && /^https?:\/\//.test(t.url));
      
      if (activeHttpTab) {
        contextTab = activeHttpTab;
        console.log('[Bridge] ✓ Found active http/https tab:', contextTab.id, contextTab.url);
      } else {
        console.log('[Bridge] ✗ No active http/https tab found');
      }
    }

    if (!contextTab) {
      console.error('[Bridge] === SEARCH FAILED: No context tab ===');
      sendResponse({ 
        success: true, 
        results: {
          Actions: [{
            id: 'no-context',
            type: 'action',
            title: 'No Valid Tab Context',
            description: 'Cannot determine which tab to search from',
            icon: '⚠️',
            action: () => {}
          }]
        } 
      });
      return;
    }

    console.log('[Bridge] Using contextTab:', contextTab.id, contextTab.url);

    // Aggregate search results with this specific context
    const aggregator = new ResultAggregator();
    console.log('[Bridge] Aggregating results for:', { id: contextTab.id, url: contextTab.url, title: contextTab.title });
    let results = await aggregator.aggregateResults(query || '', { currentTab: contextTab });

    console.log('[Bridge] Aggregator returned:', { 
      resultsType: typeof results,
      keys: results ? Object.keys(results) : [],
      isEmpty: !results || Object.keys(results).length === 0
    });

    const isEmpty = !results || Object.keys(results).length === 0;
    if (isEmpty) {
      console.log('[Bridge] No results from aggregator; providing fallback actions');
      const actions = [];
      if (contextTab && contextTab.id !== undefined) {
        actions.push({
          id: 'close-current-tab',
          type: 'action',
          title: 'Close Current Tab',
          description: `Close "${contextTab.title || 'this tab'}"`,
          icon: '✕',
          metadata: { action: 'close-tab', tabId: contextTab.id }
        });
        actions.push({
          id: 'close-all-except',
          type: 'action',
          title: 'Close All Except Current',
          description: 'Close all other tabs in this window',
          icon: '⊟',
          metadata: { action: 'close-all-except', tabId: contextTab.id }
        });
      }
      actions.push({
        id: 'open-settings',
        type: 'action',
        title: 'Open Extension Settings',
        description: 'Configure extension preferences',
        icon: '⚙️',
        metadata: { action: 'open-settings' }
      });

      results = actions.length ? { Actions: actions } : {};
    }

    const responsePayload = { success: true, results };
    console.log('[Bridge] Sending response:', { 
      success: responsePayload.success, 
      resultKeys: Object.keys(responsePayload.results),
      resultCount: Object.values(responsePayload.results).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
    });
    console.log('[Bridge] === SEARCH END ===');
    
    sendResponse(responsePayload);
  } catch (error) {
    console.error('[Bridge] Search error:', error);
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
