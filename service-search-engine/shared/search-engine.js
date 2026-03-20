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
      actions: { name: 'Actions', icon: '⚡', weight: 2 }
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

    // Search each source
    const [bookmarks, history, tabs, tags] = await Promise.all([
      this.searchBookmarks(normalizedQuery),
      this.searchHistory(normalizedQuery),
      this.searchTabs(normalizedQuery),
      this.searchTags(normalizedQuery)
    ]);

    if (bookmarks.length > 0) results.Bookmarks = bookmarks;
    if (tags.length > 0) results.Tags = tags;
    if (history.length > 0) results.History = history;
    if (tabs.length > 0) results.Tabs = tabs;

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
    return [];
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
