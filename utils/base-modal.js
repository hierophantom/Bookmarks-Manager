/**
 * BaseModal - Unified modal system with Tailwind CSS support
 * Eliminates code duplication across all modal types
 */
class BaseModal {
  constructor(config = {}) {
    this.title = config.title || '';
    this.fields = config.fields || [];
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
    return `<h2 class="text-xl font-bold text-gray-900 mb-4">${this.escapeHtml(this.title)}</h2>`;
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
    const { id, label, type = 'text', value = '', placeholder = '', required = false } = field;
    const requiredAttr = required ? 'required' : '';
    const requiredLabel = required ? '<span class="text-red-500">*</span>' : '';

    const inputAttrs = `
      id="${id}"
      type="${type}"
      value="${this.escapeHtml(value)}"
      placeholder="${placeholder}"
      ${requiredAttr}
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
    return `
      <div class="bm-modal-actions flex gap-3 mt-6">
        <button id="bm-modal-cancel" class="bm-btn-cancel flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium transition-colors">
          Cancel
        </button>
        <button id="bm-modal-submit" class="bm-btn-submit flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium transition-colors">
          Save
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
      // Prevent default form submission (Enter key triggers this)
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Don't call handleSubmit - only allow explicit triggers
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleSubmit());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // Keyboard accessibility: Escape to close, Cmd/Ctrl+Enter to submit
    document.addEventListener('keydown', (e) => {
      // Only handle if this modal is visible
      if (!document.body.contains(this.overlay)) return;

      // Escape key to close
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }

      // Cmd+Enter or Ctrl+Enter to submit (not plain Enter)
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.handleSubmit();
      }
    }, true);

    // Focus first input
    const firstInput = this.card.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 0);
    }
  }

  /**
   * Get form data
   */
  getFormData() {
    const formData = {};
    const form = this.card.querySelector('#bm-modal-form');
    if (!form) return formData;

    const inputs = form.querySelectorAll('input');
    inputs.forEach((input) => {
      formData[input.id] = input.value.trim();
    });

    return formData;
  }

  /**
   * Validate form data
   */
  validateFormData(data) {
    for (const field of this.fields) {
      if (field.required && !data[field.id]) {
        alert(`${field.label} is required`);
        return false;
      }

      // URL validation
      if (field.type === 'url' && data[field.id]) {
        if (!this.isValidUrl(data[field.id])) {
          alert(`${field.label} appears invalid`);
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
    const data = this.getFormData();
    
    if (!this.validateFormData(data)) {
      return;
    }

    this.close();
    if (this.resolver) {
      this.resolver(data);
    }
    if (this.onSubmit) {
      this.onSubmit(data);
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
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
