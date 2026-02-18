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

  // Track legacy sessions and grouped windows
  const sessions = new Map();
  const windowGroups = new Map();

  // Create and add zero state element
  const zeroState = document.createElement('div');
  zeroState.className = 'active-sessions-panel__zero-state';
  zeroState.innerHTML = '<p>No active tabs</p>';
  panel.content.appendChild(zeroState);

  function hasContent() {
    return sessions.size > 0 || windowGroups.size > 0;
  }

  /**
   * Update zero state visibility
   */
  function updateZeroState() {
    const isEmpty = !hasContent();
    if (isEmpty) {
      zeroState.style.display = 'flex';
    } else {
      zeroState.style.display = 'none';
    }
  }

  function createTabItem(tab, handlers = {}) {
    const tabItem = document.createElement('div');
    tabItem.className = 'active-sessions-panel__tab-item';

    const tabTitle = tab.title || tab.url || 'Untitled tab';
    const tabUrl = tab.url || '';

    if (tabUrl) {
      tabItem.title = tabUrl;
    }

    if (typeof FaviconService !== 'undefined' && tabUrl) {
      const favicon = FaviconService.createFaviconElement(tabUrl, {
        size: 24,
        className: 'active-sessions-panel__tab-favicon',
        alt: 'Site icon'
      });
      tabItem.appendChild(favicon);
    } else {
      const fallbackIcon = document.createElement('span');
      fallbackIcon.className = 'active-sessions-panel__tab-favicon material-symbols-outlined';
      fallbackIcon.textContent = 'public';
      fallbackIcon.setAttribute('aria-hidden', 'true');
      tabItem.appendChild(fallbackIcon);
    }

    const textWrap = document.createElement('div');
    textWrap.className = 'active-sessions-panel__tab-text';

    const titleEl = document.createElement('span');
    titleEl.className = 'active-sessions-panel__tab-title';
    titleEl.setAttribute('dir', 'auto');
    titleEl.textContent = tabTitle;
    textWrap.appendChild(titleEl);

    const urlEl = document.createElement('span');
    urlEl.className = 'active-sessions-panel__tab-url';
    urlEl.setAttribute('dir', 'auto');
    urlEl.textContent = tabUrl;
    textWrap.appendChild(urlEl);

    tabItem.appendChild(textWrap);

    const actions = document.createElement('div');
    actions.className = 'active-sessions-panel__tab-actions';
    tabItem.appendChild(actions);

    return tabItem;
  }

  // Return extended panel with session methods
  return Object.assign(panel, {
    /**
     * Add a grouped window section with tabs and save action
     * @param {Object} options
     * @param {string|number} options.id
     * @param {string} options.label
     * @param {Array<Object>} options.tabs
     * @param {Function} [options.onOpenTab]
     * @param {Function} [options.onSaveSession]
     * @returns {HTMLElement|null}
     */
    addWindowGroup(options = {}) {
      const {
        id = '',
        label = 'Window',
        tabs = [],
        onOpenTab = null,
        onSaveSession = null,
        onExportSession = null
      } = options;

      if (!id) {
        console.error('Window group requires an id');
        return null;
      }

      const normalizedTabs = Array.isArray(tabs)
        ? tabs.filter((tab) => tab && (tab.id || tab.url))
        : [];

      const groupEl = document.createElement('section');
      groupEl.className = 'active-sessions-panel__group';
      groupEl.setAttribute('data-window-id', String(id));

      const titleEl = document.createElement('h4');
      titleEl.className = 'active-sessions-panel__group-title';
      titleEl.textContent = label;
      groupEl.appendChild(titleEl);

      const tabsEl = document.createElement('div');
      tabsEl.className = 'active-sessions-panel__group-tabs';

      normalizedTabs.forEach((tab) => {
        const tabItem = createTabItem(tab);
        tabsEl.appendChild(tabItem);
      });

      groupEl.appendChild(tabsEl);

      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'active-sessions-panel__group-actions';

      let saveButton;
      if (typeof createPrimaryButton === 'function') {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined active-sessions-panel__save-icon';
        icon.textContent = 'arrow_insert';

        saveButton = createPrimaryButton({
          label: 'Save session',
          icon,
          contrast: 'high',
          onClick: async (event) => {
            event?.preventDefault?.();
            if (typeof onSaveSession === 'function') {
              await onSaveSession(normalizedTabs.slice());
            }
          }
        });
      } else {
        saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save session';
        saveButton.addEventListener('click', async (event) => {
          event?.preventDefault?.();
          if (typeof onSaveSession === 'function') {
            await onSaveSession(normalizedTabs.slice());
          }
        });
      }

      saveButton.classList.add('active-sessions-panel__save-btn');
      actionsWrap.appendChild(saveButton);

      let exportButton;
      if (typeof createCommonButton === 'function') {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined active-sessions-panel__export-icon';
        icon.textContent = 'ios_share';

        exportButton = createCommonButton({
          label: 'Export session',
          icon,
          contrast: 'low',
          onClick: async (event) => {
            event?.preventDefault?.();
            let exported = false;
            if (typeof onExportSession === 'function') {
              exported = await onExportSession(normalizedTabs.slice());
            }

            if (exported) {
              if (typeof updateCommonButtonLabel === 'function') {
                updateCommonButtonLabel(exportButton, 'Copied to clipboard');
              } else {
                exportButton.textContent = 'Copied to clipboard';
              }

              setTimeout(() => {
                if (typeof updateCommonButtonLabel === 'function') {
                  updateCommonButtonLabel(exportButton, 'Export session');
                } else {
                  exportButton.textContent = 'Export session';
                }
              }, 1400);
            }
          }
        });
      } else {
        exportButton = document.createElement('button');
        exportButton.type = 'button';
        exportButton.textContent = 'Export session';
        exportButton.addEventListener('click', async (event) => {
          event?.preventDefault?.();
          let exported = false;
          if (typeof onExportSession === 'function') {
            exported = await onExportSession(normalizedTabs.slice());
          }

          if (exported) {
            exportButton.textContent = 'Copied to clipboard';
            setTimeout(() => {
              exportButton.textContent = 'Export session';
            }, 1400);
          }
        });
      }

      exportButton.classList.add('active-sessions-panel__export-btn');
      actionsWrap.appendChild(exportButton);

      groupEl.appendChild(actionsWrap);

      if (zeroState.parentNode === panel.content) {
        panel.content.insertBefore(groupEl, zeroState);
      } else {
        panel.content.appendChild(groupEl);
      }

      windowGroups.set(String(id), {
        element: groupEl,
        options: {
          id,
          label,
          tabs: normalizedTabs,
          onOpenTab,
          onSaveSession,
          onExportSession
        }
      });

      updateZeroState();
      return groupEl;
    },

    /**
     * Clear grouped windows
     */
    clearWindowGroups() {
      windowGroups.forEach(({ element }) => {
        element.remove();
      });
      windowGroups.clear();
      updateZeroState();
    },

    /**
     * Get grouped windows
     */
    getWindowGroups() {
      return Array.from(windowGroups.values()).map(({ options }) => ({
        ...options,
        tabs: Array.isArray(options.tabs) ? options.tabs.slice() : []
      }));
    },

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
      this.clearWindowGroups();
      updateZeroState();
    },

    /**
     * Check if panel has sessions
     * @returns {boolean}
     */
    hasSessions() {
      return hasContent();
    }
  });
}