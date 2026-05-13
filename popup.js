/**
 * Popup - Native extension toolbar popup
 * Design: BMG-239 (Figma node 317:10241)
 * Runs in extension context — direct bridge messaging
 */

(function () {
  let selectedIndex = -1;
  let flatItems = [];
  let searchDebounceTimer = null;
  let searchRequestId = 0;
  const DEBOUNCE_MS = 180;

  const el = {
    input: document.getElementById('bm-popup-input'),
    label: document.getElementById('bm-popup-label'),
    results: document.getElementById('bm-popup-results'),
    footer: document.getElementById('bm-popup-footer'),
  };

  // ── Init ────────────────────────────────────────────────────────────────────

  function init() {
    el.input.addEventListener('input', (e) => scheduleSearch(e.target.value || ''));

    el.results.addEventListener('click', (e) => {
      const item = e.target.closest('.bm-popup-item');
      if (item) {
        const idx = parseInt(item.dataset.idx, 10);
        if (!isNaN(idx) && flatItems[idx]) execute(flatItems[idx]);
      }
    });

    el.results.addEventListener('mouseover', (e) => {
      const item = e.target.closest('.bm-popup-item');
      if (item) {
        const idx = parseInt(item.dataset.idx, 10);
        if (!isNaN(idx)) setSelected(idx);
      }
    });

    el.footer.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_MAIN_PAGE' });
      window.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { window.close(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(Math.min(selectedIndex + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(Math.max(selectedIndex - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && flatItems[selectedIndex]) execute(flatItems[selectedIndex]);
      }
    });

    // Load default results on open
    scheduleSearch('');
    el.input.focus();
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  function scheduleSearch(query) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => handleSearch(query), DEBOUNCE_MS);
  }

  async function handleSearch(query) {
    const requestId = ++searchRequestId;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SEARCH', query });
      if (requestId !== searchRequestId) return;
      if (!response?.success) { renderEmpty(); return; }
      renderResults(response.results, query);
    } catch {
      if (requestId !== searchRequestId) return;
      renderEmpty();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  function renderResults(results, query) {
    flatItems = [];
    selectedIndex = -1;

    const isEmpty = !results || Object.keys(results).every(k => !results[k]?.length);
    if (isEmpty) { renderEmpty(); return; }

    const isDefaultView = !query || query.trim() === '';
    const labelText = isDefaultView
      ? (results['Quick Links']?.length ? 'From quick links' : 'From history')
      : 'Results';

    el.label.textContent = labelText;
    el.label.style.display = 'block';

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
    flatItems = visible;

    el.results.innerHTML = '';
    visible.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = `bm-popup-item${i === 0 ? ' bm-popup-item--selected' : ''}`;
      row.dataset.idx = String(i);

      if (item.url && typeof FaviconService !== 'undefined' && typeof FaviconService.createFaviconElement === 'function') {
        row.appendChild(FaviconService.createFaviconElement(item.url, {
          size: 24,
          className: 'bm-popup-favicon',
          alt: ''
        }));
      } else if (item.url) {
        const fallbackImg = document.createElement('img');
        fallbackImg.className = 'bm-popup-favicon';
        fallbackImg.width = 24;
        fallbackImg.height = 24;
        fallbackImg.loading = 'lazy';
        fallbackImg.alt = '';

        try {
          fallbackImg.src = `${new URL(item.url).origin}/favicon.ico`;
        } catch {
          const placeholder = document.createElement('span');
          placeholder.className = 'bm-popup-favicon-placeholder';
          row.appendChild(placeholder);
        }

        if (fallbackImg.src) {
          row.appendChild(fallbackImg);
        }
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'bm-popup-favicon-placeholder';
        row.appendChild(placeholder);
      }

      const title = document.createElement('span');
      title.className = 'bm-popup-item-title';
      title.textContent = item.title || item.url || 'Untitled';
      row.appendChild(title);

      el.results.appendChild(row);
    });

    if (visible.length > 0) selectedIndex = 0;
  }

  function renderEmpty() {
    flatItems = [];
    selectedIndex = -1;
    el.label.textContent = 'Results';
    el.label.style.display = 'block';
    el.results.innerHTML = `<p class="bm-popup-no-results">No matching results</p>`;
  }

  function setSelected(idx) {
    selectedIndex = idx;
    el.results.querySelectorAll('.bm-popup-item').forEach((item, i) => {
      item.classList.toggle('bm-popup-item--selected', i === idx);
    });
  }

  // ── Execute ─────────────────────────────────────────────────────────────────

  async function execute(item) {
    try {
      await chrome.runtime.sendMessage({
        type: 'EXECUTE_RESULT',
        resultType: item.type,
        resultId: item.id,
        metadata: { url: item.url, tabId: item.tabId, title: item.title }
      });
      window.close();
    } catch (e) {
      console.error('[Popup] Execute error:', e);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  // ── Start ───────────────────────────────────────────────────────────────────
  init();
})();