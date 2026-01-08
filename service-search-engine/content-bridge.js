/**
 * service-search-engine/content-bridge.js
 * 
 * Content script that injects the search overlay UI into web pages.
 * Manages overlay visibility, positioning, dragging, and communication with background service worker.
 */

class OverlayManager {
  constructor() {
    this.overlayContainer = null;
    this.isOpen = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.overlayPosition = { x: 0, y: 0 };
    this.shortcutKey = 'Shift+K'; // Will be updated from manifest
    this.ctrlPressed = false;
    this.commandPressed = false;
    this.myTabId = null; // Explicit tab ID for this content script instance
  }

  /**
   * Initialize overlay manager - called once when content script loads
   */
  async init() {
    console.log('[OverlayManager] Initializing on:', window.location.href);
    
    // Get tab ID for extension pages only (content scripts don't have chrome.tabs access)
    const isExtensionPage = window.location.protocol === 'chrome-extension:';
    
    if (isExtensionPage && chrome.tabs && chrome.tabs.getCurrent) {
      try {
        const currentTab = await chrome.tabs.getCurrent();
        if (currentTab && currentTab.id) {
          this.myTabId = currentTab.id;
          console.log('[OverlayManager] Extension page - got tab ID:', this.myTabId);
        }
      } catch (error) {
        console.warn('[OverlayManager] getCurrent failed:', error.message);
      }
    } else {
      // Content scripts: tab ID will be inferred by background from sender context
      console.log('[OverlayManager] Content script - tab ID will be provided by background');
    }

    console.log('[OverlayManager] Initialized:', { myTabId: this.myTabId, isExtensionPage });
    
    // Load saved position
    await this.restorePosition();
    
    // Inject overlay HTML
    console.log('[OverlayManager] Injecting overlay HTML');
    this.injectOverlay();
    console.log('[OverlayManager] Overlay HTML injected');
    
    // Setup event listeners
    console.log('[OverlayManager] Setting up keyboard listeners');
    this.setupKeyboardListeners();
    
    console.log('[OverlayManager] Setting up message listeners');
    this.setupMessageListeners();

    // Notify background that this tab is ready
    console.log('[OverlayManager] Sending OVERLAY_READY');
    chrome.runtime.sendMessage({
      type: 'OVERLAY_READY',
      tabId: this.myTabId,
      isExtensionPage
    }).catch(err => console.warn('[OverlayManager] OVERLAY_READY failed:', err));
    
    console.log('[OverlayManager] Initialization complete');
  }

