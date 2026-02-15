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
  }

  async getTagsApi() {
    if (typeof TagsService !== 'undefined') {
      return {
        getAllTags: () => TagsService.getAllTags(),
        findBookmarksByTag: (tag) => TagsService.findBookmarksByTag(tag),
        getTags: (id) => TagsService.getTags(id)
      };
    }
    // Fallback for contexts without TagsService (e.g., content/background)
    const loadAll = async () => {
      const data = await chrome.storage.local.get('bookmarkTags');
      return data && data.bookmarkTags ? data.bookmarkTags : {};
    };
    return {
      getAllTags: async () => {
        const all = await loadAll();
        const set = new Set();
        Object.values(all).forEach(arr => {
          if (Array.isArray(arr)) arr.forEach(t => set.add(t));
        });
        return Array.from(set).sort();
      },
      findBookmarksByTag: async (tag) => {
        const all = await loadAll();
        return Object.keys(all).filter(id => Array.isArray(all[id]) && all[id].includes(tag));
      },
      getTags: async (id) => {
        const all = await loadAll();
        return all[id] || [];
      }
    };
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
    const [bookmarks, history, tabs, downloads, chromeSettings, extensions, tags] = await Promise.all([
      this.searchBookmarks(normalizedQuery),
      this.searchHistory(normalizedQuery),
      this.searchTabs(normalizedQuery),
      this.searchDownloads(normalizedQuery),
      this.searchChromeSettings(normalizedQuery),
      this.searchExtensions(normalizedQuery),
      this.searchTags(normalizedQuery)
    ]);

    if (bookmarks.length > 0) results.Bookmarks = bookmarks;
    if (tags.length > 0) results.Tags = tags;
    if (history.length > 0) results.History = history;
    if (tabs.length > 0) results.Tabs = tabs;
    if (downloads.length > 0) results.Downloads = downloads;
    if (chromeSettings.length > 0) results['Chrome Settings'] = chromeSettings;
    if (extensions.length > 0) results.Extensions = extensions;

    // Always include relevant actions
    results.Actions = await this.getActions(query, context);

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
      Actions: await this.getActions('', context),
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
        if (!bm.url) continue;
        results.push({
          id: `bookmark-${bm.id}`,
          type: 'bookmark',
          title: bm.title || bm.url,
          description: bm.url,
          url: bm.url,
          icon: '🔖',
          metadata: { bookmarkId: bm.id }
        });
      }
      return results;
    } catch (error) {
      console.warn('Bookmark search failed:', error);
      return [];
    }
  }

  /**
   * Search tags
   */
  async searchTags(query) {
    try {
      const results = [];
      const tagsApi = await this.getTagsApi();
      if (!tagsApi || !query) return results;

      // Find tags matching the query
      const allTags = await tagsApi.getAllTags();
      const matchingTags = allTags.filter(t => t.toLowerCase().includes(query));

      // Collect unique bookmark IDs across all matching tags
      const idSet = new Set();
      for (const tag of matchingTags) {
        const ids = await tagsApi.findBookmarksByTag(tag);
        for (const id of ids) idSet.add(id);
      }

      // Limit total results to 10 for consistency
      const uniqueIds = Array.from(idSet).slice(0, 10);

      // Build bookmark result items with tags included
      for (const id of uniqueIds) {
        try {
          const bms = await chrome.bookmarks.get(id);
          const bm = Array.isArray(bms) ? bms[0] : null;
          if (!bm || !bm.url) continue;
          const bmTags = await tagsApi.getTags(id);
          results.push({
            id: `bookmark-${bm.id}`,
            type: 'bookmark',
            title: bm.title || bm.url,
            description: bm.url,
            url: bm.url,
            icon: '🔖',
            metadata: { bookmarkId: bm.id },
            tags: bmTags || []
          });
        } catch (e) {
          // Skip problematic entries
        }
      }

      return results;
    } catch (error) {
      console.warn('Tag search failed:', error);
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
  async getActions(query, context = {}) {
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

      // Check if current URL is bookmarked
      let isBookmarked = false;
      try {
        const bookmarks = await chrome.bookmarks.search({ url: context.currentTab.url });
        isBookmarked = bookmarks && bookmarks.length > 0;
      } catch (error) {
        console.warn('[SearchEngine] Bookmark check failed:', error);
      }

      // Show only the appropriate favorite action
      if (isBookmarked) {
        actions.push({
          id: 'action-remove-favorite',
          type: 'action',
          title: 'Remove from Favorites',
          description: 'Remove bookmark',
          icon: '☆',
          action: 'remove-favorite',
          tabId: context.currentTab.id,
          url: context.currentTab.url
        });
      } else {
        actions.push({
          id: 'action-add-favorite',
          type: 'action',
          title: 'Add to Favorites',
          description: 'Bookmark current page',
          icon: '⭐',
          action: 'add-favorite',
          tabId: context.currentTab.id,
          url: context.currentTab.url,
          title: context.currentTab.title
        });
      }
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
   * Evaluate calculator expression - safe fallback without eval
   */
  evaluateCalculator(input) {
    if (!input || typeof input !== 'string') return null;
    
    // Remove whitespace
    const cleanInput = input.replace(/\s+/g, '');
    
    // Check for minimum pattern: [num][operator][num]
    // Must have at least one digit, followed by an operator, followed by at least one digit
    const hasBasicPattern = /\d+[-+/*%^]\d+/.test(cleanInput);
    if (!hasBasicPattern) return null;
    
    // Early return checks for invalid inputs
    if (cleanInput.includes('()')) return null;
    if (cleanInput.match(/\(\s*\)/)) return null;
    if (!/[-+/*().\d]/.test(cleanInput)) return null;

    try {
      // Check if math.js is available
      if (typeof math !== 'undefined' && math && math.evaluate) {
        // Use math.js to evaluate the expression
        const result = math.evaluate(cleanInput);
        
        // Return null if result is not finite
        if (!Number.isFinite(result)) {
          return null;
        }
        
        // Round to 8 decimal places to avoid floating point issues
        return Math.round(result * 1e8) / 1e8;
      }

      // Fallback: Safe expression parser without eval
      // Only supports basic arithmetic: +, -, *, /, %
      return this.safeMathEval(cleanInput);
    } catch (e) {
      console.warn('Calculator error:', e);
      return null;
    }
  }

  /**
   * Safe math expression evaluator - no eval, no Function
   * Supports: +, -, *, /, %, parentheses, decimals
   */
  safeMathEval(expr) {
    // Tokenize the expression
    const tokens = [];
    let current = '';
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if ('+-*/%()'.includes(char)) {
        if (current) {
          tokens.push(parseFloat(current));
          current = '';
        }
        tokens.push(char);
      } else if (/[\d.]/.test(char)) {
        current += char;
      }
    }
    
    if (current) {
      tokens.push(parseFloat(current));
    }

    // Validate tokens
    if (tokens.length === 0) return null;
    for (const token of tokens) {
      if (typeof token === 'number' && !Number.isFinite(token)) {
        return null;
      }
    }

    // Evaluate with operator precedence
    return this.evaluateTokens(tokens);
  }

  /**
   * Evaluate tokenized expression with proper precedence
   */
  evaluateTokens(tokens) {
    // Handle parentheses first
    while (tokens.includes('(')) {
      const closeIdx = tokens.indexOf(')');
      if (closeIdx === -1) return null;
      
      let openIdx = closeIdx - 1;
      while (openIdx >= 0 && tokens[openIdx] !== '(') {
        openIdx--;
      }
      
      if (openIdx === -1) return null;
      
      const subExpr = tokens.slice(openIdx + 1, closeIdx);
      const result = this.evaluateTokens(subExpr);
      if (result === null) return null;
      
      tokens.splice(openIdx, closeIdx - openIdx + 1, result);
    }

    // Handle * and / first (left to right)
    for (let i = 1; i < tokens.length; i += 2) {
      if (tokens[i] === '*') {
        const result = tokens[i - 1] * tokens[i + 1];
        tokens.splice(i - 1, 3, result);
        i -= 2;
      } else if (tokens[i] === '/') {
        if (tokens[i + 1] === 0) return null; // Division by zero
        const result = tokens[i - 1] / tokens[i + 1];
        tokens.splice(i - 1, 3, result);
        i -= 2;
      } else if (tokens[i] === '%') {
        const result = tokens[i - 1] % tokens[i + 1];
        tokens.splice(i - 1, 3, result);
        i -= 2;
      }
    }

    // Handle + and - (left to right)
    for (let i = 1; i < tokens.length; i += 2) {
      if (tokens[i] === '+') {
        const result = tokens[i - 1] + tokens[i + 1];
        tokens.splice(i - 1, 3, result);
        i -= 2;
      } else if (tokens[i] === '-') {
        const result = tokens[i - 1] - tokens[i + 1];
        tokens.splice(i - 1, 3, result);
        i -= 2;
      }
    }

    // Should be left with single result
    if (tokens.length !== 1 || typeof tokens[0] !== 'number') {
      return null;
    }

    const result = tokens[0];
    if (!Number.isFinite(result)) return null;
    
    return Math.round(result * 1e8) / 1e8;
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

        case 'web-search': {
          const query = encodeURIComponent(metadata.query || '');
          let urlTemplate = metadata.engineUrl || 'https://www.google.com/search?q=%s';
          let url = urlTemplate.replace('%s', query);
          await chrome.tabs.create({ url });
          return true;
        }

        case 'add-favorite':
          if (metadata.url && metadata.title) {
            await chrome.bookmarks.create({
              title: metadata.title,
              url: metadata.url
            });
            return true;
          }
          return false;

        case 'remove-favorite':
          if (metadata.url) {
            const bookmarks = await chrome.bookmarks.search({ url: metadata.url });
            if (bookmarks && bookmarks.length > 0) {
              await chrome.bookmarks.remove(bookmarks[0].id);
              return true;
            }
          }
          return false;

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
