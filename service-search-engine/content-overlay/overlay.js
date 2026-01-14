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
    
    // Note: Content scripts don't have access to chrome.tabs API
    // Tab ID will be set by background when needed

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
    if (document.getElementById('bmg-http-overlay')) {
      return; // Already injected
    }

    // Create root isolation container with LTR properties
    const root = document.createElement('div');
    root.id = 'bmg-http-overlay';
    
    const overlay = document.createElement('div');
    overlay.className = 'bmg-overlay-container';
    overlay.innerHTML = `
      <div class="bmg-overlay-backdrop" id="bmg-overlay-backdrop"></div>
      <div class="bmg-overlay-modal" id="bmg-overlay-modal">
        <input 
          type="text" 
          id="bmg-search-input" 
          class="bmg-search-input" 
          placeholder="Search bookmarks, history, tabs..."
          autocomplete="off"
        />
        <div class="bmg-results-container" id="bmg-results-container">
          <div class="bmg-loading" id="bmg-loading" style="display: none;">
            <div class="bmg-spinner"></div>
            Searching...
          </div>
          <div class="bmg-results" id="bmg-results"></div>
          <div class="bmg-empty-state" id="bmg-empty-state" style="display: none;">
            <p>No results found</p>
          </div>
        </div>
      </div>
    `;
    
    root.appendChild(overlay);
    document.body.appendChild(root);
    console.log('[ContentOverlay] HTML injected with LTR isolation');
  }

  /**
   * Setup UI references and event handlers
   */
  setupUI() {
    this.elements = {
      root: document.getElementById('bmg-http-overlay'),
      overlay: document.querySelector('#bmg-http-overlay .bmg-overlay-container'),
      modal: document.getElementById('bmg-overlay-modal'),
      backdrop: document.getElementById('bmg-overlay-backdrop'),
      input: document.getElementById('bmg-search-input'),
      loading: document.getElementById('bmg-loading'),
      results: document.getElementById('bmg-results'),
      empty: document.getElementById('bmg-empty-state')
    };

    // Debug: verify all elements are found
    console.log('[ContentOverlay] Element references:', {
      overlay: !!this.elements.overlay,
      modal: !!this.elements.modal,
      results: !!this.elements.results,
      input: !!this.elements.input
    });

    // Backdrop click to close
    this.elements.backdrop.addEventListener('click', () => this.close());

    // Search input
    this.elements.input.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Prevent modal click from closing (but let it bubble for clicks inside)
    this.elements.modal.addEventListener('click', (e) => {
      // Don't stop propagation - we need it for event delegation
      e.stopPropagation();
    });

    // Event delegation for result clicks - listen on modal in capture phase
    if (this.elements.modal) {
      this.elements.modal.addEventListener('click', (e) => {
        // Let other listeners run first in capture phase, check both in bubbling
        const target = e.target;
        
        // Check for show-more button first
        const showMoreBtn = target.closest ? target.closest('.bmg-show-more') : null;
        if (showMoreBtn) {
          console.log('[ContentOverlay] Clicked on show-more button:', showMoreBtn.dataset.category);
          const url = showMoreBtn.dataset.url;
          if (url) {
            chrome.runtime.sendMessage({
              type: 'EXECUTE_RESULT',
              resultId: `show-more-${showMoreBtn.dataset.category}`,
              resultType: 'show-more',
              metadata: { url }
            }, (response) => {
              if (response && response.success) {
                this.close();
              }
            });
          }
          return;
        }
        
        const resultItem = target.closest ? target.closest('.bmg-result-item') : null;
        
        if (resultItem) {
          console.log('[ContentOverlay] Clicked on result item element:', resultItem.className);
          const matchingResult = this.resultItems.find(r => r.element === resultItem);
          
          if (matchingResult) {
            console.log('[ContentOverlay] Executing result:', matchingResult.item.id, matchingResult.item.type);
            this.executeResult(matchingResult.item);
          } else {
            console.warn('[ContentOverlay] Result item DOM node not found in tracking array', {
              resultItemsCount: this.resultItems.length,
              elementClass: resultItem.className
            });
          }
        }
      }); // No capture phase - use normal bubbling
    }

    console.log('[ContentOverlay] UI setup complete');
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardListeners() {
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
      console.log('[ContentOverlay] Full results object:', {
        categories: Object.keys(this.currentResults),
        itemCounts: Object.entries(this.currentResults).reduce((acc, [k, v]) => {
          acc[k] = Array.isArray(v) ? v.length : 'not array';
          return acc;
        }, {})
      });
      this.displayResults();
    });
  }

  /**
   * Save current window tabs as a session
   */
  async handleSaveSession() {
    try {
      console.log('[ContentOverlay] handleSaveSession called');
      console.log('[ContentOverlay] ContentSaveSessionModal available?', typeof ContentSaveSessionModal);
      
      if (typeof ContentSaveSessionModal === 'undefined') {
        console.error('[ContentOverlay] ContentSaveSessionModal not available');
        alert('Save modal not available');
        return;
      }

      // Request tabs from background (content scripts can't access chrome.windows)
      chrome.runtime.sendMessage({ type: 'GET_CURRENT_WINDOW_TABS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[ContentOverlay] Failed to get tabs:', chrome.runtime.lastError.message);
          alert('Failed to get tabs');
          return;
        }

        if (!response || !response.success) {
          console.error('[ContentOverlay] Failed to get tabs:', response?.error);
          alert('Failed to get tabs');
          return;
        }

        console.log('[ContentOverlay] Got tabs:', response.tabs.length);

        if (!response.tabs.length) {
          alert('No tabs to save in this window');
          return;
        }

        console.log('[ContentOverlay] Opening ContentSaveSessionModal');
        ContentSaveSessionModal.show(response.tabs);
      });
    } catch (error) {
      console.error('[ContentOverlay] handleSaveSession failed:', error);
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

    console.log('[ContentOverlay] displayResults called with:', Object.keys(this.currentResults));

    // Map for "show more" URLs
    const showMoreUrls = {
      'History': 'chrome://history',
      'Downloads': 'chrome://downloads',
      'Tabs': null,
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

      console.log('[ContentOverlay] Processing category:', category, 'items:', items.length, 'sample:', items[0]?.id);

      // Category header
      const header = document.createElement('div');
      header.className = 'bmg-result-category';
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
        showMoreBtn.className = 'bmg-show-more';
        showMoreBtn.innerHTML = `📂 Show more in ${category}`;
        showMoreBtn.dataset.category = category;
        showMoreBtn.dataset.url = showMoreUrls[category];
        resultsList.appendChild(showMoreBtn);
        // Add show-more button to resultItems for keyboard navigation
        this.resultItems.push({ 
          item: { id: `show-more-${category}`, type: 'show-more', title: `Show more in ${category}`, url: showMoreUrls[category] }, 
          element: showMoreBtn,
          isShowMore: true,
          url: showMoreUrls[category]
        });
      }
    }

    if (this.resultItems.length === 0) {
      console.log('[ContentOverlay] No items to display, showing empty state');
      this.showEmpty();
    } else {
      console.log('[ContentOverlay] Displaying', this.resultItems.length, 'items');
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
    el.className = 'bmg-result-item';
    
    // Use favicon for bookmark items if available
    let iconHtml = `<span class="bmg-result-icon">${item.icon}</span>`;
    if (item.type === 'bookmark' && item.url) {
      // Use Google S2 favicon service (works in content scripts)
      const domain = this.extractDomain(item.url);
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=20`;
      const fallbackIcon = this.generateLetterFallback(item.url);
      
      iconHtml = `<img src="${faviconUrl}" 
                       width="20" 
                       height="20" 
                       alt="Favicon" 
                       class="bmg-result-icon bmg-result-favicon" 
                       loading="lazy"
                       data-fallback-url="${fallbackIcon}"
                  /><span class="bmg-result-icon" style="display:none;">${item.icon}</span>`;
    }
    
    el.innerHTML = `
      ${iconHtml}
      <div class="bmg-result-content">
        <div class="bmg-result-title">${this.escapeHtml(item.title)}</div>
        <div class="bmg-result-description">${this.escapeHtml(item.description || '')}</div>
      </div>
    `;

    // Attach error handler for favicon fallback
    const faviconImg = el.querySelector('img.bmg-result-favicon[data-fallback-url]');
    if (faviconImg && !faviconImg.dataset.handlerAttached) {
      faviconImg.onerror = function() {
        if (!this.dataset.fallbackAttempted) {
          this.dataset.fallbackAttempted = 'true';
          const fallback = this.dataset.fallbackUrl;
          if (fallback) this.src = fallback;
        }
      };
      faviconImg.dataset.handlerAttached = 'true';
    }

    // Render tag chips for bookmark items
    if (item.type === 'bookmark') {
      const renderTags = (tags) => {
        if (!tags || !tags.length) return;
        const tagChips = tags.map(tag => `<span class="bmg-tag-chip" style="display:inline-block;padding:2px 6px;background:#e5e7eb;color:#374151;border-radius:6px;font-size:10px;margin-right:3px;">#${tag}</span>`).join('');
        const desc = el.querySelector('.bmg-result-description');
        if (desc) {
          desc.innerHTML += `<div style="margin-top:3px;">${tagChips}</div>`;
        }
      };

      if (item.tags && item.tags.length) {
        renderTags(item.tags);
      } else if (item.metadata && item.metadata.bookmarkId) {
        // Ask background for tags to avoid missing tags in content context
        chrome.runtime.sendMessage({
          type: 'GET_BOOKMARK_TAGS',
          bookmarkId: item.metadata.bookmarkId
        }, (resp) => {
          if (resp && Array.isArray(resp.tags)) renderTags(resp.tags);
        });
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
  executeResult(item) {
    try {
      // Handle different result types
      if (item.id === 'save-session') {
        // Close overlay first to avoid visual collision, then open modal
        this.close();
        this.handleSaveSession();
      } else if (item.type === 'calculator') {
        // Copy calculator result to clipboard
        navigator.clipboard.writeText(item.value).then(() => {
          this.close();
        });
      } else if (item.type === 'action') {
        // Actions go through background (check BEFORE url)
        chrome.runtime.sendMessage({
          type: 'EXECUTE_RESULT',
          resultId: item.id,
          resultType: item.type,
          metadata: {
            url: item.url,
            tabId: item.tabId,
            title: item.title,
            query: item.query,
            value: item.value
          }
        }, (response) => {
          if (response && response.success) {
            this.close();
          }
        });
      } else if (item.url && item.url.startsWith('http')) {
        // For regular http/https URLs, open directly
        window.open(item.url, '_blank');
        this.close();
      } else {
        // Everything else goes through background:
        // - chrome:// URLs (content scripts can't access)
        // - Tab switching (requires chrome.tabs API)
        chrome.runtime.sendMessage({
          type: 'EXECUTE_RESULT',
          resultId: item.id,
          resultType: item.type,
          metadata: {
            url: item.url,
            tabId: item.tabId,
            title: item.title,
            query: item.query,
            value: item.value
          }
        }, (response) => {
          if (response && response.success) {
            this.close();
          }
        });
      }
    } catch (error) {
      console.error('[ContentOverlay] Execute error:', error);
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
      
      // Auto-scroll to keep selected result in view within the results container
      const container = this.elements.results.parentElement; // .bm-results-container
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = selectedElement.getBoundingClientRect();
        
        // Check if element is out of view
        if (elementRect.top < containerRect.top) {
          // Scroll up
          container.scrollTop -= (containerRect.top - elementRect.top);
        } else if (elementRect.bottom > containerRect.bottom) {
          // Scroll down
          container.scrollTop += (elementRect.bottom - containerRect.bottom);
        }
      }
    }
  }

  clearSelection() {
    this.resultItems.forEach(r => r.element.classList.remove('bm-selected'));
  }

  executeSelected() {
    if (this.selectedIndex >= 0 && this.resultItems[this.selectedIndex]) {
      const resultData = this.resultItems[this.selectedIndex];
      if (resultData.isShowMore) {
        // Handle "show more" button activation - route through background
        chrome.runtime.sendMessage({
          type: 'EXECUTE_RESULT',
          resultId: resultData.item.id,
          resultType: 'show-more',
          metadata: { url: resultData.item.url }
        }, (response) => {
          if (response && response.success) {
            this.close();
          }
        });
      } else {
        this.executeResult(resultData.item);
      }
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
    // Load default results (actions, tabs, recent history)
    this.handleSearch('');
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
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  getDomainColor(domain) {
    if (!domain) return '#6B7280';
    
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = domain.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    
    const colors = [
      '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }

  generateLetterFallback(url) {
    const domain = this.extractDomain(url);
    const letter = domain ? domain.charAt(0).toUpperCase() : '?';
    const color = this.getDomainColor(domain);
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" fill="${color}" rx="4"/>
        <text x="16" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
              font-size="16" font-weight="600" fill="white">${letter}</text>
      </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

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
    if (document.getElementById('bmg-http-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'bmg-http-overlay-styles';
    style.textContent = `
      /* ============================================
         CSS ISOLATION ROOT
         Prevents host-page CSS collisions and forces LTR layout
         ============================================ */
      #bmg-http-overlay {
        /* LTR Layout Isolation - Isolate from host page but allow text direction detection */
        direction: ltr;
        unicode-bidi: isolate;
        text-align: left;
        
        /* Font Locking - Specific fonts for overlay, immune to host-page fonts */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 400;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        
        /* CSS Custom properties for consistent styling */
        --bmg-text-align: left;
        --bmg-margin-start: 0;
        --bmg-margin-end: 0;
      }
      
      /* Reset directional properties on container that handles display toggle */
      #bmg-http-overlay .bmg-overlay-container {
        direction: ltr;
        unicode-bidi: isolate;
      }
      
      /* Extra protection for form inputs and text elements */
      #bmg-http-overlay input,
      #bmg-http-overlay button,
      #bmg-http-overlay textarea,
      #bmg-http-overlay select {
        direction: ltr;
        unicode-bidi: isolate;
        text-align: left;
        margin: 0;
        padding: 0;
        border: 0;
      }
      
      .bmg-overlay-container {
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
      }

      #bmg-http-overlay .bmg-overlay-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      #bmg-http-overlay .bmg-overlay-modal {
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
        direction: ltr;
        unicode-bidi: isolate;
        text-align: left;
      }

      #bmg-http-overlay .bmg-search-input {
        padding: 16px;
        border: none;
        font-size: 16px;
        outline: none;
        border-bottom: 1px solid #eee;
        direction: ltr;
        unicode-bidi: isolate;
        text-align: left;
      }

      #bmg-http-overlay .bmg-search-input::placeholder {
        color: #999;
      }

      #bmg-http-overlay .bmg-results-container {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      #bmg-http-overlay .bmg-loading {
        display: none;
        flex: 1;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: #666;
      }

      #bmg-http-overlay .bmg-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ddd;
        border-top-color: #666;
        border-radius: 50%;
        animation: bmg-spin 0.6s linear infinite;
      }

      #bmg-http-overlay .bmg-results {
        flex: 1;
      }

      #bmg-http-overlay .bmg-result-category {
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 600;
        color: #999;
        text-transform: uppercase;
        background: #f9f9f9;
        border-bottom: 1px solid #eee;
        margin-top: 8px;
      }

      #bmg-http-overlay .bmg-result-category:first-child {
        margin-top: 0;
      }

      #bmg-http-overlay .bmg-result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: background 0.2s;
      }

      #bmg-http-overlay .bmg-result-item:hover,
      #bmg-http-overlay .bmg-result-item.bmg-selected {
        background: #f5f5f5;
      }

      #bmg-http-overlay .bmg-result-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      #bmg-http-overlay .bmg-result-favicon {
        width: 20px;
        height: 20px;
        border-radius: 3px;
        object-fit: contain;
      }

      #bmg-http-overlay .bmg-result-content {
        flex: 1;
        min-width: 0;
      }

      #bmg-http-overlay .bmg-result-title {
        font-weight: 500;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #bmg-http-overlay .bmg-result-description {
        font-size: 13px;
        color: #999;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 2px;
      }

      #bmg-http-overlay .bmg-show-more {
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
        font-family: inherit;
      }

      #bmg-http-overlay .bmg-show-more:hover {
        background: #f0f0f0;
      }

      #bmg-http-overlay .bmg-empty-state {
        display: none;
        flex: 1;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
      }

      #bmg-http-overlay .bmg-results::-webkit-scrollbar {
        width: 8px;
      }

      #bmg-http-overlay .bmg-results::-webkit-scrollbar-track {
        background: transparent;
      }

      #bmg-http-overlay .bmg-results::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
      }

      #bmg-http-overlay .bmg-results::-webkit-scrollbar-thumb:hover {
        background: #999;
      }
      
      /* Keyframe animations - namespaced */
      @keyframes bmg-spin {
        to { transform: rotate(360deg); }
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
