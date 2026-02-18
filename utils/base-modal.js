/**
 * BaseModal - Unified modal system with Tailwind CSS support
 * Eliminates code duplication across all modal types
 */
class BaseModal {
  constructor(config = {}) {
    this.title = config.title || '';
    this.fields = config.fields || [];
    this.customContent = config.customContent || ''; // Support custom HTML content
    this.confirmText = config.confirmText || 'Save'; // Customizable confirm button text
    this.cancelText = config.cancelText === undefined ? 'Cancel' : config.cancelText; // Customizable cancel button text
    this.confirmVariant = config.confirmVariant || 'primary';
    this.onSubmit = config.onSubmit || (() => {});
    this.onCancel = config.onCancel || (() => {});
    this.resolver = null;
    this.overlay = null;
    this.card = null;
  }

  /**
   * Create or get the modal overlay
   */
  createOverlay() {
    let overlay = document.getElementById('bm-modal-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'bm-modal-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'bm-modal-title');
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    document.body.appendChild(overlay);
    this.overlay = overlay;
    return overlay;
  }

  /**
   * Create the modal card wrapper
   */
  createCard() {
    const card = document.createElement('div');
    card.className = 'bm-modal-card bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4';
    this.card = card;
    return card;
  }

  /**
   * Render the modal title
   */
  renderTitle() {
    if (!this.title) return '';
    return `<h2 id="bm-modal-title" class="text-xl font-bold text-gray-900 mb-4">${this.escapeHtml(this.title)}</h2>`;
  }

  /**
   * Render form fields
   */
  renderFields() {
    return this.fields
      .map((field) => this.renderField(field))
      .join('');
  }

