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

function isExtensionOrNewTab(url) {
  if (!url) return false;
  const extPrefix = `chrome-extension://${chrome.runtime.id}/`;
  return url.startsWith(extPrefix) || url.startsWith('chrome://newtab');
}

function updateLastEligibleTab(tab) {
  // Only track http/https tabs, never extension/newtab pages
  if (tab && tab.url && /^https?:\/\//.test(tab.url)) {
    lastEligibleTabId = tab.id;
    console.log('updateLastEligibleTab:', tab.id, tab.url);
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
  
  console.log('toggleSearchOverlay: isReady =', isReady);
  
  // Only toggle if the active tab is ready
  if (!isReady) {
    console.debug('Active tab is not ready for overlay toggle:', tab.url);
    return;
  }

  // If active tab is http/https, send tabs message
  if (isContentScriptEligible(tab.url)) {
    console.log('toggleSearchOverlay: sending TOGGLE_OVERLAY via tabs.sendMessage to tab', tab.id);
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, () => {
      if (chrome.runtime.lastError) {
        console.debug('Toggle overlay message failed:', chrome.runtime.lastError.message);
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
      const hintedTabId = request && request.tabId !== undefined ? request.tabId : undefined;
      const tabFromSender = sender && sender.tab && sender.tab.id !== undefined ? sender.tab : undefined;
      const tabId = tabFromSender ? tabFromSender.id : hintedTabId;
      const isExtPage = request && request.isExtensionPage === true;

      console.log('OVERLAY_READY received:', {
        senderTab: tabFromSender ? { id: tabFromSender.id, url: tabFromSender.url } : null,
        hintedTabId,
        isExtPage,
        readyTabs: Array.from(readyTabs)
      });

      if (tabId !== undefined) {
        readyTabs.add(tabId);
        // Only update lastEligibleTab for http/https pages, not extension pages
        if (!isExtPage) {
          if (tabFromSender) {
            updateLastEligibleTab(tabFromSender);
          } else if (hintedTabId) {
            chrome.tabs.get(hintedTabId).then((t) => updateLastEligibleTab(t)).catch(() => {});
          }
        }
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
    
    console.log('=== SEARCH DEBUG START ===');
    console.log('Query:', query);
    console.log('sender.tab:', sender?.tab ? { id: sender.tab.id, url: sender.tab.url, title: sender.tab.title } : 'MISSING');
    console.log('sender.url:', sender?.url);
    console.log('sender.origin:', sender?.origin);
    console.log('request.pageUrl:', request?.pageUrl);
    console.log('request.tabId:', request?.tabId);
    
    // STRICT RULE: Find the actual tab that sent this search
    let contextTab = null;
    
    // Method 1: sender.tab exists (rare for runtime.sendMessage from content scripts)
    if (sender && sender.tab && sender.tab.id !== undefined) {
      const tabUrl = sender.tab.url || '';
      const isHttpHttps = /^https?:\/\//.test(tabUrl);
      
      console.log('Method 1: sender.tab exists:', {
        id: sender.tab.id,
        url: tabUrl,
        isHttpHttps
      });
      
      if (isHttpHttps) {
        contextTab = sender.tab;
        console.log('✓ Using sender.tab as contextTab');
      }
    }
    
    // Method 2: sender.url exists (content script sent via runtime.sendMessage)
    if (!contextTab && sender && sender.url) {
      const senderUrl = sender.url;
      const isHttpHttps = /^https?:\/\//.test(senderUrl);
      
      console.log('Method 2: sender.url exists:', senderUrl, 'isHttpHttps:', isHttpHttps);
      
      if (isHttpHttps) {
        // Find the tab matching this URL
        const allTabs = await chrome.tabs.query({}).catch(() => []);
        const matchingTab = allTabs.find(t => t.url === senderUrl);
        
        if (matchingTab) {
          contextTab = matchingTab;
          console.log('✓ Found matching tab for sender.url:', matchingTab.id, matchingTab.url);
        } else {
          console.log('✗ No tab found matching sender.url');
        }
      }
    }
    
    // Method 3: request.pageUrl exists (fallback)
    if (!contextTab && request && request.pageUrl) {
      const pageUrl = request.pageUrl;
      const isHttpHttps = /^https?:\/\//.test(pageUrl);
      
      console.log('Method 3: request.pageUrl exists:', pageUrl, 'isHttpHttps:', isHttpHttps);
      
      if (isHttpHttps) {
        // Query all tabs and find one matching this URL
        const allTabs = await chrome.tabs.query({}).catch(() => []);
        console.log('Method 3: Querying all tabs, found:', allTabs.length);
        const matchingTab = allTabs.find(t => t.url === pageUrl);
        
        if (matchingTab) {
          contextTab = matchingTab;
          console.log('✓ Found matching tab for request.pageUrl:', matchingTab.id, matchingTab.url);
        } else {
          // Try partial URL match (domain level)
          console.log('Method 3: Exact URL match failed, trying domain match');
          try {
            const pageUrlObj = new URL(pageUrl);
            const pageDomain = pageUrlObj.hostname;
            const domainMatchTab = allTabs.find(t => {
              if (!t.url) return false;
              try {
                const tabUrlObj = new URL(t.url);
                return tabUrlObj.hostname === pageDomain;
              } catch {
                return false;
              }
            });
            
            if (domainMatchTab) {
              contextTab = domainMatchTab;
              console.log('✓ Found domain-matching tab for request.pageUrl:', domainMatchTab.id, domainMatchTab.url);
            } else {
              console.log('✗ No tab found matching request.pageUrl or domain');
            }
          } catch (e) {
            console.log('✗ Failed to parse pageUrl for domain match:', e);
          }
        }
      }
    }
    
    // Method 4: Extension page search - find active http/https tab
    if (!contextTab) {
      const isExtensionSearch = sender?.url?.startsWith('chrome-extension://') || 
                               request?.pageUrl?.startsWith('chrome-extension://');
      
      console.log('Method 4: Extension page search?', isExtensionSearch);
      
      if (isExtensionSearch) {
        const allTabs = await chrome.tabs.query({ active: true }).catch(() => []);
        console.log('Active tabs found:', allTabs.length, allTabs.map(t => ({ id: t.id, url: t.url })));
        
        const activeHttpTab = allTabs.find(t => t.url && /^https?:\/\//.test(t.url));
        if (activeHttpTab) {
          contextTab = activeHttpTab;
          console.log('✓ Found active http/https tab for extension search:', activeHttpTab.id, activeHttpTab.url);
        }
      }
    }

    if (!contextTab) {
      console.error('=== SEARCH FAILED: No valid contextTab ===');
      sendResponse({ success: true, results: {
        Actions: [{
          id: 'no-context',
          type: 'action',
          title: 'No Valid Tab Context',
          description: 'Search requires an active http/https tab',
          icon: '⚠️',
          metadata: { action: 'open-settings' }
        }]
      }});
      return;
    }

    const aggregator = new ResultAggregator();
    console.log('Using contextTab for aggregation:', { id: contextTab.id, url: contextTab.url, title: contextTab.title });
    let results = await aggregator.aggregateResults(query || '', { currentTab: contextTab });

    console.log('Aggregator returned keys:', results ? Object.keys(results) : []);
    console.log('=== SEARCH DEBUG END ===');

    const isEmpty = !results || Object.keys(results).length === 0;
    if (isEmpty) {
      console.log('No results from aggregator; providing minimal fallback actions');
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
