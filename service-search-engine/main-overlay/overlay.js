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

    el.addEventListener('click', () => this.executeResult(item));
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
    console.log('[MainOverlay] Executing:', item.id, item.type);

    try {
      let success = false;

      if (item.type === 'action') {
        success = await this.engine.executeAction(item.id, {
          tabId: item.tabId,
          query: item.query
        });
      } else if (item.url) {
        // Open URL in new tab
        await chrome.tabs.create({ url: item.url });
        success = true;
      } else if (item.type === 'tab' && item.tabId) {
        // Switch to tab
        await chrome.tabs.update(item.tabId, { active: true });
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
    this.currentResults = {};
    this.displayResults();
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

      .bm-search-input {
        padding: 16px;
        border: none;
        font-size: 16px;
        outline: none;
        border-bottom: 1px solid #eee;
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
