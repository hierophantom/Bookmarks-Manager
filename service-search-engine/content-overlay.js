/**
 * Content Overlay - Compact bookmark search popup for HTML pages
 * Design: BMG-239 (Figma node 317:10241)
 * 300px dropdown panel, no backdrop, top-right position
 */

class ContentOverlay {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = -1;
    this.flatItems = [];
    this.lastQuery = '';
    this.searchDebounceTimer = null;
    this.searchDebounceMs = 180;
    this.searchRequestId = 0;
  }

  async init() {
    this.injectStyles();
    this.injectPanel();
    this.setupUI();
    this.setupKeyboardListeners();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'TOGGLE_OVERLAY') {
        this.toggle();
        sendResponse({ success: true });
      }
    });
  }

  injectPanel() {
    if (document.getElementById('bm-popup')) return;

    const panel = document.createElement('div');
    panel.id = 'bm-popup';
    panel.innerHTML = `
      <input
        id="bm-popup-input"
        type="text"
        placeholder="Search bookmarks"
        autocomplete="off"
        spellcheck="false"
      />
      <p id="bm-popup-label" class="bm-popup-label"></p>
      <div id="bm-popup-results"></div>
      <button id="bm-popup-footer" class="bm-popup-footer">
        Go to Journey
      </button>
    `;

    document.documentElement.appendChild(panel);
  }

  setupUI() {
    this.el = {
      panel: document.getElementById('bm-popup'),
      input: document.getElementById('bm-popup-input'),
      label: document.getElementById('bm-popup-label'),
      results: document.getElementById('bm-popup-results'),
      footer: document.getElementById('bm-popup-footer'),
    };

    this.el.input.addEventListener('input', (e) => {
      this.scheduleSearch(e.target.value || '');
    });

    this.el.results.addEventListener('click', (e) => {
      const item = e.target.closest('.bm-popup-item');
      if (item) {
        const idx = parseInt(item.dataset.idx, 10);
        if (!isNaN(idx) && this.flatItems[idx]) {
          this.execute(this.flatItems[idx]);
        }
      }
    });

    this.el.results.addEventListener('mouseover', (e) => {
      const item = e.target.closest('.bm-popup-item');
      if (item) {
        const idx = parseInt(item.dataset.idx, 10);
        if (!isNaN(idx)) this.setSelected(idx);
      }
    });

    this.el.footer.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_MAIN_PAGE' });
      this.close();
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.el.panel.contains(e.target)) {
        this.close();
      }
    }, true);
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const isToggle = isMac
        ? e.metaKey && e.shiftKey && e.key.toLowerCase() === 'e'
        : e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e';

      if (isToggle) {
        e.preventDefault();
        this.toggle();
        return;
      }

      if (!this.isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setSelected(Math.min(this.selectedIndex + 1, this.flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setSelected(Math.max(this.selectedIndex - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.flatItems[this.selectedIndex]) {
          this.execute(this.flatItems[this.selectedIndex]);
        }
      }
    }, true);
  }

  scheduleSearch(query) {
    this.lastQuery = query;
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.handleSearch(query);
    }, this.searchDebounceMs);
  }

  async handleSearch(query) {
    const requestId = ++this.searchRequestId;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'SEARCH', query });
      if (requestId !== this.searchRequestId) return;
      if (!response?.success) { this.renderEmpty(); return; }
      this.renderResults(response.results, query);
    } catch {
      if (requestId !== this.searchRequestId) return;
      this.renderEmpty();
    }
  }

  renderResults(results, query) {
    this.flatItems = [];
    this.selectedIndex = -1;

    const isEmpty = !results || Object.keys(results).every(k => !results[k]?.length);
    if (isEmpty) { this.renderEmpty(); return; }

    const isDefaultView = !query || query.trim() === '';
    let labelText = 'Results';
    if (isDefaultView) {
      labelText = results['Quick Links']?.length ? 'From quick links' : 'From history';
    }
    this.el.label.textContent = labelText;
    this.el.label.style.display = 'block';

    const allItems = [];
    ['Quick Links', 'Bookmarks', 'History', 'Tabs', 'Actions'].forEach(cat => {
      if (results[cat]?.length) results[cat].forEach(item => allItems.push(item));
    });
    Object.keys(results).forEach(cat => {
      if (!['Quick Links', 'Bookmarks', 'History', 'Tabs', 'Actions'].includes(cat) && results[cat]?.length) {
        results[cat].forEach(item => allItems.push(item));
      }
    });

    const visible = allItems.slice(0, 5);
    this.flatItems = visible;

    this.el.results.innerHTML = visible.map((item, i) => {
      const faviconUrl = item.url ? this.getFaviconUrl(item.url) : '';
      const faviconHtml = faviconUrl
        ? `<img class="bm-popup-favicon" src="${faviconUrl}" width="24" height="24" alt="" onerror="this.style.display='none';" />`
        : `<span class="bm-popup-favicon-placeholder"></span>`;
      const title = this.escapeHtml(item.title || item.url || 'Untitled');
      return `
        <div class="bm-popup-item${i === 0 ? ' bm-popup-item--selected' : ''}" data-idx="${i}">
          ${faviconHtml}
          <span class="bm-popup-item-title">${title}</span>
        </div>
      `;
    }).join('');

    if (visible.length > 0) this.selectedIndex = 0;
  }

  renderEmpty() {
    this.flatItems = [];
    this.selectedIndex = -1;
    this.el.label.textContent = 'Results';
    this.el.label.style.display = 'block';
    this.el.results.innerHTML = `<p class="bm-popup-no-results">No matching results</p>`;
  }

  setSelected(idx) {
    this.selectedIndex = idx;
    this.el.results.querySelectorAll('.bm-popup-item').forEach((el, i) => {
      el.classList.toggle('bm-popup-item--selected', i === idx);
    });
  }

  async execute(item) {
    try {
      await chrome.runtime.sendMessage({
        type: 'EXECUTE_RESULT',
        resultType: item.type,
        resultId: item.id,
        metadata: { url: item.url, tabId: item.tabId, title: item.title }
      });
      this.close();
    } catch (e) {
      console.error('[ContentOverlay] Execute error:', e);
    }
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    this.isOpen = true;
    this.el.panel.style.display = 'flex';
    this.el.input.value = '';
    this.el.label.textContent = '';
    this.el.results.innerHTML = '';
    this.el.input.focus();
    this.scheduleSearch('');
  }

  close() {
    this.isOpen = false;
    this.el.panel.style.display = 'none';
    this.searchRequestId++;
    clearTimeout(this.searchDebounceTimer);
  }

  getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=24`;
    } catch {
      return '';
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  injectStyles() {
    if (document.getElementById('bm-popup-styles')) return;

    const style = document.createElement('style');
    style.id = 'bm-popup-styles';
    style.textContent = `
      #bm-popup {
        display: none;
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 2147483647;
        width: 300px;
        flex-direction: column;
        gap: 10px;
        padding: 16px;
        padding-bottom: 56px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(0, 0, 0, 0.4);
        border-radius: 8px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        overflow: hidden;
        box-sizing: border-box;
      }

      #bm-popup-input {
        all: unset;
        display: block;
        width: 100%;
        box-sizing: border-box;
        height: 36px;
        padding: 8px 12px;
        background: rgba(46, 51, 185, 0.4);
        border-radius: 4px;
        font-size: 16px;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1;
        flex-shrink: 0;
      }

      #bm-popup-input::placeholder {
        color: rgba(255, 255, 255, 0.7);
      }

      .bm-popup-label {
        all: unset;
        display: block;
        font-size: 12px;
        font-weight: 300;
        color: rgba(0, 0, 0, 0.6);
        line-height: 1;
        flex-shrink: 0;
      }

      #bm-popup-results {
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }

      .bm-popup-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        min-height: 40px;
        box-sizing: border-box;
      }

      .bm-popup-item:hover,
      .bm-popup-item--selected {
        background: rgba(46, 51, 185, 0.6);
      }

      .bm-popup-item:hover .bm-popup-item-title,
      .bm-popup-item--selected .bm-popup-item-title {
        color: rgba(255, 255, 255, 0.9);
      }

      .bm-popup-item-title {
        font-size: 16px;
        font-weight: 400;
        color: rgba(0, 0, 0, 0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1;
        min-width: 0;
      }

      .bm-popup-favicon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        flex-shrink: 0;
        object-fit: contain;
      }

      .bm-popup-favicon-placeholder {
        display: inline-block;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        flex-shrink: 0;
        background: rgba(0, 0, 0, 0.1);
      }

      .bm-popup-no-results {
        all: unset;
        display: block;
        text-align: center;
        padding: 20px 0;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.4);
        width: 100%;
      }

      .bm-popup-footer {
        all: unset;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 11px 40px;
        background: #e8e8e9;
        border-top: 1px solid rgba(0, 0, 0, 0.15);
        font-size: 16px;
        font-weight: 400;
        color: rgba(0, 0, 0, 0.8);
        cursor: pointer;
        white-space: nowrap;
        box-sizing: border-box;
      }

      .bm-popup-footer:hover {
        background: #dddde0;
      }
    `;

    document.documentElement.appendChild(style);
  }
}

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
