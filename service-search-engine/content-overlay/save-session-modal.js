/**
 * Content Script Save Session Modal
 * A lightweight modal that can be displayed in content script context
 */

const ContentSaveSessionModal = (() => {
  let modalElement = null;
  let currentTabs = [];

  /**
   * Helper: Extract domain from URL
   */
  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  /**
   * Helper: Generate deterministic color for domain
   */
  function getDomainColor(domain) {
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

  /**
   * Helper: Generate letter-based fallback favicon
   */
  function generateLetterFallback(url) {
    const domain = extractDomain(url);
    const letter = domain ? domain.charAt(0).toUpperCase() : '?';
    const color = getDomainColor(domain);
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" fill="${color}" rx="4"/>
        <text x="16" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
              font-size="16" font-weight="600" fill="white">${letter}</text>
      </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  /**
   * Create modal HTML structure
   */
  function createModal() {
    const modal = document.createElement('div');
    modal.id = 'bmg-content-save-session-modal';
    modal.innerHTML = `
      <div class="bmg-modal-backdrop"></div>
      <div class="bmg-modal-container">
        <div class="bmg-modal-header">
          <h2>Save Session</h2>
          <button class="bmg-modal-close" aria-label="Close">×</button>
        </div>
        <div class="bmg-modal-body">
          <div class="bmg-save-info">
            <p id="bmg-save-message">Tabs will be saved in a new folder named: <strong id="bmg-folder-name-preview"></strong></p>
          </div>
          <div class="bmg-tabs-list"></div>
        </div>
        <div class="bmg-modal-footer">
          <button class="bmg-modal-btn bmg-modal-btn-secondary" id="bmg-cancel-btn">Cancel</button>
          <button class="bmg-modal-btn bmg-modal-btn-primary" id="bmg-save-btn">Save</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #bmg-content-save-session-modal * {
        box-sizing: border-box !important;
        direction: ltr !important;
        text-align: left !important;
      }

      #bmg-content-save-session-modal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 2147483647 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        color: #333 !important;
        direction: ltr !important;
      }

      #bmg-content-save-session-modal .bmg-modal-backdrop {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.5) !important;
      }

      #bmg-content-save-session-modal .bmg-modal-container {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: white !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        width: 90% !important;
        max-width: 600px !important;
        max-height: 80vh !important;
        display: flex !important;
        flex-direction: column !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      #bmg-content-save-session-modal .bmg-modal-header {
        padding: 20px 24px !important;
        border-bottom: 1px solid #eee !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin: 0 !important;
      }

      #bmg-content-save-session-modal .bmg-modal-header h2 {
        margin: 0 !important;
        font-size: 20px !important;
        font-weight: 600 !important;
        color: #333 !important;
        padding: 0 !important;
        border: none !important;
        background: none !important;
      }

      #bmg-content-save-session-modal .bmg-modal-close {
        background: none !important;
        border: none !important;
        font-size: 28px !important;
        color: #999 !important;
        cursor: pointer !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 6px !important;
        transition: all 0.2s !important;
        line-height: 1 !important;
      }

      #bmg-content-save-session-modal .bmg-modal-close:hover {
        background: #f5f5f5 !important;
        color: #333 !important;
      }

      #bmg-content-save-session-modal .bmg-modal-body {
        padding: 24px !important;
        overflow-y: auto !important;
        flex: 1 !important;
        margin: 0 !important;
      }

      #bmg-content-save-session-modal .bmg-save-info {
        margin: 0 0 20px 0 !important;
        padding: 16px !important;
        background: #f8f9fa !important;
        border-radius: 8px !important;
        border: 1px solid #e9ecef !important;
      }

      #bmg-content-save-session-modal .bmg-save-info p {
        margin: 0 !important;
        padding: 0 !important;
        font-size: 14px !important;
        color: #495057 !important;
        line-height: 1.5 !important;
      }

      #bmg-content-save-session-modal .bmg-save-info strong {
        color: #007bff !important;
        font-weight: 600 !important;
      }

      #bmg-content-save-session-modal .bmg-tabs-list {
        margin: 0 !important;
        padding: 0 !important;
        max-height: 300px !important;
        overflow-y: auto !important;
        border: 1px solid #ddd !important;
        border-radius: 8px !important;
      }

      #bmg-content-save-session-modal .bmg-tab-item {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 12px !important;
        border-bottom: 1px solid #f0f0f0 !important;
        margin: 0 !important;
        list-style: none !important;
      }

      #bmg-content-save-session-modal .bmg-tab-item:last-child {
        border-bottom: none !important;
      }

      #bmg-content-save-session-modal .bmg-tab-item input[type="checkbox"] {
        width: 18px !important;
        height: 18px !important;
        cursor: pointer !important;
        margin: 0 !important;
        padding: 0 !important;
        flex-shrink: 0 !important;
      }

      #bmg-content-save-session-modal .bmg-tab-favicon {
        width: 16px !important;
        height: 16px !important;
        flex-shrink: 0 !important;
        border-radius: 2px !important;
        object-fit: contain !important;
        margin-left: 4px !important;
      }

      #bmg-content-save-session-modal .bmg-tab-content {
        flex: 1 !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      #bmg-content-save-session-modal .bmg-tab-title {
        font-weight: 500 !important;
        font-size: 14px !important;
        color: #333 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        margin: 0 0 4px 0 !important;
        padding: 0 !important;
        text-align: left !important;
        direction: ltr !important;
      }

      #bmg-content-save-session-modal .bmg-tab-url {
        font-size: 12px !important;
        color: #999 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        margin: 0 !important;
        padding: 0 !important;
        text-align: left !important;
        direction: ltr !important;
      }

      #bmg-content-save-session-modal .bmg-modal-footer {
        padding: 16px 24px !important;
        border-top: 1px solid #eee !important;
        display: flex !important;
        justify-content: flex-end !important;
        gap: 12px !important;
        margin: 0 !important;
        background: white !important;
      }

      #bmg-content-save-session-modal .bmg-modal-btn {
        padding: 10px 24px !important;
        border: none !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
        margin: 0 !important;
        line-height: 1.5 !important;
      }

      #bmg-content-save-session-modal .bmg-modal-btn-secondary {
        background: #f5f5f5 !important;
        color: #333 !important;
      }

      #bmg-content-save-session-modal .bmg-modal-btn-secondary:hover {
        background: #e5e5e5 !important;
      }

      #bmg-content-save-session-modal .bmg-modal-btn-primary {
        background: #007bff !important;
        color: white !important;
      }

      #bmg-content-save-session-modal .bmg-modal-btn-primary:hover {
        background: #0056b3 !important;
      }

      #bmg-content-save-session-modal .bmg-modal-btn-primary:disabled {
        background: #ccc !important;
        cursor: not-allowed !important;
        opacity: 0.6 !important;
      }
    `;

    modal.appendChild(style);
    return modal;
  }

  /**
   * Show the modal
   */
  async function show(tabs) {
    if (modalElement) {
      hide();
    }

    currentTabs = tabs;
    modalElement = createModal();
    document.body.appendChild(modalElement);

    // Generate folder name with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);
    const folderName = `Session - ${timestamp}`;

    // Display folder name preview
    const folderNamePreview = modalElement.querySelector('#bmg-folder-name-preview');
    folderNamePreview.textContent = folderName;

    // Populate tabs list
    const tabsList = modalElement.querySelector('.bmg-tabs-list');
    tabs.forEach((tab, index) => {
      const tabItem = document.createElement('div');
      tabItem.className = 'bmg-tab-item';
      
      // Create checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `bmg-tab-${index}`;
      checkbox.dataset.index = index;
      checkbox.checked = true;
      
      tabItem.appendChild(checkbox);
      
      // Add favicon using Google S2 service
      if (tab.url) {
        const favicon = document.createElement('img');
        const domain = extractDomain(tab.url);
        favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=16`;
        favicon.width = 16;
        favicon.height = 16;
        favicon.className = 'bmg-tab-favicon';
        favicon.alt = 'Favicon';
        favicon.loading = 'lazy';
        
        // Fallback on error
        const fallbackUrl = generateLetterFallback(tab.url);
        favicon.onerror = function() {
          if (!this.dataset.fallbackAttempted) {
            this.dataset.fallbackAttempted = 'true';
            this.src = fallbackUrl;
          }
        };
        
        tabItem.appendChild(favicon);
      }
      
      // Create tab content container
      const tabContent = document.createElement('div');
      tabContent.className = 'bmg-tab-content';
      
      const tabTitle = document.createElement('div');
      tabTitle.className = 'bmg-tab-title';
      tabTitle.textContent = tab.title;
      
      const tabUrl = document.createElement('div');
      tabUrl.className = 'bmg-tab-url';
      tabUrl.textContent = tab.url;
      
      tabContent.appendChild(tabTitle);
      tabContent.appendChild(tabUrl);
      tabItem.appendChild(tabContent);
      
      tabsList.appendChild(tabItem);
    });

    // Event listeners
    const closeBtn = modalElement.querySelector('.bmg-modal-close');
    const cancelBtn = modalElement.querySelector('#bmg-cancel-btn');
    const saveBtn = modalElement.querySelector('#bmg-save-btn');
    const backdrop = modalElement.querySelector('.bmg-modal-backdrop');

    closeBtn.addEventListener('click', hide);
    cancelBtn.addEventListener('click', hide);
    backdrop.addEventListener('click', hide);
    saveBtn.addEventListener('click', handleSave);

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        hide();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Hide the modal
   */
  function hide() {
    if (modalElement) {
      modalElement.remove();
      modalElement = null;
    }
  }

  /**
   * Handle save button click
   */
  async function handleSave() {
    const checkboxes = modalElement.querySelectorAll('.bmg-tabs-list input[type="checkbox"]:checked');
    const selectedTabs = Array.from(checkboxes).map(cb => {
      const index = parseInt(cb.dataset.index);
      return currentTabs[index];
    });

    if (!selectedTabs.length) {
      alert('Please select at least one tab');
      return;
    }

    // Generate folder name with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);
    const folderName = `Session - ${timestamp}`;

    // Save tabs
    const saveBtn = modalElement.querySelector('#bmg-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    chrome.runtime.sendMessage({
      type: 'SAVE_TABS_AS_BOOKMARKS',
      tabs: selectedTabs,
      folderName: folderName
    }, (response) => {
      if (response && response.success) {
        hide();
      } else {
        alert('Failed to save tabs: ' + (response?.error || 'Unknown error'));
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    show,
    hide
  };
})();

// Make available globally in content script
window.ContentSaveSessionModal = ContentSaveSessionModal;
