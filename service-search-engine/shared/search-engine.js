/**
 * Shared Search Engine - Unified search across multiple data sources
 * Used by both main.html overlay and content script overlays
 */

export class SearchEngine {
  constructor() {
    this.searchSources = {
      bookmarks: { name: 'Bookmarks', icon: '🔖', weight: 3 },
      history: { name: 'History', icon: '⏱️', weight: 2 },
      tabs: { name: 'Tabs', icon: '📑', weight: 3 },
      downloads: { name: 'Downloads', icon: '⬇️', weight: 1 },
      actions: { name: 'Actions', icon: '⚡', weight: 2 },
      chromeSettings: { name: 'Chrome Settings', icon: '⚙️', weight: 2 },
      extensions: { name: 'Extensions', icon: '🧩', weight: 2 },
      calculator: { name: 'Calculator', icon: '🔢', weight: 3 }
    };
    
    // Try to load math.js if available
    this.mathLoaded = false;
    this.loadMathLib();
  }

  async loadMathLib() {
    try {
      // Check if math.js is already loaded globally
      if (typeof math !== 'undefined') {
        this.mathLoaded = true;
        return;
      }
      
      // Try to import math.js
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('service-search-engine/shared/math.min.js');
      script.onload = () => {
        this.mathLoaded = true;
        console.log('[SearchEngine] Math.js loaded successfully');
      };
      script.onerror = () => {
        console.warn('[SearchEngine] Failed to load math.js');
      };
      
      if (document.head) {
        document.head.appendChild(script);
      }
    } catch (error) {
      console.warn('[SearchEngine] Math.js loading error:', error);
    }
  }

  /**
   * Main search function - aggregates results from all sources
   * @param {string} query - Search query
   * @param {Object} context - { currentTab, isExtensionPage }
   * @returns {Object} - Results grouped by category
   */
  async search(query, context = {}) {
    if (!query || query.trim() === '') {
      return await this.getDefaultResults(context);
    }

    const results = {};
    const normalizedQuery = query.toLowerCase().trim();

    // Check for calculator first
    const calcResult = this.evaluateCalculator(query);
    if (calcResult !== null) {
      results.Calculator = [{
        id: 'calc-' + Date.now(),
        type: 'calculator',
        title: String(calcResult),
        description: `${query} = ${calcResult}`,
        icon: '🔢',
        value: String(calcResult)
      }];
    }

    // Search each source
    const [bookmarks, history, tabs, downloads, chromeSettings, extensions] = await Promise.all([
      this.searchBookmarks(normalizedQuery),
      this.searchHistory(normalizedQuery),
      this.searchTabs(normalizedQuery),
      this.searchDownloads(normalizedQuery),
      this.searchChromeSettings(normalizedQuery),
      this.searchExtensions(normalizedQuery)
    ]);

    if (bookmarks.length > 0) results.Bookmarks = bookmarks;
    if (history.length > 0) results.History = history;
    if (tabs.length > 0) results.Tabs = tabs;
    if (downloads.length > 0) results.Downloads = downloads;
    if (chromeSettings.length > 0) results['Chrome Settings'] = chromeSettings;
    if (extensions.length > 0) results.Extensions = extensions;

    // Always include relevant actions
    results.Actions = this.getActions(query, context);

    return results;
  }

  /**
   * Get default results when query is empty
   */
  async getDefaultResults(context) {
    const [tabs, history] = await Promise.all([
      this.searchTabs(''),
      this.searchHistory('')
    ]);

    return {
      Actions: this.getActions('', context),
      Tabs: tabs,
      History: history.slice(0, 5) // Limit to 5 recent
    };
  }

  /**
   * Search bookmarks
   */
  async searchBookmarks(query) {
    try {
      const results = [];
      const bookmarks = await chrome.bookmarks.search({ query });

      // Filter to only bookmarks with URLs, limit to 10
      for (const bm of bookmarks.slice(0, 10)) {
        if (bm.url) {
          results.push({
            id: `bookmark-${bm.id}`,
            type: 'bookmark',
            title: bm.title || bm.url,
            description: bm.url,
            url: bm.url,
            icon: '🔖'
          });
        }
      }
      return results;
    } catch (error) {
      console.warn('Bookmark search failed:', error);
      return [];
    }
  }