  /**
   * Inject overlay HTML into the page DOM
   */
  injectOverlay() {
    // Check if overlay already exists (prevent duplicates)
    if (document.getElementById('bm-search-overlay-container')) {
      return;
    }

    // Create container
    const container = document.createElement('div');
    container.id = 'bm-search-overlay-container';
    container.style.display = 'none'; // hidden until opened
    container.innerHTML = `
      <div id="bm-search-overlay" class="bm-overlay">
        <!-- Overlay header with drag handle -->
        <div class="bm-overlay-header" id="bm-overlay-drag-handle">
          <div class="bm-overlay-title">
            <span class="bm-overlay-icon">🔍</span>
            Search Bookmarks, Tabs & More
          </div>
          <button id="bm-overlay-close" class="bm-overlay-close-btn" aria-label="Close search overlay">
            ✕
          </button>
        </div>

        <!-- Search input -->
        <div class="bm-overlay-input-container">
          <input
            id="bm-search-input"
            type="text"
            class="bm-overlay-input"
            placeholder="Type to search bookmarks, tabs, history... Press ? for help"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <!-- Results container -->
        <div id="bm-search-results" class="bm-overlay-results">
          <div id="bm-search-loading" class="bm-loading" style="display: none;">
            <div class="bm-spinner"></div>
            <p>Searching...</p>
          </div>
          <div id="bm-search-empty" class="bm-empty-state">
            <p>Start typing to search, or press ? for help</p>
          </div>
        </div>

        <!-- Help overlay (hidden by default) -->
        <div id="bm-overlay-help" class="bm-overlay-help" style="display: none;">
          <div class="bm-help-content">
            <h3>Keyboard Shortcuts</h3>
            <table class="bm-help-table">
              <tr>
                <td><kbd>↑↓</kbd></td>
                <td>Navigate results</td>
              </tr>
              <tr>
                <td><kbd>Enter</kbd></td>
                <td>Select result or search</td>
              </tr>
              <tr>
                <td><kbd>Esc</kbd></td>
                <td>Close overlay</td>
              </tr>
              <tr>
                <td><kbd>Cmd+Shift+K</kbd></td>
                <td>Toggle overlay (Mac)</td>
              </tr>
              <tr>
                <td><kbd>Ctrl+Shift+K</kbd></td>
                <td>Toggle overlay (Windows/Linux)</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(container);
    this.overlayContainer = container;

    // Keep hidden until explicitly opened
    this.overlayContainer.style.display = 'none';

    // Inject styles
    this.injectStyles();

    // Setup overlay event listeners
    this.setupOverlayListeners();
  }

  /**
   * Inject CSS for the overlay
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Overlay Container */
      #bm-search-overlay-container {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        pointer-events: auto;
        visibility: visible;
        opacity: 1;
      }

      /* Overlay Panel */
      .bm-overlay {
        position: fixed;
        width: 600px;
        max-height: 600px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        visibility: visible;
        opacity: 1;
      }

      /* Dark theme support */
      @media (prefers-color-scheme: dark) {
        .bm-overlay {
          background: #2d2d2d;
          color: #e8e8e8;
        }
      }

      /* Header */
      .bm-overlay-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
        cursor: grab;
        user-select: none;
        background: linear-gradient(to bottom, #fafafa, #f5f5f5);
      }

      @media (prefers-color-scheme: dark) {
        .bm-overlay-header {
          border-bottom-color: #444;
          background: linear-gradient(to bottom, #3a3a3a, #333);
        }
      }

      .bm-overlay-header:active {
        cursor: grabbing;
      }

      .bm-overlay-title {
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .bm-overlay-icon {
        font-size: 16px;
      }

      .bm-overlay-close-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
        color: #999;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .bm-overlay-close-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #333;
      }

      @media (prefers-color-scheme: dark) {
        .bm-overlay-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e8e8e8;
        }
      }

      /* Input */
      .bm-overlay-input-container {
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
      }

      @media (prefers-color-scheme: dark) {
        .bm-overlay-input-container {
          border-bottom-color: #444;
        }
      }

      .bm-overlay-input {
        width: 100%;
        padding: 10px 12px;
        font-size: 14px;
        border: 1px solid #ddd;
        border-radius: 6px;
        outline: none;
        transition: all 0.2s;
        box-sizing: border-box;
        background: #fff;
        color: #333;
      }

      @media (prefers-color-scheme: dark) {
        .bm-overlay-input {
          background: #3a3a3a;
          color: #e8e8e8;
          border-color: #555;
        }
      }

      .bm-overlay-input:focus {
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
      }

      /* Results */
      .bm-overlay-results {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .bm-results-category {
        margin-bottom: 12px;
      }

      .bm-results-category-header {
        padding: 8px 12px 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: #999;
        letter-spacing: 0.5px;
      }

      .bm-result-item {
        padding: 10px 12px;
        margin-bottom: 4px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.15s;
        user-select: none;
      }

      .bm-result-item:hover,
      .bm-result-item.selected {
        background: #f0f0f0;
      }

      @media (prefers-color-scheme: dark) {
        .bm-result-item:hover,
        .bm-result-item.selected {
          background: #3a3a3a;
        }
      }

      .bm-result-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 12px;
        background: #f0f0f0;
      }

      @media (prefers-color-scheme: dark) {
        .bm-result-icon {
          background: #4a4a4a;
        }
      }

      .bm-result-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
        overflow: hidden;
      }

      .bm-result-title {
        font-size: 13px;
        font-weight: 500;
        color: #333;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.3;
      }

      @media (prefers-color-scheme: dark) {
        .bm-result-title {
          color: #e8e8e8;
        }
      }

      .bm-result-subtitle {
        font-size: 12px;
        color: #999;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.2;
      }

      /* Empty state */
      .bm-empty-state {
        padding: 40px 20px;
        text-align: center;
        color: #999;
        font-size: 14px;
      }

      /* Loading */
      .bm-loading {
        padding: 40px 20px;
        text-align: center;
        display: flex !important;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .bm-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid #ddd;
        border-top-color: #4a90e2;
        border-radius: 50%;
        animation: bm-spin 0.6s linear infinite;
      }

      @keyframes bm-spin {
        to { transform: rotate(360deg); }
      }

      /* Help */
      .bm-overlay-help {
        padding: 20px;
        font-size: 13px;
      }

      .bm-help-content h3 {
        margin: 0 0 12px;
        font-size: 14px;
      }

      .bm-help-table {
        width: 100%;
        border-collapse: collapse;
      }

      .bm-help-table tr {
        border-bottom: 1px solid #e0e0e0;
      }

      @media (prefers-color-scheme: dark) {
        .bm-help-table tr {
          border-bottom-color: #444;
        }
      }

      .bm-help-table td {
        padding: 8px 4px;
      }

      .bm-help-table kbd {
        background: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
        padding: 2px 6px;
        font-family: monospace;
        font-size: 11px;
        font-weight: 600;
      }

      @media (prefers-color-scheme: dark) {
        .bm-help-table kbd {
          background: #3a3a3a;
          border-color: #555;
        }
      }

      /* Scrollbar styling */
      .bm-overlay-results::-webkit-scrollbar {
        width: 8px;
      }

      .bm-overlay-results::-webkit-scrollbar-track {
        background: transparent;
      }

      .bm-overlay-results::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
      }

      .bm-overlay-results::-webkit-scrollbar-thumb:hover {
        background: #999;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .bm-overlay {
          width: 90vw;
          max-height: 80vh;
        }
      }
    `;
    document.documentElement.appendChild(style);
  }

