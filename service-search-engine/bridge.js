/**
 * Background Service Worker - Handles extension-page search actions
 */

import SearchEngine from './shared/search-engine.js';

const engine = new SearchEngine();

function getMainPageUrl() {
  return chrome.runtime.getURL('core/main.html');
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function waitForMainPageLoad(tabId) {
  const mainUrl = getMainPageUrl();

  return new Promise((resolve, reject) => {
    const listener = (updatedTabId, info, updatedTab) => {
      if (updatedTabId !== tabId || info.status !== 'complete') {
        return;
      }

      if (!updatedTab?.url?.startsWith(mainUrl) && !updatedTab?.url?.startsWith('chrome://newtab/')) {
        return;
      }

      cleanup();
      resolve();
    };

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timeoutId);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for Journey page to load'));
    }, 5000);

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function toggleMainOverlayInTab(tab) {
  const mainUrl = getMainPageUrl();

  if (!tab?.id || !tab.url) {
    return false;
  }

  const isMainPageTab = tab.url.startsWith(mainUrl);
  const isOverriddenNewTab = tab.url.startsWith('chrome://newtab/');

  if (!isMainPageTab && !isOverriddenNewTab) {
    return false;
  }

  try {
    await sendMessageToTab(tab.id, { type: 'TOGGLE_MAIN_OVERLAY' });
    return true;
  } catch (error) {
    if (!isOverriddenNewTab) {
      throw error;
    }

    console.log('[Bridge] Main page not ready yet, waiting for load before toggling overlay');
    await waitForMainPageLoad(tab.id);
    await sendMessageToTab(tab.id, { type: 'TOGGLE_MAIN_OVERLAY' });
    return true;
  }
}

/**
 * Initialize service worker
 */
function init() {
  console.log('[Bridge] Service worker initialized');

  if (chrome.runtime && chrome.runtime.onUpdateAvailable) {
    chrome.runtime.onUpdateAvailable.addListener(async (details) => {
      const nextVersion = details && details.version ? String(details.version) : '';
      if (!nextVersion) return;
      try {
        await chrome.storage.local.set({ pendingUpdateVersion: nextVersion });
      } catch (error) {
        console.warn('[Bridge] Failed to persist pending update version', error);
      }
    });
  }

  // Listen for keyboard shortcut command
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-search') {
      handleToggleCommand();
    }
  });

  chrome.action.onClicked.addListener(async (tab) => {
    try {
      if (await toggleMainOverlayInTab(tab)) {
        return;
      }

      await openOrFocusMainPage({ preferCurrentTabId: tab?.id });
    } catch (error) {
      console.error('[Bridge] Failed to open main page from action click:', error);
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
  const mainUrl = getMainPageUrl();

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
 * Handle keyboard shortcut — opens the native toolbar popup
 */
async function handleToggleCommand() {
  console.log('[Bridge] Toggle command received');

  // First check if the current tab is the main Journey new tab page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      if (await toggleMainOverlayInTab(tab)) {
        return;
      }
    } catch (error) {
      console.error('[Bridge] Toggle main overlay failed:', error);
    }
  }

  // Open the native extension popup
  try {
    await chrome.action.openPopup();
    console.log('[Bridge] Opened extension popup');
  } catch (error) {
    // chrome.action.openPopup() requires user gesture in some Chrome versions;
    // silently ignore — user can also click the toolbar icon directly.
    console.warn('[Bridge] Could not open popup programmatically:', error.message);
  }
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

    case 'OPEN_MAIN_PAGE':
      openOrFocusMainPage();
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