  /**
   * Search history
   */
  async searchHistory(query) {
    try {
      const results = [];
      const history = await chrome.history.search({
        text: query,
        maxResults: 5
      });

      for (const item of history) {
        results.push({
          id: `history-${item.id}`,
          type: 'history',
          title: item.title || item.url,
          description: item.url,
          url: item.url,
          icon: '⏱️'
        });
      }
      return results;
    } catch (error) {
      console.warn('History search failed:', error);
      return [];
    }
  }

  /**
   * Search open tabs
   */
  async searchTabs(query) {
    try {
      const results = [];
      const tabs = await chrome.tabs.query({});

      // Filter tabs by title or URL
      const filtered = tabs.filter(tab =>
        (tab.title && tab.title.toLowerCase().includes(query)) ||
        (tab.url && tab.url.toLowerCase().includes(query))
      ).slice(0, 5);

      for (const tab of filtered) {
        results.push({
          id: `tab-${tab.id}`,
          type: 'tab',
          title: tab.title || 'Untitled',
          description: tab.url,
          url: tab.url,
          tabId: tab.id,
          icon: '📑'
        });
      }
      return results;
    } catch (error) {
      console.warn('Tab search failed:', error);
      return [];
    }
  }

  /**
   * Search downloads
   */
  async searchDownloads(query) {
    try {
      const results = [];
      const downloads = await chrome.downloads.search({ query: query ? [query] : [] });

      for (const dl of downloads.slice(0, 5)) {
        results.push({
          id: `download-${dl.id}`,
          type: 'download',
          title: dl.filename.split('/').pop(),
          description: dl.filename,
          url: dl.url,
          icon: '⬇️'
        });
      }
      return results;
    } catch (error) {
      console.warn('Download search failed:', error);
      return [];
    }
  }

  /**
   * Get context-aware actions
   */
  getActions(query, context = {}) {
    const actions = [];

    // Always available
    actions.push({
      id: 'action-new-tab',
      type: 'action',
      title: 'New Tab',
      description: 'Open new tab',
      icon: '➕',
      action: 'new-tab'
    });

    actions.push({
      id: 'action-new-window',
      type: 'action',
      title: 'New Window',
      description: 'Open new window',
      icon: '🪟',
      action: 'new-window'
    });

    // Context-specific
    if (context.currentTab && context.currentTab.id) {
      actions.push({
        id: 'action-close-tab',
        type: 'action',
        title: 'Close Current Tab',
        description: `Close "${context.currentTab.title || 'this tab'}"`,
        icon: '✕',
        action: 'close-tab',
        tabId: context.currentTab.id
      });
    }

    // If query looks like a URL, add web search
    if (query && !query.includes(' ')) {
      actions.push({
        id: 'action-web-search',
        type: 'action',
        title: `Search "${query}"`,
        description: 'Search the web',
        icon: '🔍',
        action: 'web-search',
        query: query
      });
    }

    return actions;
  }

