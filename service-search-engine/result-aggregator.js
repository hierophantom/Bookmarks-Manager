/**
 * service-search-engine/result-aggregator.js
 * 
 * Aggregates search results from multiple Chrome APIs and sources:
 * - Bookmarks
 * - Browsing History
 * - Active Tabs
 * - Chrome Settings
 * - Extensions
 * - Downloads
 * - Extension Actions
 */

class ResultAggregator {
  constructor() {
    this.cache = {
      bookmarks: null,
      history: null,
      tabs: null,
      extensions: null,
      downloads: null,
      timestamp: 0
    };
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Aggregate all results for a search query
   */
  async aggregateResults(query) {
    if (!query || query.trim() === '') {
      return await this.getDefaultResults();
    }

    const results = {};

    // Fetch results from all sources in parallel
    const [
      bookmarks,
      folders,
      history,
      tabs,
      settings,
      extensions,
      downloads,
      actions
    ] = await Promise.all([
      this.searchBookmarks(query),
      this.searchFolders(query),
      this.searchHistory(query),
      this.searchTabs(query),
      this.searchSettings(query),
      this.searchExtensions(query),
      this.searchDownloads(query),
      this.getContextualActions(query)
    ]);

    if (bookmarks.length > 0) results['Bookmarks'] = bookmarks;
    if (folders.length > 0) results['Folders'] = folders;
    if (tabs.length > 0) results['Tabs'] = tabs;
    if (history.length > 0) results['History'] = history;
    if (extensions.length > 0) results['Extensions'] = extensions;
    if (downloads.length > 0) results['Downloads'] = downloads;
    if (settings.length > 0) results['Settings'] = settings;
    if (actions.length > 0) results['Actions'] = actions;

    return results;
  }

  /**
   * Get default results (before typing)
   */
  async getDefaultResults() {
    const results = {};

    // Always show extension actions first
    const actions = await this.getDefaultActions();
    if (actions.length > 0) {
      results['Actions'] = actions;
    }

    // Show active tabs
    const tabs = await this.getActiveTabs();
    if (tabs.length > 0) {
      results['Tabs'] = tabs.slice(0, 5); // Limit to 5
    }

    // Show recent history
    const history = await this.getRecentHistory(5);
    if (history.length > 0) {
      results['Recent'] = history;
    }

    return results;
  }

  /**
   * Search bookmarks
   */
  async searchBookmarks(query) {
    try {
      const bookmarks = await chrome.bookmarks.search({ query });
      
      // Filter out folders (they're handled separately) and duplicate URLs
      const seenUrls = new Set();
      const results = bookmarks
        .filter(b => b.url && !seenUrls.has(b.url) && (seenUrls.add(b.url), true))
        .map(bookmark => this.createBookmarkResult(bookmark, query))
        .filter(r => r !== null);

      // Rank results
      return this.rankResults(results, query);
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      return [];
    }
  }

  /**
   * Search bookmark folders
   */
  async searchFolders(query) {
    try {
      const bookmarks = await chrome.bookmarks.search({ query });
      
      const results = bookmarks
        .filter(b => !b.url) // Folders don't have URLs
        .map(folder => this.createFolderResult(folder, query))
        .filter(r => r !== null);

      return this.rankResults(results, query);
    } catch (error) {
      console.error('Error searching folders:', error);
      return [];
    }
  }

  /**
   * Search browsing history
   */
  async searchHistory(query) {
    try {
      const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const historyItems = await chrome.history.search({
        text: query,
        startTime: oneMonthAgo,
        maxResults: 100
      });

      // Deduplicate by URL
      const seenUrls = new Set();
      const results = historyItems
        .filter(item => !seenUrls.has(item.url) && (seenUrls.add(item.url), true))
        .map(item => this.createHistoryResult(item, query))
        .filter(r => r !== null);

      return this.rankResults(results, query);
    } catch (error) {
      console.error('Error searching history:', error);
      return [];
    }
  }

  /**
   * Search active tabs
   */
  async searchTabs(query) {
    try {
      const tabs = await chrome.tabs.query({});
      
      const results = tabs
        .map(tab => this.createTabResult(tab, query))
        .filter(r => r !== null && this.matchesQuery(r, query));

      return this.rankResults(results, query);
    } catch (error) {
      console.error('Error searching tabs:', error);
      return [];
    }
  }

  /**
   * Get active tabs (for default view)
   */
  async getActiveTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      return tabs.map(tab => this.createTabResult(tab, ''));
    } catch (error) {
      console.error('Error getting active tabs:', error);
      return [];
    }
  }

  /**
   * Search Chrome settings
   */
  async searchSettings(query) {
    const settingsPages = [
      { title: 'Clear Browsing Data', keywords: ['clear', 'history', 'cache', 'cookies'] },
      { title: 'Privacy & Security Settings', keywords: ['privacy', 'security', 'cookies'] },
      { title: 'Extensions', keywords: ['extensions', 'add-ons', 'plugins'] },
      { title: 'Keyboard Shortcuts', keywords: ['shortcuts', 'keyboard', 'hotkeys'] },
      { title: 'Downloads Settings', keywords: ['downloads', 'download'] },
      { title: 'History', keywords: ['history'] }
    ];

    const results = settingsPages
      .filter(page => page.keywords.some(keyword => 
        keyword.toLowerCase().includes(query.toLowerCase()) ||
        page.title.toLowerCase().includes(query.toLowerCase())
      ))
      .map(page => this.createSettingResult(page, query));

    return this.rankResults(results, query);
  }

  /**
   * Search extensions
   */
  async searchExtensions(query) {
    try {
      const extensions = await chrome.management.getAll();
      
      const results = extensions
        .filter(ext => ext.type === 'extension' && ext.enabled)
        .map(ext => this.createExtensionResult(ext, query))
        .filter(r => r !== null && this.matchesQuery(r, query));

      return this.rankResults(results, query);
    } catch (error) {
      console.error('Error searching extensions:', error);
      return [];
    }
  }

  /**
   * Search downloads
   */
  async searchDownloads(query) {
    try {
      const downloads = await chrome.downloads.search({
        orderBy: ['-startTime']
      });

      const results = downloads
        .slice(0, 100) // Limit to last 100 downloads
        .map(download => this.createDownloadResult(download, query))
        .filter(r => r !== null && this.matchesQuery(r, query));

      return this.rankResults(results, query);
    } catch (error) {
      console.error('Error searching downloads:', error);
      return [];
    }
  }

  /**
   * Get recent history (for default view)
   */
  async getRecentHistory(limit = 5) {
    try {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const historyItems = await chrome.history.search({
        startTime: oneDayAgo,
        maxResults: 100
      });

      // Get most visited
      const visitCounts = {};
      historyItems.forEach(item => {
        visitCounts[item.url] = (visitCounts[item.url] || 0) + 1;
      });

      return Object.entries(visitCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([url]) => {
          const item = historyItems.find(h => h.url === url);
          return this.createHistoryResult(item, '');
        });
    } catch (error) {
      console.error('Error getting recent history:', error);
      return [];
    }
  }

  /**
   * Get default extension actions (before typing)
   */
  async getDefaultActions() {
    try {
      // Get current active tab
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!currentTab) return [];

      // Check if current tab is bookmarked
      const bookmarks = await chrome.bookmarks.search({ url: currentTab.url });
      const isBookmarked = bookmarks.length > 0;

      const actions = [
        {
          id: 'close-current-tab',
          type: 'action',
          title: 'Close Current Tab',
          description: `Close "${currentTab.title}"`,
          icon: '✕',
          metadata: {
            action: 'close-tab',
            tabId: currentTab.id
          }
        },
        {
          id: 'close-all-except',
          type: 'action',
          title: 'Close All Except Current',
          description: 'Close all other tabs in current window',
          icon: '⊟',
          metadata: {
            action: 'close-all-except',
            tabId: currentTab.id
          }
        }
      ];

      if (!isBookmarked) {
        actions.push({
          id: 'save-to-favorites',
          type: 'action',
          title: 'Save to Favorites',
          description: `Bookmark "${currentTab.title}"`,
          icon: '⭐',
          metadata: {
            action: 'save-to-favorites',
            url: currentTab.url,
            title: currentTab.title
          }
        });
      } else {
        actions.push({
          id: 'remove-from-favorites',
          type: 'action',
          title: 'Remove from Favorites',
          description: `Remove "${currentTab.title}" from bookmarks`,
          icon: '☆',
          metadata: {
            action: 'remove-from-favorites',
            bookmarkId: bookmarks[0].id
          }
        });
      }

      actions.push({
        id: 'open-settings',
        type: 'action',
        title: 'Open Extension Settings',
        description: 'Configure extension preferences',
        icon: '⚙️',
        metadata: {
          action: 'open-settings'
        }
      });

      return actions;
    } catch (error) {
      console.error('Error getting default actions:', error);
      return [];
    }
  }

  /**
   * Get contextual actions based on query
   */
  async getContextualActions(query) {
    const contextualActions = [];

    if (['history', 'browsing', 'visited'].some(word => query.toLowerCase().includes(word))) {
      contextualActions.push({
        id: 'open-history',
        type: 'action',
        title: 'Open History',
        description: 'View browsing history',
        icon: '📜',
        metadata: {
          action: 'open-history'
        }
      });
    }

    if (['download', 'files', 'downloads'].some(word => query.toLowerCase().includes(word))) {
      contextualActions.push({
        id: 'open-downloads',
        type: 'action',
        title: 'Open Downloads',
        description: 'View downloaded files',
        icon: '⬇️',
        metadata: {
          action: 'open-downloads'
        }
      });
    }

    if (['settings', 'preferences', 'config'].some(word => query.toLowerCase().includes(word))) {
      contextualActions.push({
        id: 'open-settings',
        type: 'action',
        title: 'Open Settings',
        description: 'Configure browser settings',
        icon: '⚙️',
        metadata: {
          action: 'open-settings'
        }
      });
    }

    return contextualActions;
  }

  /**
   * Create bookmark result object
   */
  createBookmarkResult(bookmark, query) {
    if (!bookmark.url) return null;

    return {
      id: `bookmark-${bookmark.id}`,
      type: 'bookmark',
      title: bookmark.title || new URL(bookmark.url).hostname,
      description: bookmark.url,
      icon: this.getFaviconUrl(bookmark.url),
      metadata: {
        url: bookmark.url,
        bookmarkId: bookmark.id,
        action: 'open-bookmark'
      },
      rank: 0
    };
  }

  /**
   * Create folder result object
   */
  createFolderResult(folder, query) {
    return {
      id: `folder-${folder.id}`,
      type: 'folder',
      title: folder.title || 'Untitled Folder',
      description: 'Bookmark Folder',
      icon: '📁',
      metadata: {
        folderId: folder.id,
        action: 'open-folder'
      },
      rank: 0
    };
  }

  /**
   * Create history result object
   */
  createHistoryResult(item, query) {
    return {
      id: `history-${item.url}-${item.lastVisitTime}`,
      type: 'history',
      title: item.title || new URL(item.url).hostname,
      description: item.url,
      icon: this.getFaviconUrl(item.url),
      metadata: {
        url: item.url,
        lastVisited: item.lastVisitTime,
        visitCount: item.visitCount,
        action: 'open-history-item'
      },
      rank: 0
    };
  }

  /**
   * Create tab result object
   */
  createTabResult(tab, query) {
    return {
      id: `tab-${tab.id}`,
      type: 'tab',
      title: tab.title || 'Untitled Tab',
      description: tab.url,
      icon: tab.favIconUrl || this.getFaviconUrl(tab.url),
      metadata: {
        tabId: tab.id,
        url: tab.url,
        windowId: tab.windowId,
        action: 'focus-tab'
      },
      rank: 0
    };
  }

  /**
   * Create setting result object
   */
  createSettingResult(setting, query) {
    return {
      id: `setting-${setting.title}`,
      type: 'setting',
      title: setting.title,
      description: 'Chrome Setting',
      icon: '⚙️',
      metadata: {
        settingTitle: setting.title,
        action: 'open-setting'
      },
      rank: 0
    };
  }

  /**
   * Create extension result object
   */
  createExtensionResult(extension, query) {
    return {
      id: `ext-${extension.id}`,
      type: 'extension',
      title: extension.name,
      description: 'Chrome Extension',
      icon: extension.icons && extension.icons[0] ? extension.icons[0].url : '🧩',
      metadata: {
        extensionId: extension.id,
        action: 'open-extension'
      },
      rank: 0
    };
  }

  /**
   * Create download result object
   */
  createDownloadResult(download, query) {
    const filename = download.filename.split('/').pop();
    
    return {
      id: `download-${download.id}`,
      type: 'download',
      title: filename,
      description: `${download.filename} · ${this.formatFileSize(download.fileSize)}`,
      icon: '📥',
      metadata: {
        downloadId: download.id,
        filename: download.filename,
        action: 'open-download'
      },
      rank: 0
    };
  }

  /**
   * Match result against query
   */
  matchesQuery(result, query) {
    if (!query) return true;

    const lowerQuery = query.toLowerCase();
    const titleMatch = result.title.toLowerCase().includes(lowerQuery);
    const descMatch = result.description && result.description.toLowerCase().includes(lowerQuery);

    return titleMatch || descMatch;
  }

  /**
   * Rank results by relevance
   */
  rankResults(results, query) {
    if (!query) return results;

    const lowerQuery = query.toLowerCase();

    results.forEach(result => {
      let score = 0;

      // Title matching (highest weight)
      const titleLower = result.title.toLowerCase();
      if (titleLower === lowerQuery) {
        score += 1.0;
      } else if (titleLower.startsWith(lowerQuery)) {
        score += 0.8;
      } else if (titleLower.includes(lowerQuery)) {
        score += 0.5;
      }

      // Description/URL matching (medium weight)
      if (result.description) {
        const descLower = result.description.toLowerCase();
        if (descLower.startsWith(lowerQuery)) {
          score += 0.4;
        } else if (descLower.includes(lowerQuery)) {
          score += 0.2;
        }
      }

      // Recency bonus
      if (result.metadata?.lastVisited) {
        const ageMs = Date.now() - result.metadata.lastVisited;
        const ageHours = ageMs / (1000 * 60 * 60);

        if (ageHours < 1) score += 0.15;
        else if (ageHours < 24) score += 0.1;
        else if (ageHours < 168) score += 0.05;
      }

      // Type-specific bonuses
      if (result.type === 'tab') score += 0.15; // Active tabs are more relevant
      if (result.type === 'bookmark') score += 0.1; // Bookmarks are important

      result.rank = Math.min(score, 1.0);
    });

    // Sort by rank (descending)
    return results.sort((a, b) => b.rank - a.rank);
  }

  /**
   * Get favicon URL for a domain
   */
  getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=24&domain=${domain}`;
    } catch {
      return '📄';
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Export for use in background service worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResultAggregator;
}
