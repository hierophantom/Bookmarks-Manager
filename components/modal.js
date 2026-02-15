/**
 * Modal Component
 * 
 * Design System Component - BMG-93
 * 
 * @example
 * // Create dialog modal
 * const modal = createModal({
 *   type: 'dialog',
 *   title: 'Delete bookmark?',
 *   subtitle: 'This action cannot be undone',
 *   buttons: [
 *     { label: 'Cancel', type: 'common', shortcut: 'ESC' },
 *     { label: 'Delete', type: 'primary', shortcut: '↵' }
 *   ],
 *   onClose: (result) => console.log(result)
 * });
 * 
 * @example
 * // Create form modal
 * const modal = createModal({
 *   type: 'form',
 *   title: 'Add bookmark',
 *   subtitle: 'Enter bookmark details',
 *   content: formElement,
 *   buttons: [
 *     { label: 'Cancel', type: 'common', shortcut: 'ESC' },
 *     { label: 'Save', type: 'primary', shortcut: '↵' }
 *   ]
 * });
 */

/**
 * Creates a modal dialog
 * @param {Object} options - Modal configuration
 * @param {string} options.type - Modal type: 'dialog' or 'form'
 * @param {string} options.title - Modal title
 * @param {string} [options.subtitle] - Optional subtitle
 * @param {HTMLElement|string} [options.content] - Content element or HTML string
 * @param {Array} options.buttons - Button configurations
 * @param {Function} [options.onClose] - Callback when modal closes
 * @param {Function} [options.onSubmit] - Callback when form is submitted
 * @param {boolean} [options.closeOnEscape=true] - Close on ESC key
 * @param {boolean} [options.closeOnBackdrop=true] - Close on backdrop click
 * @returns {HTMLDivElement} The modal overlay element
 */
