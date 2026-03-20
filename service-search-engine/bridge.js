/**
 * Background Service Worker - Handles extension-page search actions
 */

import SearchEngine from './shared/search-engine.js';

const engine = new SearchEngine();

/**
 * Initialize service worker
 */
function init() {
  console.log('[Bridge] Service worker initialized');

  chrome.action.onClicked.addListener(async (tab) => {
    try {
      await openOrFocusMainPage({ preferCurrentTabId: tab?.id });
    } catch (error) {
      console.error('[Bridge] Failed to open main page from action click:', error);
    }
  });

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

}

async function openOrFocusMainPage(options = {}) {
  const { preferCurrentTabId = null } = options;
  const mainUrl = chrome.runtime.getURL('core/main.html');

  if (preferCurrentTabId) {
    try {
      const preferredTab = await chrome.tabs.get(preferCurrentTabId);
      if (preferredTab?.url && preferredTab.url.startsWith('chrome://newtab/')) {
        return await chrome.tabs.update(preferCurrentTabId, { url: mainUrl, active: true });
      }
    } catch (error) {
      console.warn('[Bridge] Preferred tab lookup failed:', error);
    }
  }

  const existingTabs = await chrome.tabs.query({});
  const existingTab = existingTabs.find((tab) => tab.url && tab.url.startsWith(mainUrl));

  if (existingTab) {
    await chrome.tabs.update(existingTab.id, { active: true });
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    return existingTab;
  }

  const createdTab = await chrome.tabs.create({
    url: mainUrl,
    active: true
  });

  if (createdTab?.windowId) {
    await chrome.windows.update(createdTab.windowId, { focused: true });
  }

  return createdTab;
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

  // Extension pages (main.html) should toggle via runtime message
  if (tab.url.startsWith('chrome-extension://')) {
    console.log('[Bridge] Extension page - sending TOGGLE_MAIN_OVERLAY');
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_MAIN_OVERLAY' }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Bridge] Toggle main overlay failed:', chrome.runtime.lastError.message);
      }
    });
    return;
  }
  if (tab.url.startsWith('chrome://newtab/')) {
    console.log('[Bridge] Chrome newtab - opening extension main.html');
    const mainUrl = chrome.runtime.getURL('core/main.html');
    const listener = (tabId, info) => {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_MAIN_OVERLAY' }, () => {
          if (chrome.runtime.lastError) {
            console.error('[Bridge] Toggle main overlay failed:', chrome.runtime.lastError.message);
          }
        });
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.update(tab.id, { url: mainUrl }, () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.onUpdated.removeListener(listener);
        console.error('[Bridge] Failed to open main.html:', chrome.runtime.lastError.message);
      }
    });
    return;
  }
  if (tab.url.startsWith('chrome://')) {
    console.log('[Bridge] Chrome page - skipping toggle');
    return;
  }

  console.log('[Bridge] Non-extension page - skipping toggle');
}

/**
 * Handle runtime messages
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

    case 'TOGGLE_OVERLAY_FROM_UI':
      handleToggleCommand();
      sendResponse({ success: true });
      break;

    default:
      console.warn('[Bridge] Unknown message type:', request.type);
      sendResponse({ error: 'Unknown message type' });
  }
}

/**
 * Handle search request
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

    // Use sender.tab as context
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
 * Handle result execution request
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

// Initialize on load
init();

console.log('[Bridge] Service worker ready');
