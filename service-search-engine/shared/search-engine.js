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
      actions: { name: 'Actions', icon: '⚡', weight: 2 }
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

    // Search each source
    const [bookmarks, history, tabs, downloads] = await Promise.all([
      this.searchBookmarks(normalizedQuery),
      this.searchHistory(normalizedQuery),
      this.searchTabs(normalizedQuery),
      this.searchDownloads(normalizedQuery)
    ]);

    if (bookmarks.length > 0) results.Bookmarks = bookmarks;
    if (history.length > 0) results.History = history;
    if (tabs.length > 0) results.Tabs = tabs;
    if (downloads.length > 0) results.Downloads = downloads;

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
      const downloads = await chrome.downloads.search({ query });

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
          if (metadata.tabId) {
            await chrome.tabs.remove(metadata.tabId);
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