  /**
   * Render a single field
   */
  renderField(field) {
    const { id, label, type = 'text', value = '', placeholder = '', required = false, options = [] } = field;
    const requiredAttr = required ? 'required' : '';
    const requiredLabel = required ? '<span class="text-red-500">*</span>' : '';

    // Handle select fields
    if (type === 'select') {
      return `
        <div class="bm-field mb-4">
          <label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">
            ${this.escapeHtml(label)} ${requiredLabel}
          </label>
          <select
            id="${id}"
            ${requiredAttr}
            aria-label="${this.escapeHtml(label)}"
            aria-required="${required}"
            class="bm-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            ${options.map(opt => `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${this.escapeHtml(opt.label)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    const inputAttrs = `
      id="${id}"
      type="${type}"
      value="${this.escapeHtml(value)}"
      placeholder="${placeholder}"
      ${requiredAttr}
      aria-label="${this.escapeHtml(label)}"
      aria-required="${required}"
      class="bm-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    `;

    return `
      <div class="bm-field mb-4">
        <label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">
          ${this.escapeHtml(label)} ${requiredLabel}
        </label>
        <input ${inputAttrs} />
      </div>
    `;
  }

  /**
   * Render action buttons
   */
  renderActions() {
    const confirmBtnClass = this.confirmVariant === 'destructive'
      ? 'bm-btn-submit flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors'
      : 'bm-btn-submit flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium transition-colors';

    const cancelButtonHtml = this.cancelText === null ? '' : `
        <button id="bm-modal-cancel" type="button" aria-label="Cancel and close modal" class="bm-btn-cancel flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors">
          ${this.escapeHtml(this.cancelText)}
        </button>
      `;

    return `
      <div class="bm-modal-actions flex gap-3 mt-6" role="group" aria-label="Modal actions">
        ${cancelButtonHtml}
        <button id="bm-modal-submit" type="submit" aria-label="Save changes" class="${confirmBtnClass}">
          ${this.escapeHtml(this.confirmText)}
        </button>
      </div>
    `;
  }

  /**
   * Build complete modal HTML
   */
  getHTML() {
    return `
      ${this.renderTitle()}
      <form class="bm-modal-form" id="bm-modal-form">
        ${this.customContent}
        ${this.renderFields()}
        ${this.renderActions()}
      </form>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const form = this.card.querySelector('#bm-modal-form');
    const submitBtn = this.card.querySelector('#bm-modal-submit');
    const cancelBtn = this.card.querySelector('#bm-modal-cancel');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleSubmit());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // Focus trap: get all focusable elements
    const focusableElements = this.card.querySelectorAll(
      'input, button, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Set initial focus to first input or button
    const firstInput = this.card.querySelector('input, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    } else if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 50);
    }

    // Keyboard accessibility: Escape to close and Tab trap
    this.keydownHandler = (e) => {
      // Only handle if this modal is visible
      if (!document.body.contains(this.overlay)) return;

      // Escape key to close
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }

      // Tab trap: cycle focus within modal
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift+Tab: if on first element, go to last
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab: if on last element, go to first
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', this.keydownHandler, true);
  }

  /**
   * Get form data
   */
  getFormData() {
    console.log('[BaseModal] getFormData - starting');
    const formData = {};
    const form = this.card.querySelector('#bm-modal-form');
    if (!form) {
      console.log('[BaseModal] getFormData - no form found!');
      return formData;
    }

    // Get inputs
    const inputs = form.querySelectorAll('input');
    console.log('[BaseModal] getFormData - found', inputs.length, 'inputs');
    
    inputs.forEach((input) => {
      console.log('[BaseModal] getFormData - processing input:', input.id);
      // For Tagify fields, extract tags from the Tagify instance
      if (input.id === 'bm_tags' && input.tagify) {
        console.log('[BaseModal] getFormData - extracting from Tagify for', input.id);
        const tags = input.tagify.value.map(item => 
          typeof item === 'string' ? item : item.value
        );
        console.log('[BaseModal] getFormData - Tagify tags:', tags);
        formData[input.id] = tags;
      } else if (input.id === 'bm_tags') {
        console.log('[BaseModal] getFormData - bm_tags input but no tagify instance!', {
          hasTagify: !!input.tagify,
          inputValue: input.value
        });
        formData[input.id] = [];
      } else {
        const value = input.value.trim();
        console.log('[BaseModal] getFormData - regular input:', input.id, '=', value);
        formData[input.id] = value;
      }
    });

    // Get selects
    const selects = form.querySelectorAll('select');
    console.log('[BaseModal] getFormData - found', selects.length, 'selects');
    selects.forEach((select) => {
      console.log('[BaseModal] getFormData - processing select:', select.id, '=', select.value);
      formData[select.id] = select.value;
    });

    console.log('[BaseModal] getFormData - complete:', formData);
    return formData;
  }

  /**
   * Validate form data
   */
  validateFormData(data) {
    for (const field of this.fields) {
      if (field.required && !data[field.id]) {
        if (typeof Modal !== 'undefined' && typeof Modal.openError === 'function') {
          Modal.openError({
            title: 'Missing Field',
            message: `${field.label} is required`
          });
        }
        return false;
      }

      // URL validation
      if (field.type === 'url' && data[field.id]) {
        if (!this.isValidUrl(data[field.id])) {
          if (typeof Modal !== 'undefined' && typeof Modal.openError === 'function') {
            Modal.openError({
              title: 'Invalid URL',
              message: `${field.label} appears invalid`
            });
          }
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Handle form submission
   */
  handleSubmit() {
    console.log('[BaseModal] handleSubmit - getting form data');
    const data = this.getFormData();
    console.log('[BaseModal] handleSubmit - form data:', data);
    
    if (!this.validateFormData(data)) {
      console.log('[BaseModal] handleSubmit - validation failed');
      return;
    }

    console.log('[BaseModal] handleSubmit - resolving promise before closing modal');
    if (this.resolver) {
      this.resolver(data);
    }
    
    console.log('[BaseModal] handleSubmit - closing modal');
    this.close();
    
    if (this.onSubmit) {
      this.onSubmit(data);
    }
  }

  /**
   * Close the modal
   */
  close() {
    // Clean up keyboard event listener
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }
    
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    // Resolve with null to indicate cancellation
    if (this.resolver) {
      this.resolver(null);
      this.resolver = null;
    }
    
    if (this.onCancel) {
      this.onCancel();
    }
  }

  /**
   * Show the modal as a promise
   */
  show() {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.createOverlay();
      const card = this.createCard();
      card.innerHTML = this.getHTML();
      this.overlay.appendChild(card);
      this.attachEventListeners();
      
      // Initialize any special field handlers (like Tagify)
      // Call initializeTagify if it exists in Modal namespace
      if (typeof Modal !== 'undefined' && typeof Modal.initializeTagify === 'function') {
        setTimeout(() => Modal.initializeTagify(), 10);
      }
    });
  }

  /**
   * Utility: Validate URL
   */
  isValidUrl(url) {
    try {
      if (!url) return true;
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Utility: Escape HTML
   */
  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
