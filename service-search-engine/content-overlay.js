/**
 * Content Script - Handles overlay injection on regular HTML pages
 * Communicates with background service worker for search and actions
 */

class ContentOverlay {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = -1;
    this.currentResults = {};
    this.resultItems = [];
    this.lastQuery = '';
    this.searchDebounceTimer = null;
    this.searchDebounceMs = 180;
    this.searchRequestId = 0;
    this.resultsAnimationFrame = null;
  }

  /**
   * Initialize overlay - called when content script loads
   */
  async init() {
    console.log('[ContentOverlay] Initializing');

    // Inject overlay HTML
    this.injectOverlay();

    // Setup UI elements
    this.setupUI();

    // Setup keyboard listeners
    this.setupKeyboardListeners();

    // Setup styles
    this.injectStyles();

    // Listen for toggle messages from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'TOGGLE_OVERLAY') {
        this.toggle();
        sendResponse({ success: true });
      }
    });

    console.log('[ContentOverlay] Initialization complete');
  }

  /**
   * Inject overlay HTML into DOM
   */
  injectOverlay() {
    if (document.getElementById('bm-content-overlay')) {
      return; // Already injected
    }

    const overlay = document.createElement('div');
    overlay.id = 'bm-content-overlay';
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
    console.log('[ContentOverlay] HTML injected');
  }

  /**
   * Setup UI references and event handlers
   */
  setupUI() {
    this.elements = {
      overlay: document.getElementById('bm-content-overlay'),
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
    this.elements.input.addEventListener('input', (e) => {
      const value = e.target.value || '';
      this.scheduleSearch(value);
    });

    // Prevent modal click from closing
    this.elements.modal.addEventListener('click', (e) => e.stopPropagation());

    // Event delegation for result clicks
    if (this.elements.results) {
      this.elements.results.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.bm-result-item');
        if (resultItem) {
          const matchingResult = this.resultItems.find(r => r.element === resultItem);
          if (matchingResult) {
            console.log('[ContentOverlay] Result clicked:', matchingResult.item.id);
            this.executeResult(matchingResult.item);
          }
          return;
        }
      });
    }

    console.log('[ContentOverlay] UI setup complete');
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardListeners() {
    // Cmd+Shift+E to toggle overlay
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isToggleShortcut = isMac ? 
        (e.metaKey && e.shiftKey && e.key === 'e') :
        (e.ctrlKey && e.shiftKey && e.key === 'e');

      if (isToggleShortcut) {
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
        if (this.selectedIndex < 0 && document.activeElement === this.elements.input) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        this.executeSelected();
      }
    });

    console.log('[ContentOverlay] Keyboard listeners setup');
  }

  scheduleSearch(query) {
    this.lastQuery = query;

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = null;
      this.handleSearch(query);
    }, this.searchDebounceMs);
  }

  /**
   * Handle search input - delegates to background service worker
   */
  async handleSearch(query) {
    console.log('[ContentOverlay] Searching:', query);
    const requestId = ++this.searchRequestId;

    try {
      // Send search request to background service worker
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH',
        query: query
      });

      if (requestId !== this.searchRequestId) {
        return;
      }

      if (!response.success) {
        console.error('[ContentOverlay] Search failed:', response.error);
        this.showEmpty();
        return;
      }

      this.currentResults = response.results;

      console.log('[ContentOverlay] Results:', Object.keys(this.currentResults));
      this.displayResults();
    } catch (error) {
      if (requestId !== this.searchRequestId) {
        return;
      }
      console.error('[ContentOverlay] Search error:', error);
      this.showEmpty();
    }
  }

  /**
   * Display results
   */
  displayResults() {
    const resultsHtml = this.buildResultsHtml();
    this.elements.results.innerHTML = resultsHtml;
    this.hideLoading();

    // Find all result items for keyboard navigation
    this.resultItems = [];
    this.elements.results.querySelectorAll('.bm-result-item').forEach((element) => {
      const dataId = element.getAttribute('data-id');
      const dataCategory = element.getAttribute('data-category');
      
      // Find the original item in currentResults
      const category = this.currentResults[dataCategory];
      if (category && Array.isArray(category)) {
        const item = category.find(r => r.id === dataId);
        if (item) {
          this.resultItems.push({ element, item });
        }
      }
    });

    if (this.resultItems.length === 0) {
      this.showEmpty();
    } else {
      this.clearSelection();
    }
  }

  /**
   * Build HTML for results
   */
  buildResultsHtml() {
    if (!this.currentResults || Object.keys(this.currentResults).length === 0) {
      return '';
    }

    let html = '';

    Object.entries(this.currentResults).forEach(([category, items]) => {
      if (!Array.isArray(items) || items.length === 0) {
        return;
      }

      html += `<div class="bm-result-category">${this.escapeHtml(category)}</div>`;

      items.forEach((item) => {
        html += this.createResultItemHtml(item, category);
      });
    });

    return html;
  }

  /**
   * Create HTML for a single result item
   */
  createResultItemHtml(item, category) {
    const icon = item.icon || '📄';
    const title = this.escapeHtml(item.title || '');
    const description = this.escapeHtml(item.description || '');

    return `
      <div class="bm-result-item" data-id="${this.escapeHtml(item.id)}" data-category="${this.escapeHtml(category)}">
        <div class="bm-result-icon">${icon}</div>
        <div class="bm-result-content">
          <div class="bm-result-title">${title}</div>
          ${description ? `<div class="bm-result-description">${description}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Execute a result item - delegates to background service worker
   */
  async executeResult(item) {
    console.log('[ContentOverlay] Executing result:', item.id, item.type);

    try {
      // Format message according to what bridge expects
      const message = {
        type: 'EXECUTE_RESULT',
        resultType: item.type,
        resultId: item.id,
        metadata: {
          url: item.url,
          tabId: item.tabId,
          title: item.title,
          description: item.description
        }
      };

      // Send execution request to background service worker
      const response = await chrome.runtime.sendMessage(message);

      if (response.success) {
        // Close overlay after successful execution
        this.close();
      } else {
        console.error('[ContentOverlay] Execute failed:', response.error);
      }
    } catch (error) {
      console.error('[ContentOverlay] Execute error:', error);
    }
  }

  /**
   * Navigation helpers
   */
  selectNext() {
    if (this.resultItems.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.resultItems.length;
    this.updateSelection();
  }

  selectPrev() {
    if (this.resultItems.length === 0) return;
    this.selectedIndex = this.selectedIndex - 1;
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.resultItems.length - 1;
    }
    this.updateSelection();
  }

  updateSelection() {
    this.resultItems.forEach((r, i) => {
      if (i === this.selectedIndex) {
        r.element.classList.add('bm-selected');
        r.element.scrollIntoView({ block: 'nearest' });
      } else {
        r.element.classList.remove('bm-selected');
      }
    });
  }

  clearSelection() {
    this.selectedIndex = -1;
    this.resultItems.forEach(r => r.element.classList.remove('bm-selected'));
  }

  executeSelected() {
    if (this.selectedIndex >= 0 && this.resultItems[this.selectedIndex]) {
      this.executeResult(this.resultItems[this.selectedIndex].item);
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
    console.log('[ContentOverlay] Opening');
    this.isOpen = true;
    this.elements.overlay.style.display = 'flex';
    this.elements.input.focus();
    this.elements.input.value = '';
    this.scheduleSearch('');
  }

  close() {
    console.log('[ContentOverlay] Closing');
    this.isOpen = false;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    if (this.resultsAnimationFrame) {
      cancelAnimationFrame(this.resultsAnimationFrame);
      this.resultsAnimationFrame = null;
    }
    this.searchRequestId += 1;
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
    if (document.getElementById('bm-content-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'bm-content-overlay-styles';
    style.textContent = `
      #bm-content-overlay {
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
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
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

      .bm-empty-state {
        display: none;
        flex: 1;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
      }

      .bm-results {
        flex: 1;
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.18s ease, transform 0.22s ease;
        will-change: opacity, transform;
      }

      .bm-results.bm-results--pre-enter {
        opacity: 0;
        transform: translateY(8px);
      }

      .bm-results.bm-results--animate-in {
        opacity: 1;
        transform: translateY(0);
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

      .bm-result-favicon {
        width: 20px;
        height: 20px;
        border-radius: 3px;
        object-fit: contain;
      }

      .bm-result-content {
        flex: 1;
        min-width: 0;
      }

      .bm-result-title {
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }

      .bm-result-description {
        font-size: 12px;
        color: #666;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
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
function initContentOverlay() {
  if (window.__bmContentOverlay) return;
  
  const overlay = new ContentOverlay();
  window.__bmContentOverlay = overlay;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => overlay.init());
  } else {
    overlay.init();
  }
}

initContentOverlay();