  /**
   * Search Chrome Settings
   */
  async searchChromeSettings(query) {
    const settings = [
      { name: 'Settings', url: 'chrome://settings', keywords: ['setting', 'preferences', 'config', 'options'] },
      { name: 'Extensions', url: 'chrome://extensions', keywords: ['extension', 'addon', 'plugin'] },
      { name: 'Downloads', url: 'chrome://downloads', keywords: ['download', 'file'] },
      { name: 'History', url: 'chrome://history', keywords: ['history', 'visited'] },
      { name: 'Bookmarks', url: 'chrome://bookmarks', keywords: ['bookmark', 'favorite'] },
      { name: 'Flags', url: 'chrome://flags', keywords: ['flag', 'experiment', 'feature'] },
      { name: 'Version', url: 'chrome://version', keywords: ['version', 'about', 'info'] },
      { name: 'Clear Browsing Data', url: 'chrome://settings/clearBrowserData', keywords: ['clear', 'cache', 'cookie', 'data'] }
    ];

    const results = [];
    const normalizedQuery = query.toLowerCase();

    for (const setting of settings) {
      const matchesName = setting.name.toLowerCase().includes(normalizedQuery);
      const matchesKeywords = setting.keywords.some(k => k.includes(normalizedQuery));
      
      if (matchesName || matchesKeywords) {
        results.push({
          id: `chrome-setting-${setting.url}`,
          type: 'chrome-setting',
          title: setting.name,
          description: setting.url,
          url: setting.url,
          icon: '⚙️'
        });
      }
    }

    return results;
  }

  /**
   * Search Installed Extensions
   */
  async searchExtensions(query) {
    try {
      const extensions = await chrome.management.getAll();
      const results = [];
      const normalizedQuery = query.toLowerCase();

      for (const ext of extensions) {
        if (ext.type !== 'extension') continue;
        
        const matchesName = ext.name.toLowerCase().includes(normalizedQuery);
        const matchesDesc = ext.description && ext.description.toLowerCase().includes(normalizedQuery);
        
        if (matchesName || matchesDesc) {
          results.push({
            id: `extension-${ext.id}`,
            type: 'extension',
            title: ext.name,
            description: ext.description || 'Chrome Extension',
            url: `chrome://extensions/?id=${ext.id}`,
            icon: '🧩',
            extensionId: ext.id
          });
        }
      }

      return results.slice(0, 5);
    } catch (error) {
      console.warn('Extension search failed:', error);
      return [];
    }
  }

  /**
   * Evaluate calculator expression
   */
  evaluateCalculator(input) {
    if (!input || typeof input !== 'string') return null;
    
    // Remove whitespace
    input = input.replace(/\s+/g, '');
    
    // Early return checks for invalid inputs
    if (input.includes('()')) return null;
    if (input.match(/\(\s*\)/)) return null;
    if (!/[-+/*().\d]/.test(input)) return null;

    try {
      // Check if math.js is available
      if (typeof math === 'undefined' || !math || !math.evaluate) {
        // Fallback to basic eval for simple expressions
        if (/^[\d\s+\-*/.()]+$/.test(input)) {
          const result = Function('"use strict"; return (' + input + ')')();
          if (!Number.isFinite(result)) return null;
          return Math.round(result * 1e8) / 1e8;
        }
        return null;
      }

      // Use math.js to evaluate the expression
      const result = math.evaluate(input);
      
      // Return null if result is not finite
      if (!Number.isFinite(result)) {
        return null;
      }
      
      // Round to 8 decimal places to avoid floating point issues
      return Math.round(result * 1e8) / 1e8;
    } catch (e) {
      console.warn('Calculator error:', e);
      return null;
    }
  }

  /**
   * Execute an action
   */
  async executeAction(actionId, metadata = {}) {
    // Extract action type: 'action-new-tab' -> 'new-tab'
    const action = actionId.replace('action-', '');
    console.log('[SearchEngine] Executing action:', action, 'from ID:', actionId);

    try {
      switch (action) {
        case 'new-tab':
          await chrome.tabs.create({});
          return true;

        case 'new-window':
          await chrome.windows.create({});
          return true;

        case 'close-tab':
          if (metadata.currentTabId) {
            await chrome.tabs.remove(metadata.currentTabId);
            return true;
          }
          return false;

        case 'web-search':
          const query = encodeURIComponent(metadata.query || '');
          await chrome.tabs.create({
            url: `https://www.google.com/search?q=${query}`
          });
          return true;

        default:
          console.warn('Unknown action:', action);
          return false;
      }
    } catch (error) {
      console.error('Action execution failed:', error);
      return false;
    }
  }
}

export default SearchEngine;
