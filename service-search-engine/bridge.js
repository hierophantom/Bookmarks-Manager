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

    // Use sender.tab as context (content scripts always provide this)
    const results = await engine.search(request.query, {
      currentTab: sender.tab,
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

// Initialize on load
init();

console.log('[Bridge] Service worker ready');
