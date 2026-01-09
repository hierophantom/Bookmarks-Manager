/**
 * Content Overlay - Search overlay injected into http/https pages
 * Communicates with background service worker for searches
 * Independent from main overlay
 */

class ContentOverlay {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = -1;
    this.currentResults = {};
    this.resultItems = [];
    this.myTabId = null;
  }

  /**
   * Initialize overlay - called when content script loads
   */
  async init() {
    console.log('[ContentOverlay] Initializing on:', window.location.href);
    
    // Try to get tab ID
    try {
      const tabs = await chrome.tabs.query({ url: window.location.href });
      const activeTab = tabs.find(t => t.active) || tabs[0];
      if (activeTab) {
        this.myTabId = activeTab.id;
        console.log('[ContentOverlay] Tab ID:', this.myTabId);
      }
    } catch (error) {
      console.warn('[ContentOverlay] Failed to get tab ID:', error.message);
    }

    // Inject overlay HTML
    this.injectOverlay();
    
    // Setup UI elements
    this.setupUI();
    
    // Setup keyboard listeners
    this.setupKeyboardListeners();
    
    // Setup styles
    this.injectStyles();
    
    // Setup message listeners from background
    this.setupMessageListeners();
    
    // Notify background that this tab is ready
    chrome.runtime.sendMessage({
      type: 'OVERLAY_READY',
      tabId: this.myTabId,
      url: window.location.href
    }).catch(err => console.warn('[ContentOverlay] OVERLAY_READY failed:', err));
    
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
        <input 
          type="text" 
          id="bm-search-input" 
          class="bm-search-input" 
          placeholder="Search bookmarks, history, tabs..."
          autocomplete="off"
        />
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
    this.elements.input.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Prevent modal click from closing
    this.elements.modal.addEventListener('click', (e) => e.stopPropagation());

    console.log('[ContentOverlay] UI setup complete');
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardListeners() {
    // Cmd/Ctrl+Shift+E to toggle
    document.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isE = e.code === 'KeyE';

      if (isCtrlOrCmd && isShift && isE) {
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

    console.log('[ContentOverlay] Keyboard listeners setup');
  }

  /**
   * Handle search input
   */
  handleSearch(query) {
    console.log('[ContentOverlay] Searching:', query);
    
    this.showLoading();
    
    // Send search request to background
    chrome.runtime.sendMessage({
      type: 'SEARCH',
      query: query,
      tabId: this.myTabId,
      url: window.location.href
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[ContentOverlay] Search failed:', chrome.runtime.lastError.message);
        this.showEmpty();
        return;
      }

      if (!response) {
        console.error('[ContentOverlay] No response from background');
        this.showEmpty();
        return;
      }

      console.log('[ContentOverlay] Results:', Object.keys(response.results || {}));
      this.currentResults = response.results || {};
      this.displayResults();
    });
  }

  /**
   * Display results
   */
  displayResults() {
    this.hideLoading();

    const resultsList = this.elements.results;
    resultsList.innerHTML = '';
    this.resultItems = [];

    // Group results by category
    for (const [category, items] of Object.entries(this.currentResults)) {
      if (!Array.isArray(items) || items.length === 0) continue;

      // Category header
      const header = document.createElement('div');
      header.className = 'bm-result-category';
      header.textContent = category;
      resultsList.appendChild(header);

      // Items
      for (const item of items) {
        const element = this.createResultItem(item);
        resultsList.appendChild(element);
        this.resultItems.push({ item, element });
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

    // Ensure click events work
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      console.log('[ContentOverlay] Result clicked:', item.id);
      e.stopPropagation();
      this.executeResult(item);
    }, true);
    
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
  executeResult(item) {
    console.log('[ContentOverlay] Executing:', item.id, item.type);

    // Send execution request to background
    chrome.runtime.sendMessage({
      type: 'EXECUTE_RESULT',
      resultId: item.id,
      resultType: item.type,
      metadata: {
        url: item.url,
        tabId: item.tabId,
        query: item.query
      }
    }, (response) => {
      if (response && response.success) {
        this.close();
      }
    });
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
      this.resultItems[this.selectedIndex].element.classList.add('bm-selected');
    }
  }

  clearSelection() {
    this.resultItems.forEach(r => r.element.classList.remove('bm-selected'));
  }

  executeSelected() {
    if (this.selectedIndex >= 0 && this.resultItems[this.selectedIndex]) {
      this.executeResult(this.resultItems[this.selectedIndex].item);
    }
  }

  /**
   * Message listeners from background
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('[ContentOverlay] Message received:', request.type);

      if (request.type === 'TOGGLE_OVERLAY') {
        this.toggle();
        sendResponse({ success: true });
      } else if (request.type === 'CLOSE_OVERLAY') {
        this.close();
        sendResponse({ success: true });
      }
    });
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
    this.currentResults = {};
    this.displayResults();
  }

  close() {
    console.log('[ContentOverlay] Closing');
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

      #bm-content-overlay .bm-overlay-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      #bm-content-overlay .bm-overlay-modal {
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

      #bm-content-overlay .bm-search-input {
        padding: 16px;
        border: none;
        font-size: 16px;
        outline: none;
        border-bottom: 1px solid #eee;
      }

      #bm-content-overlay .bm-search-input::placeholder {
        color: #999;
      }

      #bm-content-overlay .bm-results-container {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      #bm-content-overlay .bm-loading {
        display: none;
        flex: 1;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #666;
      }

      #bm-content-overlay .bm-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ddd;
        border-top-color: #666;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      #bm-content-overlay .bm-results {
        flex: 1;
      }

      #bm-content-overlay .bm-result-category {
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 600;
        color: #999;
        text-transform: uppercase;
        background: #f9f9f9;
        border-bottom: 1px solid #eee;
        margin-top: 8px;
      }

      #bm-content-overlay .bm-result-category:first-child {
        margin-top: 0;
      }

      #bm-content-overlay .bm-result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: background 0.2s;
      }

      #bm-content-overlay .bm-result-item:hover,
      #bm-content-overlay .bm-result-item.bm-selected {
        background: #f5f5f5;
      }

      #bm-content-overlay .bm-result-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      #bm-content-overlay .bm-result-content {
        flex: 1;
        min-width: 0;
      }

      #bm-content-overlay .bm-result-title {
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #bm-content-overlay .bm-result-description {
        font-size: 13px;
        color: #999;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 2px;
      }

      #bm-content-overlay .bm-empty-state {
        display: none;
        flex: 1;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
      }

      #bm-content-overlay .bm-results::-webkit-scrollbar {
        width: 8px;
      }

      #bm-content-overlay .bm-results::-webkit-scrollbar-track {
        background: transparent;
      }

      #bm-content-overlay .bm-results::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
      }

      #bm-content-overlay .bm-results::-webkit-scrollbar-thumb:hover {
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