  /**
   * Setup keyboard listeners for overlay toggle
   */
  setupKeyboardListeners() {
    console.log('setupKeyboardListeners: initializing. location.href =', window.location.href);
    console.log('setupKeyboardListeners: window.__bmOverlay exists?', !!window.__bmOverlay);
    
    const isExtensionPage = window.location.protocol === 'chrome-extension:';

    // Local toggle handler for extension pages (chrome-extension://, e.g., main.html)
    if (isExtensionPage) {
      console.log('setupKeyboardListeners: registering local toggle listener for extension page (Cmd/Ctrl+Shift+K)');
      const handleToggleShortcut = (e) => {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const isK = e.code === 'KeyK' || (e.key && e.key.toLowerCase() === 'k');

        if (isCtrlOrCmd && isShift && isK) {
          e.preventDefault();
          e.stopPropagation();
          console.log('Local toggle shortcut (K) detected on extension page; toggling overlay');
          this.toggle();
        }
      };

      // Capture phase to win against other listeners
      window.addEventListener('keydown', handleToggleShortcut, true);
      document.addEventListener('keydown', handleToggleShortcut, true);
    } else {
      console.log('setupKeyboardListeners: extension page = false; relying on background chrome.commands');
    }

    // Always handle overlay-local keys (Esc to close when open)
    const handleOverlayKeys = (e) => {
      if (this.isOpen && e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };

    document.addEventListener('keydown', handleOverlayKeys);
    window.addEventListener('keydown', handleOverlayKeys);
  }

  /**
   * Setup overlay-specific event listeners
   */
  setupOverlayListeners() {
    const input = document.getElementById('bm-search-input');
    const closeBtn = document.getElementById('bm-overlay-close');
    const dragHandle = document.getElementById('bm-overlay-drag-handle');

    // Input events
    input.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
      this.handleInputKeydown(e);
    });

