/**
 * Active Sessions Panel
 *
 * Design System Component - BMG-129
 *
 * Right side panel for viewing and managing active sessions/tabs.
 * Extends the base side-panel with session items and zero state.
 *
 * @example
 * const sessionsPanel = createActiveSessionsPanel({
 *   docked: true,
 *   onClose: () => console.log('closed'),
 *   onViewSession: (session) => console.log('viewing', session)
 * });
 *
 * // Add a session
 * sessionsPanel.addSession({
 *   id: 'session-1',
 *   label: 'Work - Tab 1',
 *   tabCount: 4
 * });
 */

/**
 * Creates an active sessions panel
 * @param {Object} options - Panel configuration
 * @param {boolean} [options.docked=false] - Initial docked state
 * @param {Function} [options.onClose] - Close handler
 * @param {Function} [options.onToggleMode] - Mode toggle handler
 * @param {Function} [options.onViewSession] - Session selection handler
 * @param {boolean} [options.visible=true] - Initial visibility
 * @returns {Object} Panel object with session-specific methods
 */
function createActiveSessionsPanel(options = {}) {
  const {
    docked = false,
    onClose = null,
    onToggleMode = null,
    onViewSession = null,
    visible = true
  } = options;

  // Create base side panel
  const panel = createSidePanel({
    title: 'Active Tabs',
    position: 'right',
    docked: docked,
    onClose: onClose,
    onToggleMode: onToggleMode
  });

  if (!panel) {
    return null;
  }

  // Add sessions-panel specific class
  panel.element.classList.add('active-sessions-panel');
  panel.content.classList.add('active-sessions-panel__content');

  // Track sessions
  const sessions = new Map();
  let hasContent = false;

  // Create and add zero state element
  const zeroState = document.createElement('div');
  zeroState.className = 'active-sessions-panel__zero-state';
  zeroState.innerHTML = '<p>No active tabs</p>';
  panel.content.appendChild(zeroState);

  /**
   * Update zero state visibility
   */
  function updateZeroState() {
    const isEmpty = sessions.size === 0;
    if (isEmpty) {
      zeroState.style.display = 'flex';
    } else {
      zeroState.style.display = 'none';
    }
  }

  // Return extended panel with session methods
  return Object.assign(panel, {
    /**
     * Add a session/tab item
     * @param {Object} options - Session options
     * @param {string} options.id - Unique session ID
     * @param {string} options.label - Session label
     * @param {Function} [options.onView] - Open/view handler
     * @param {Function} [options.onRemove] - Remove handler
     * @returns {HTMLElement} The session item element
     */
    addSession(options = {}) {
      const {
        id = '',
        label = 'Untitled Session',
        onView = null,
        onRemove = null
      } = options;

      if (!id) {
        console.error('Session requires an id');
        return null;
      }

      // Create session item container
      const item = document.createElement('div');
      item.className = 'active-sessions-panel__item';
      item.setAttribute('data-session-id', id);

      // Session header
      const header = document.createElement('div');
      header.className = 'active-sessions-panel__item-header';

      // Label
      const labelEl = document.createElement('span');
      labelEl.className = 'active-sessions-panel__item-label';
      labelEl.textContent = label;
      header.appendChild(labelEl);

      // Controls
      const controls = document.createElement('div');
      controls.className = 'active-sessions-panel__item-controls';

      // View button
      const viewBtn = document.createElement('button');
      viewBtn.className = 'active-sessions-panel__item-btn active-sessions-panel__item-btn--view';
      viewBtn.type = 'button';
      viewBtn.setAttribute('aria-label', 'Open session');
      viewBtn.innerHTML = '<span class="material-symbols-outlined">open_in_new</span>';
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onView === 'function') {
          onView();
        }
        if (typeof onViewSession === 'function') {
          onViewSession({ id, label });
        }
      });
      controls.appendChild(viewBtn);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'active-sessions-panel__item-btn active-sessions-panel__item-btn--remove';
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', 'Remove session');
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeSession(id);
        if (typeof onRemove === 'function') {
          onRemove();
        }
      });
      controls.appendChild(removeBtn);

      header.appendChild(controls);
      item.appendChild(header);

      // Store reference
      sessions.set(id, { element: item, options });

      // Insert before zero state or at end
      if (zeroState.parentNode === panel.content) {
        panel.content.insertBefore(item, zeroState);
      } else {
        panel.content.appendChild(item);
      }

      updateZeroState();
      return item;
    },

    /**
     * Remove a session
     * @param {string} id - Session ID
     */
    removeSession(id) {
      if (sessions.has(id)) {
        const { element } = sessions.get(id);
        element.remove();
        sessions.delete(id);
        updateZeroState();
      }
    },

    /**
     * Update a session
     * @param {string} id - Session ID
     * @param {Object} updates - Properties to update
     */
    updateSession(id, updates) {
      if (!sessions.has(id)) return;

      const { element, options } = sessions.get(id);

      if (updates.label !== undefined) {
        const labelEl = element.querySelector('.active-sessions-panel__item-label');
        if (labelEl) {
          labelEl.textContent = updates.label;
          options.label = updates.label;
        }
      }
    },

    /**
     * Get all sessions
     * @returns {Array} Array of sessions
     */
    getSessions() {
      return Array.from(sessions.entries()).map(([id, { options }]) => ({
        id,
        ...options
      }));
    },

    /**
     * Clear all sessions
     */
    clearSessions() {
      sessions.forEach(({ element }) => {
        element.remove();
      });
      sessions.clear();
      updateZeroState();
    },

    /**
     * Check if panel has sessions
     * @returns {boolean}
     */
    hasSessions() {
      return sessions.size > 0;
    }
  });
}