function createModal(options = {}) {
  const {
    type = 'dialog',
    title = '',
    subtitle = '',
    content = null,
    buttons = [],
    onClose = null,
    onSubmit = null,
    closeOnEscape = true,
    closeOnBackdrop = true
  } = options;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal-overlay--entering';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title');

  // Create modal
  const modal = document.createElement('div');
  modal.className = `modal modal--${type} modal--entering`;
  
  // Create content section
  const contentSection = document.createElement('div');
  contentSection.className = 'modal__content';
  
  // Add title
  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.id = 'modal-title';
    titleEl.className = 'modal__title';
    titleEl.textContent = title;
    contentSection.appendChild(titleEl);
  }
  
  // Add subtitle
  if (subtitle) {
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'modal__subtitle';
    subtitleEl.textContent = subtitle;
    contentSection.appendChild(subtitleEl);
  }
  
  // Add content
  if (content) {
    if (typeof content === 'string') {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'modal__form';
      contentDiv.innerHTML = content;
      contentSection.appendChild(contentDiv);
    } else if (content instanceof HTMLElement) {
      contentSection.appendChild(content);
    }
  }
  
  modal.appendChild(contentSection);
  
  // Create actions section
  if (buttons.length > 0) {
    const actionsSection = document.createElement('div');
    actionsSection.className = 'modal__actions';
    
    buttons.forEach((btn, index) => {
      const button = document.createElement('button');
      button.className = `modal__button modal__button--${btn.type || 'common'}`;
      button.textContent = btn.label || 'Button';
      
      if (btn.disabled) {
        button.disabled = true;
      }
      
      // Add keyboard shortcut hint if provided
      if (btn.shortcut) {
        const kbd = document.createElement('span');
        kbd.className = 'kbd-hint';
        kbd.textContent = btn.shortcut;
        kbd.style.cssText = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 20px;
          min-width: 20px;
          padding: 0 4px;
          background: var(--common-common-bright-05, rgba(255, 255, 255, 0.1));
          border-radius: var(--corner-radius-pill, 999px);
          font-size: 10px;
          margin-left: 4px;
        `;
        button.appendChild(kbd);
      }
      
      // Handle button click
      button.addEventListener('click', () => {
        if (btn.onClick) {
          btn.onClick();
        }
        
        if (index === 0) {
          // First button (usually cancel)
          closeModal(false);
        } else {
          // Other buttons (usually submit)
          if (onSubmit) {
            const result = onSubmit();
            if (result !== false) {
              closeModal(true);
            }
          } else {
            closeModal(true);
          }
        }
      });
      
      actionsSection.appendChild(button);
    });
    
    modal.appendChild(actionsSection);
  }
  
  overlay.appendChild(modal);
  
  // Close modal function
  function closeModal(confirmed = false) {
    overlay.classList.add('modal-overlay--exiting');
    modal.classList.add('modal--exiting');
    
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      
      if (onClose) {
        onClose(confirmed);
      }
    }, 200);
  }
  
  // Keyboard handling
  function handleKeyDown(e) {
    if (closeOnEscape && e.key === 'Escape') {
      e.preventDefault();
      closeModal(false);
    } else if (e.key === 'Enter' && type === 'form') {
      // Only submit on Enter for form modals
      e.preventDefault();
      if (onSubmit) {
        const result = onSubmit();
        if (result !== false) {
          closeModal(true);
        }
      } else {
        closeModal(true);
      }
    }
  }
  
  document.addEventListener('keydown', handleKeyDown);
  
  // Backdrop click
  overlay.addEventListener('click', (e) => {
    if (closeOnBackdrop && e.target === overlay) {
      closeModal(false);
    }
  });
  
  // Cleanup on remove
  overlay._cleanup = () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
  
  return overlay;
}

/**
 * Shows a modal by appending it to the document body
 * @param {HTMLDivElement} modal - The modal overlay element
 */
function showModal(modal) {
  document.body.appendChild(modal);
  
  // Focus first input if available
  setTimeout(() => {
    const firstInput = modal.querySelector('input, textarea, select');
    if (firstInput) {
      firstInput.focus();
    }
  }, 100);
}

/**
 * Creates and shows a confirmation dialog
 * @param {Object} options - Dialog options
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
function confirmDialog(options = {}) {
  return new Promise((resolve) => {
    const modal = createModal({
      type: 'dialog',
      title: options.title || 'Confirm',
      subtitle: options.subtitle || '',
      buttons: [
        {
          label: options.cancelLabel || 'Cancel',
          type: 'common',
          shortcut: 'ESC'
        },
        {
          label: options.confirmLabel || 'Confirm',
          type: 'primary',
          shortcut: '↵'
        }
      ],
      /**
       * Shows a modal for search engine selection
       * @param {string} currentEngine - Current engine key
       * @param {Function} onSave - Callback with selected engine
       */
      function showSearchEngineSelector(currentEngine, onSave) {
        const engines = [
          { key: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' },
          { key: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
          { key: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
          { key: 'yahoo', name: 'Yahoo', url: 'https://search.yahoo.com/search?p=%s' },
          { key: 'custom', name: 'Custom', url: '' }
        ];
        const form = document.createElement('form');
        form.innerHTML = `
          <label style="margin-bottom:8px;display:block;font-weight:500;">Search Engine</label>
          <select id="search-engine-select" style="width:100%;margin-bottom:12px;">
            ${engines.map(e => `<option value="${e.key}" ${e.key===currentEngine?'selected':''}>${e.name}</option>`).join('')}
          </select>
          <input id="custom-engine-url" type="text" placeholder="Custom search URL (use %s for query)" style="width:100%;margin-bottom:8px;display:none;" />
        `;
        form.querySelector('#search-engine-select').addEventListener('change', e => {
          const val = e.target.value;
          form.querySelector('#custom-engine-url').style.display = val==='custom' ? 'block' : 'none';
        });
        form.querySelector('#search-engine-select').dispatchEvent(new Event('change'));
        const modal = createModal({
          type: 'form',
          title: 'Select Search Engine',
          content: form,
          buttons: [
            { label: 'Cancel', type: 'common', shortcut: 'ESC' },
            { label: 'Save', type: 'primary', shortcut: '↵' }
          ],
          onSubmit: () => {
            const key = form.querySelector('#search-engine-select').value;
            let url = engines.find(e => e.key===key)?.url || '';
            if (key==='custom') url = form.querySelector('#custom-engine-url').value.trim();
            if (!url || !url.includes('%s')) {
              alert('Search URL must include %s for query');
              return false;
            }
            onSave({ key, url });
            return true;
          }
        });
        showModal(modal);
      }
      onClose: (confirmed) => {
        resolve(confirmed);
      }
    });
    
    showModal(modal);
  });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createModal,
    showModal,
    confirmDialog
  };
}