    // Close button
    closeBtn.addEventListener('click', () => {
      this.close();
    });

    // Drag handle
    dragHandle.addEventListener('mousedown', (e) => {
      this.startDrag(e);
    });

    // Prevent overlay from closing when clicking inside
    this.overlayContainer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    // Close on outside click
    document.addEventListener('mousedown', (e) => {
      if (!this.overlayContainer.contains(e.target) && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Handle input keydown events
   */
  handleInputKeydown(e) {
    const resultsContainer = document.getElementById('bm-search-results');
    const resultItems = resultsContainer.querySelectorAll('.bm-result-item');

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.selectNextResult();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectPreviousResult();
        break;

      case 'Enter':
        e.preventDefault();
        const selectedItem = resultsContainer.querySelector('.bm-result-item.selected');
        if (selectedItem) {
          this.executeResult(selectedItem);
        } else {
          this.performWebSearch(e.target.value);
        }
        break;

      case '?':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.toggleHelp();
        }
        break;

      default:
        break;
    }
  }

  /**
   * Select next result
   */
  selectNextResult() {
    const results = document.querySelectorAll('.bm-result-item');
    const selected = document.querySelector('.bm-result-item.selected');
    
    if (results.length === 0) return;

    let nextIndex = 0;
    if (selected) {
      const currentIndex = Array.from(results).indexOf(selected);
      nextIndex = (currentIndex + 1) % results.length;
    }

    this.setSelectedResult(results[nextIndex]);
  }

  /**
   * Select previous result
   */
  selectPreviousResult() {
    const results = document.querySelectorAll('.bm-result-item');
    const selected = document.querySelector('.bm-result-item.selected');
    
    if (results.length === 0) return;

    let prevIndex = results.length - 1;
    if (selected) {
      const currentIndex = Array.from(results).indexOf(selected);
      prevIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
    }

    this.setSelectedResult(results[prevIndex]);
  }

  /**
   * Set the selected result and scroll into view
   */
  setSelectedResult(resultElement) {
    document.querySelectorAll('.bm-result-item').forEach(el => {
      el.classList.remove('selected');
    });

    resultElement.classList.add('selected');
    resultElement.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Handle search input
   */
  handleSearch(query) {
    // Send search query to background service worker with EXPLICIT tab ID
    const payload = {
      type: 'SEARCH',
      query: query,
      tabId: this.myTabId, // Explicit tab ID captured at init
      pageUrl: window.location.href
    };

    console.log('[OverlayManager] Sending SEARCH:', { query, tabId: this.myTabId, url: window.location.href });

    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[OverlayManager] Search error:', chrome.runtime.lastError.message);
        this.displayResults({});
        return;
      }
      
      if (!response) {
        console.error('[OverlayManager] No response received from background');
        this.displayResults({});
        return;
      }

      console.log('[OverlayManager] Response:', {
        success: response.success,
        hasResults: !!response.results,
        resultKeys: response.results ? Object.keys(response.results) : [],
        error: response.error
      });
      
      if (response.success && response.results && Object.keys(response.results).length > 0) {
        this.displayResults(response.results);
      } else {
        console.warn('[OverlayManager] No results:', response.error || 'Empty results');
        this.displayResults({});
      }
    });
  }

  /**
   * Display search results
   */
  displayResults(groupedResults) {
    const resultsContainer = document.getElementById('bm-search-results');
    const input = document.getElementById('bm-search-input');
    const loading = document.getElementById('bm-search-loading');

    const keys = groupedResults ? Object.keys(groupedResults) : [];
    console.log('displayResults: keys', keys, 'input value', input?.value);

    // Build a map for quick lookup when executing actions
    this.resultMap = this.resultMap || {};
    this.resultMap = {};

    if (input.value === '' && (!groupedResults || Object.keys(groupedResults).length === 0)) {
      if (loading) loading.style.display = 'none';
      resultsContainer.innerHTML = `
        <div class="bm-empty-state">
          <p>Start typing to search, or press ? for help</p>
        </div>
      `;
      return;
    }

    if (!groupedResults || Object.keys(groupedResults).length === 0) {
      if (loading) loading.style.display = 'none';
      resultsContainer.innerHTML = `
        <div class="bm-empty-state">
          <p>No results found for "${input.value}"</p>
        </div>
      `;
      return;
    }

    if (loading) loading.style.display = 'none';
    let html = '';

    for (const [category, results] of Object.entries(groupedResults)) {
      if (results.length === 0) continue;

      html += `<div class="bm-results-category">`;
      html += `<div class="bm-results-category-header">${category}</div>`;

      results.slice(0, 10).forEach((result) => {
        // store result for metadata lookup during execution
        this.resultMap[result.id] = result;
        html += `
          <div class="bm-result-item" data-result-id="${result.id}" data-action="${result.metadata?.action || ''}">
            <div class="bm-result-icon">${result.icon || '📄'}</div>
            <div class="bm-result-content">
              <div class="bm-result-title" title="${result.title}">${this.highlightQuery(result.title, input.value)}</div>
              ${result.description ? `<div class="bm-result-subtitle" title="${result.description}">${result.description}</div>` : ''}
            </div>
          </div>
        `;
      });

      if (results.length > 10) {
        html += `<div class="bm-result-item" data-action="show-more" data-category="${category}">
          <div style="padding: 10px 12px; color: #4a90e2; font-weight: 500; font-size: 13px;">
            Show more (${results.length - 10} more)
          </div>
        </div>`;
      }

      html += `</div>`;
    }

    resultsContainer.innerHTML = html;

    // Attach click listeners to results
    resultsContainer.querySelectorAll('.bm-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.executeResult(item);
      });

      item.addEventListener('mouseenter', () => {
        this.setSelectedResult(item);
      });
    });

    // Auto-select first result
    const firstResult = resultsContainer.querySelector('.bm-result-item');
    if (firstResult) {
      this.setSelectedResult(firstResult);
    }
  }

  /**
   * Highlight query text in results
   */
  highlightQuery(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  /**
   * Execute selected result
   */
  executeResult(resultElement) {
    const action = resultElement.getAttribute('data-action');
    const resultId = resultElement.getAttribute('data-result-id');
    const result = (this.resultMap && this.resultMap[resultId]) || null;

    chrome.runtime.sendMessage({
      type: 'EXECUTE_RESULT',
      resultId: resultId,
      action: action,
      metadata: result ? result.metadata : undefined
    }, (response) => {
      if (response && response.success) {
        this.close();
      }
    });
  }

  /**
   * Perform web search
   */
  performWebSearch(query) {
    chrome.runtime.sendMessage({
      type: 'WEB_SEARCH',
      query: query
    }, (response) => {
      if (response && response.success) {
        this.close();
      }
    });
  }

  /**
   * Start dragging overlay
   */
  startDrag(e) {
    if (e.button !== 0) return; // Only left mouse button

    const overlay = document.getElementById('bm-search-overlay');
    const rect = overlay.getBoundingClientRect();

    this.isDragging = true;
    this.dragOffset.x = e.clientX - rect.left;
    this.dragOffset.y = e.clientY - rect.top;

    const onMouseMove = (moveEvent) => {
      const newX = moveEvent.clientX - this.dragOffset.x;
      const newY = moveEvent.clientY - this.dragOffset.y;

      overlay.style.position = 'fixed';
      overlay.style.left = `${newX}px`;
      overlay.style.top = `${newY}px`;

      this.overlayPosition = { x: newX, y: newY };
    };

    const onMouseUp = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.savePosition();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Save overlay position
   */
  async savePosition() {
    await chrome.storage.sync.set({
      overlayPosition: this.overlayPosition
    });
  }

  /**
   * Restore overlay position
   */
  async restorePosition() {
    const data = await chrome.storage.sync.get(['overlayPosition']);
    if (data.overlayPosition) {
      this.overlayPosition = data.overlayPosition;
    } else {
      // Center overlay on screen
      this.overlayPosition = {
        x: (window.innerWidth - 600) / 2,
        y: (window.innerHeight - 400) / 2
      };
    }
  }

  /**
   * Position overlay
   */
  positionOverlay() {
    const overlay = document.getElementById('bm-search-overlay');
    if (overlay) {
      overlay.style.position = 'fixed';
      overlay.style.left = `${this.overlayPosition.x}px`;
      overlay.style.top = `${this.overlayPosition.y}px`;
    }
  }

  /**
   * Toggle overlay visibility
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open overlay
   */
  open() {
    if (!this.overlayContainer) {
      this.injectOverlay();
    }

    this.positionOverlay();
    this.overlayContainer.style.display = 'block';
    this.overlayContainer.style.visibility = 'visible';
    this.overlayContainer.style.opacity = '1';
    this.isOpen = true;

    console.log('Overlay display state:', {
      display: this.overlayContainer.style.display,
      visibility: this.overlayContainer.style.visibility,
      opacity: this.overlayContainer.style.opacity,
      position: this.overlayPosition
    });

    // Focus input
    setTimeout(() => {
      const input = document.getElementById('bm-search-input');
      if (input) {
        input.focus();
        input.value = '';
        this.handleSearch('');
      }
    }, 0);

    // Notify background service worker
    chrome.runtime.sendMessage({
      type: 'OVERLAY_OPENED'
    });
  }

  /**
   * Close overlay
   */
  close() {
    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'none';
    }
    this.isOpen = false;

    // Notify background service worker
    chrome.runtime.sendMessage({
      type: 'OVERLAY_CLOSED'
    });
  }

  /**
   * Toggle help panel
   */
  toggleHelp() {
    const help = document.getElementById('bm-overlay-help');
    const results = document.getElementById('bm-search-results');

    if (help.style.display === 'none') {
      help.style.display = 'block';
      results.style.display = 'none';
    } else {
      help.style.display = 'none';
      results.style.display = 'block';
    }
  }

  /**
   * Setup message listeners
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('content-bridge received message:', request.type, 'from sender:', sender?.url);
      
      switch (request.type) {
        case 'TOGGLE_OVERLAY':
          console.log('Handling TOGGLE_OVERLAY from tabs.sendMessage');
          this.toggle();
          sendResponse({ success: true });
          break;

        case 'TOGGLE_OVERLAY_EXTENSION_PAGE':
          console.log('Handling TOGGLE_OVERLAY_EXTENSION_PAGE from runtime.sendMessage at:', window.location.href);
          // Allow background to toggle overlay on extension pages via runtime messaging
          this.toggle();
          sendResponse({ success: true });
          break;

        case 'GET_CURRENT_TAB_INFO':
          sendResponse({
            url: window.location.href,
            title: document.title
          });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    });
  }
}

// Initialize overlay manager when DOM is ready
function initOverlaySingleton() {
  console.log('[OverlayManager] initOverlaySingleton called, readyState:', document.readyState);
  
  // Reuse existing instance if already created
  if (window.__bmOverlay && typeof window.__bmOverlay.init === 'function') {
    console.log('[OverlayManager] Instance already exists, skipping re-init');
    return window.__bmOverlay;
  }
  
  console.log('[OverlayManager] Creating new instance');
  const instance = new OverlayManager();
  window.__bmOverlay = instance;
  instance.init();
  console.log('[OverlayManager] Instance created and initialized');
  return instance;
}

if (document.readyState === 'loading') {
  console.log('[OverlayManager] DOM loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[OverlayManager] DOMContentLoaded fired');
    initOverlaySingleton();
  });
} else {
  console.log('[OverlayManager] DOM already ready, initializing immediately');
  initOverlaySingleton();
}
