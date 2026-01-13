/**
 * Main.html Overlay - Self-contained search overlay for extension pages
 * Handles UI, search, and result display entirely locally
 * No background messaging required
 */

import SearchEngine from '../shared/search-engine.js';

class MainOverlay {
  constructor() {
    this.engine = new SearchEngine();
    this.isOpen = false;
    this.selectedIndex = -1;
    this.currentResults = {};
    this.resultItems = [];
  }

  /**
   * Initialize overlay - called when main.html loads
   */
  async init() {
    console.log('[MainOverlay] Initializing');
    
    // Inject overlay HTML
    this.injectOverlay();
    
    // Setup UI elements
    this.setupUI();
    
    // Setup keyboard listeners
    this.setupKeyboardListeners();
    
    // Setup styles
    this.injectStyles();
    
    console.log('[MainOverlay] Initialization complete');
  }

  /**
   * Inject overlay HTML into DOM
   */
  injectOverlay() {
    if (document.getElementById('bm-main-overlay')) {
      return; // Already injected
    }

    const overlay = document.createElement('div');
    overlay.id = 'bm-main-overlay';
    overlay.innerHTML = `
      <div class="bm-overlay-backdrop" id="bm-overlay-backdrop"></div>
      <div class="bm-overlay-modal" id="bm-overlay-modal">
        <div class="bm-search-wrapper">
          <input 
            type="text" 
            id="bm-search-input" 
            class="bm-search-input" 
            placeholder="Search bookmarks, history, tabs..."
            autocomplete="off"
          />
        </div>
        <div class="bm-results-container" id="bm-results-container">
          <div class="bm-loading" id="bm-loading" style="display: none;">
            <div class="bm-spinner"></div>
            Searching...
          </div>
          <div class="bm-results" id="bm-results"></div>
          <div class="bm-empty-state" id="bm-empty-state" style="display: none;">
            <p>No results found</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    console.log('[MainOverlay] HTML injected');
  }

  /**
   * Setup UI references and event handlers
   */
  setupUI() {
    this.elements = {
      overlay: document.getElementById('bm-main-overlay'),
      modal: document.getElementById('bm-overlay-modal'),
      backdrop: document.getElementById('bm-overlay-backdrop'),
      input: document.getElementById('bm-search-input'),
      loading: document.getElementById('bm-loading'),
      results: document.getElementById('bm-results'),
      empty: document.getElementById('bm-empty-state')
    };

    // Backdrop click to close
    this.elements.backdrop.addEventListener('click', () => this.close());

    // Search input
    this.elements.input.addEventListener('input', (e) => this.handleSearch(e.target.value));


    // Prevent modal click from closing
    this.elements.modal.addEventListener('click', (e) => e.stopPropagation());

    // Event delegation for result clicks and show more buttons
    if (this.elements.results) {
      this.elements.results.addEventListener('click', (e) => {
        // Check if it's a result item
        const resultItem = e.target.closest('.bm-result-item');
        if (resultItem) {
          const matchingResult = this.resultItems.find(r => r.element === resultItem);
          if (matchingResult) {
            console.log('[MainOverlay] Result clicked:', matchingResult.item.id);
            this.executeResult(matchingResult.item);
          }
          return;
        }

        // Check if it's a show more button
        const showMoreBtn = e.target.closest('.bm-show-more');
        if (showMoreBtn) {
          e.stopPropagation();
        }
      });
    }

    console.log('[MainOverlay] UI setup complete');
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardListeners() {
    // Cmd/Ctrl+Shift+K to toggle
    document.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isK = e.code === 'KeyK';

      if (isCtrlOrCmd && isShift && isK) {
        e.preventDefault();
        this.toggle();
      }
    });

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Arrow keys for navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrev();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      }
    });

    console.log('[MainOverlay] Keyboard listeners setup');
  }

  /**
   * Handle search input
   */
  async handleSearch(query) {
    console.log('[MainOverlay] Searching:', query);
    
    this.showLoading();
    
    try {
      // Get current tab context
      const currentTab = await chrome.tabs.getCurrent();
      
      // Search
      this.currentResults = await this.engine.search(query, {
        currentTab,
        isExtensionPage: true
      });

      console.log('[MainOverlay] Results:', Object.keys(this.currentResults));
      this.displayResults();
    } catch (error) {
      console.error('[MainOverlay] Search error:', error);
      this.showEmpty();
    }
  }

  /**
   * Save current window tabs as a session
   */
  async handleSaveSession() {
    try {
      // Determine current window
      let windowId = null;
      try {
        const currentTab = await chrome.tabs.getCurrent();
        windowId = currentTab ? currentTab.windowId : null;
      } catch (err) {
        console.warn('[MainOverlay] getCurrent tab failed, fallback to getCurrent window', err);
      }

      if (!windowId) {
        const currentWindow = await chrome.windows.getCurrent();
        windowId = currentWindow.id;
      }

      const windows = await chrome.windows.getAll({ populate: true });
      const currentUrl = chrome.runtime.getURL('core/main.html');
      const targetWindow = windows.find(w => w.id === windowId);
      const tabs = (targetWindow?.tabs || [])
        .filter(tab => tab.url && !tab.url.includes(currentUrl))
        .map(tab => ({
          id: tab.id,
          title: tab.title || tab.url,
          url: tab.url
        }));

      if (!tabs.length) {
        alert('No tabs to save in this window');
        return;
      }

      if (typeof SaveTabsModal === 'undefined') {
        console.error('SaveTabsModal not available');
        alert('Save modal not available');
        return;
      }

      await SaveTabsModal.show(tabs);
    } catch (error) {
      console.error('[MainOverlay] handleSaveSession failed:', error);
      alert('Failed to save session');
    }
  }

  

  /**
   * Display results
   */
  displayResults() {
    this.hideLoading();

    const resultsList = this.elements.results;
    resultsList.innerHTML = '';
    this.resultItems = [];

    // Map for "show more" URLs
    const showMoreUrls = {
      'History': 'chrome://history',
      'Downloads': 'chrome://downloads',
      'Tabs': null, // Can't link to tabs
      'Bookmarks': 'chrome://bookmarks',
      'Actions': null,
      'Chrome Settings': 'chrome://settings',
      'Extensions': 'chrome://extensions',
      'Calculator': null
    };

    // Ensure save-session is part of Actions category
    const desiredOrder = [
      'action-new-tab',
      'action-new-window',
      'action-close-tab',
      'action-remove-favorite',
      'action-add-favorite',
      'save-session'
    ];
    const actionMap = {
      'save-session': {
        id: 'save-session',
        type: 'action',
        icon: '💾',
        title: 'Save session',
        description: 'Save all tabs in this window as bookmarks'
      }
    };

    const actions = this.currentResults['Actions'] || [];
    const merged = [...actions];

    // Ensure save-session exists
    if (!merged.some(a => a.id === 'save-session')) {
      merged.push(actionMap['save-session']);
    }

    // Build ordered list, append any extras at the end
    const ordered = [];
    desiredOrder.forEach(id => {
      const found = merged.find(a => a.id === id);
      if (found) ordered.push(found);
    });
    merged.forEach(a => {
      if (!ordered.includes(a)) ordered.push(a);
    });

    this.currentResults['Actions'] = ordered;

    // Group results by category
    for (const [category, items] of Object.entries(this.currentResults)) {
      if (!Array.isArray(items) || items.length === 0) continue;

      // Category header
      const header = document.createElement('div');
      header.className = 'bm-result-category';
      header.textContent = category;
      resultsList.appendChild(header);

      // Items - limit to 5, add "show more" button if needed
      const maxItems = 5;
      const displayItems = items.slice(0, maxItems);
      const hasMore = items.length > maxItems;

      for (const item of displayItems) {
        const element = this.createResultItem(item);
        resultsList.appendChild(element);
        this.resultItems.push({ item, element });
      }

      // Add "show more" button if items exceed limit
      if (hasMore && showMoreUrls[category]) {
        const showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'bm-show-more';
        showMoreBtn.innerHTML = `📂 Show more in ${category}`;
        showMoreBtn.addEventListener('click', () => {
          chrome.tabs.create({ url: showMoreUrls[category] });
          this.close();
        });
        resultsList.appendChild(showMoreBtn);
        // Add show-more button to resultItems for keyboard navigation
        this.resultItems.push({ 
          item: { id: `show-more-${category}`, type: 'action', title: `Show more in ${category}` }, 
          element: showMoreBtn,
          isShowMore: true,
          url: showMoreUrls[category]
        });
      }
    }

    if (this.resultItems.length === 0) {
      this.showEmpty();
    } else {
      this.elements.empty.style.display = 'none';
    }

    // Reset selection
    this.selectedIndex = -1;
  }

  /**
   * Create result item element
   */
  createResultItem(item) {
    const el = document.createElement('div');
    el.className = 'bm-result-item';
    
    el.innerHTML = `
      <span class="bm-result-icon">${item.icon}</span>
      <div class="bm-result-content">
        <div class="bm-result-title">${this.escapeHtml(item.title)}</div>
        <div class="bm-result-description">${this.escapeHtml(item.description || '')}</div>
      </div>
    `;

    // Render tag chips for bookmark items (after innerHTML so description exists)
    if (item.type === 'bookmark') {
      const renderTags = (tags) => {
        if (!tags || !tags.length) return;
        const tagChips = tags.map(tag => 
          `<span class="bm-tag-chip" style="display:inline-block;padding:2px 6px;background:#e5e7eb;color:#374151;border-radius:6px;font-size:10px;margin-right:3px;">#${tag}</span>`
        ).join('');
        const desc = el.querySelector('.bm-result-description');
        if (desc) {
          desc.innerHTML += `<div style="margin-top:3px;">${tagChips}</div>`;
        }
      };

      if (item.tags && item.tags.length) {
        renderTags(item.tags);
      } else if (typeof TagsService !== 'undefined') {
        const bookmarkId = item.metadata && item.metadata.bookmarkId;
        if (bookmarkId) {
          TagsService.getTags(bookmarkId).then(renderTags);
        }
      }
    }

    el.addEventListener('mouseenter', () => {
      this.clearSelection();
      el.classList.add('bm-selected');
      this.selectedIndex = this.resultItems.findIndex(r => r.element === el);
    });

    return el;
  }

  /**
   * Execute selected result
   */
  async executeResult(item) {
    console.log('[MainOverlay] Executing:', item.id, item.type, 'hasUrl:', !!item.url, 'hasTabId:', !!item.tabId);

    try {
      let success = false;

      if (item.id === 'save-session') {
        // Close overlay first to avoid visual collision, then open modal
        this.close();
        await this.handleSaveSession();
        success = true;
      } else if (item.type === 'calculator') {
        // Copy calculator result to clipboard
        await navigator.clipboard.writeText(item.value);
        console.log('[MainOverlay] Copied to clipboard:', item.value);
        success = true;
      } else if (item.type === 'tab' && item.tabId) {
        // Switch to tab and focus its window (check FIRST before url)
        console.log('[MainOverlay] Switching to tab:', item.tabId);
        await chrome.tabs.update(item.tabId, { active: true });
        const tab = await chrome.tabs.get(item.tabId);
        await chrome.windows.update(tab.windowId, { focused: true });
        success = true;
      } else if (item.type === 'action') {
        success = await this.engine.executeAction(item.id, {
          currentTabId: item.tabId,
          url: item.url,
          title: item.title,
          query: item.query
        });
      } else if (item.url) {
        // Open URL in new tab (bookmarks, history, downloads, chrome settings, extensions)
        await chrome.tabs.create({ url: item.url });
        success = true;
      }

      if (success) {
        this.close();
      }
    } catch (error) {
      console.error('[MainOverlay] Execution error:', error);
    }
  }

  /**
   * Navigation helpers
   */
  selectNext() {
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.resultItems.length - 1);
    this.updateSelection();
  }

  selectPrev() {
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    this.updateSelection();
  }

  updateSelection() {
    this.clearSelection();
    if (this.selectedIndex >= 0 && this.resultItems[this.selectedIndex]) {
      const selectedElement = this.resultItems[this.selectedIndex].element;
      selectedElement.classList.add('bm-selected');
      // Auto-scroll to keep selected result in view
      selectedElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }

  clearSelection() {
    this.resultItems.forEach(r => r.element.classList.remove('bm-selected'));
  }

  executeSelected() {
    if (this.selectedIndex >= 0 && this.resultItems[this.selectedIndex]) {
      const resultData = this.resultItems[this.selectedIndex];
      if (resultData.isShowMore) {
        // Handle "show more" button activation
        chrome.tabs.create({ url: resultData.url });
        this.close();
      } else {
        this.executeResult(resultData.item);
      }
    }
  }

  /**
   * Visibility control
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    console.log('[MainOverlay] Opening');
    this.isOpen = true;
    this.elements.overlay.style.display = 'flex';
    this.elements.input.focus();
    this.elements.input.value = '';
    // Load default results (actions, tabs, recent history)
    this.handleSearch('');
  }

  close() {
    console.log('[MainOverlay] Closing');
    this.isOpen = false;
    this.elements.overlay.style.display = 'none';
  }

  showLoading() {
    this.elements.loading.style.display = 'flex';
    this.elements.results.innerHTML = '';
    this.elements.empty.style.display = 'none';
  }

  hideLoading() {
    this.elements.loading.style.display = 'none';
  }

  showEmpty() {
    this.elements.empty.style.display = 'block';
    this.elements.results.innerHTML = '';
  }

  /**
   * Utility
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Inject styles
   */
  injectStyles() {
    if (document.getElementById('bm-main-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'bm-main-overlay-styles';
    style.textContent = `
      #bm-main-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999999;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding-top: 100px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .bm-overlay-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .bm-overlay-modal {
        position: relative;
        z-index: 1;
        width: 600px;
        max-width: 90vw;
        max-height: 70vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .bm-search-wrapper {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 12px 0 12px;
      }

      .bm-search-input {
        flex: 1;
        padding: 12px 14px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        font-size: 16px;
        outline: none;
        background: #f9fafb;
      }

      .bm-search-input::placeholder {
        color: #999;
      }

      .bm-results-container {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .bm-loading {
        display: none;
        flex: 1;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #666;
      }

      .bm-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ddd;
        border-top-color: #666;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .bm-results {
        flex: 1;
      }

      .bm-result-category {
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 600;
        color: #999;
        text-transform: uppercase;
        background: #f9f9f9;
        border-bottom: 1px solid #eee;
        margin-top: 8px;
      }

      .bm-result-category:first-child {
        margin-top: 0;
      }

      .bm-result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: background 0.2s;
      }

      .bm-result-item:hover,
      .bm-result-item.bm-selected {
        background: #f5f5f5;
      }

      .bm-result-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .bm-result-content {
        flex: 1;
        min-width: 0;
      }

      .bm-result-title {
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bm-result-description {
        font-size: 13px;
        color: #999;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 2px;
      }

      .bm-show-more {
        display: block;
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: #f9f9f9;
        color: #666;
        font-size: 13px;
        cursor: pointer;
        border-top: 1px solid #eee;
        transition: background 0.2s;
      }

      .bm-show-more:hover {
        background: #f0f0f0;
      }

      .bm-empty-state {
        display: none;
        flex: 1;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
      }

      .bm-results::-webkit-scrollbar {
        width: 8px;
      }

      .bm-results::-webkit-scrollbar-track {
        background: transparent;
      }

      .bm-results::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
      }

      .bm-results::-webkit-scrollbar-thumb:hover {
        background: #999;
      }
    `;

    document.documentElement.appendChild(style);
  }
}

// Auto-initialize when DOM is ready
function initMainOverlay() {
  if (window.__bmMainOverlay) return;
  
  const overlay = new MainOverlay();
  window.__bmMainOverlay = overlay;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => overlay.init());
  } else {
    overlay.init();
  }
}

initMainOverlay();
