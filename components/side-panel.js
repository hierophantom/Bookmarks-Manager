/**
 * Side Panel Component
 *
 * Design System Component - Base Panel for BMG-128, BMG-129
 *
 * Generic reusable side panel container with:
 * - Header (title + controls)
 * - Scrollable content
 * - Float state
 *
 * @example
 * const panel = createSidePanel({
 *   title: 'My Panel',
 *   position: 'left',
 *   onClose: () => console.log('closed'),
 *   onToggleMode: () => console.log('toggled')
 * });
 * panel.setContent(contentElement);
 */

/**
 * Creates a generic side panel element
 * @param {Object} options - Panel configuration
 * @param {string} options.title - Panel title (required)
 * @param {string} [options.position='left'] - 'left' or 'right'
 * @param {Function} [options.onClose] - Close button handler
 * @param {Function} [options.onToggleMode] - Minimize/dock button handler (unused)
 * @param {boolean} [options.docked=false] - Initial docked state (unused)
 * @returns {Object} Panel object with methods
 */
function createSidePanel(options = {}) {
  const {
    title = '',
    position = 'left',
    onClose = null,
    onToggleMode = null,
    docked = false
  } = options;

  if (!title) {
    console.error('Side panel requires a title');
    return null;
  }

  if (!['left', 'right'].includes(position)) {
    console.error('Position must be "left" or "right"');
    return null;
  }

  // Create main container
  const container = document.createElement('div');
  container.className = `side-panel side-panel--${position}`;
  container.setAttribute('role', 'complementary');
  container.setAttribute('aria-label', title);

  container.classList.add('side-panel--float');

  // Create header
  const header = document.createElement('div');
  header.className = 'side-panel__header';

  // Create title
  const titleEl = document.createElement('h3');
  titleEl.className = 'side-panel__title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  // Create controls
  const controls = document.createElement('div');
  controls.className = 'side-panel__controls';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'side-panel__btn side-panel__btn--close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close panel');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  });
  controls.appendChild(closeBtn);

  header.appendChild(controls);
  container.appendChild(header);

  // Create content area
  const content = document.createElement('div');
  content.className = 'side-panel__content';
  container.appendChild(content);

  // Return panel object with methods
  const panel = {
    element: container,
    header: header,
    content: content,

    /**
     * Set content element
     * @param {HTMLElement} element - Content to display
     */
    setContent(element) {
      if (element instanceof HTMLElement) {
        content.innerHTML = '';
        content.appendChild(element);
      } else if (typeof element === 'string') {
        content.innerHTML = element;
      }
    },

    /**
     * Append content element
     * @param {HTMLElement} element - Element to append
     */
    appendContent(element) {
      if (element instanceof HTMLElement) {
        content.appendChild(element);
      }
    },

    /**
     * Clear content
     */
    clearContent() {
      content.innerHTML = '';
    },

    /**
     * Update title
     * @param {string} newTitle - New title text
     */
    setTitle(newTitle) {
      titleEl.textContent = newTitle;
      container.setAttribute('aria-label', newTitle);
    },

    /**
     * Toggle float/docked mode
     */
    toggleMode() {
      container.classList.toggle('side-panel--float');
      container.classList.toggle('side-panel--docked');
    },

    /**
     * Set to float mode
     */
    setFloat() {
      container.classList.remove('side-panel--docked');
      container.classList.add('side-panel--float');
    },

    /**
     * Set to docked mode
     */
    setDocked() {
      container.classList.remove('side-panel--float');
      container.classList.add('side-panel--docked');
    },

    /**
     * Check if docked
     * @returns {boolean}
     */
    isDocked() {
      return container.classList.contains('side-panel--docked');
    },

    /**
     * Show panel
     */
    show() {
      container.classList.add('side-panel--visible');
    },

    /**
     * Hide panel
     */
    hide() {
      container.classList.remove('side-panel--visible');
    },

    /**
     * Check if visible
     * @returns {boolean}
     */
    isVisible() {
      return container.classList.contains('side-panel--visible');
    }
  };

  return panel;
}
