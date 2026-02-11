/**
 * Tab Component
 * 
 * Design System Component - BMG-91
 * 
 * @example
 * // Create a tab
 * const tab = createTab({
 *   label: 'All Bookmarks',
 *   subtitle: '150 items',
 *   active: true,
 *   onClick: () => showBookmarks()
 * });
 * 
 * @example
 * // Create tab group
 * const tabs = createTabGroup([
 *   { label: 'All', subtitle: '150' },
 *   { label: 'Recent', subtitle: '25' },
 *   { label: 'Favorites', subtitle: '42', active: true }
 * ], (index, tab) => console.log(`Tab ${index} clicked`));
 */

/**
 * Creates a tab element
 * @param {Object} options - Tab configuration
 * @param {string} options.label - Tab label text
 * @param {string} [options.subtitle] - Optional subtitle text
 * @param {boolean} [options.active=false] - Whether tab is active
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Whether tab is disabled
 * @param {string} [options.iconSrc] - Custom icon source (default: chevron)
 * @returns {HTMLButtonElement} The tab element
 */
function createTab(options = {}) {
  const {
    label = '',
    subtitle = '',
    active = false,
    onClick = null,
    disabled = false,
    iconSrc = null
  } = options;

  if (!label) {
    console.error('Tab requires a label');
    return null;
  }

  // Create button element
  const button = document.createElement('button');
  button.className = 'tab';
  button.type = 'button';
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-selected', active.toString());
  
  if (active) {
    button.classList.add('tab--active');
  } else {
    button.classList.add('tab--idle');
  }
  
  if (disabled) {
    button.disabled = true;
    button.classList.add('tab--disabled');
  }

  // Create content container
  const content = document.createElement('div');
  content.className = 'tab__content';

  // Create label
  const labelEl = document.createElement('span');
  labelEl.className = 'tab__label';
  labelEl.textContent = label;
  content.appendChild(labelEl);

  // Create subtitle if provided
  if (subtitle) {
    const subtitleEl = document.createElement('span');
    subtitleEl.className = 'tab__subtitle';
    subtitleEl.textContent = subtitle;
    content.appendChild(subtitleEl);
  }

  button.appendChild(content);

  // Create icon (chevron)
  const icon = document.createElement('img');
  icon.className = 'tab__icon';
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  
  if (iconSrc) {
    icon.src = iconSrc;
  } else {
    // Default chevron right icon
    icon.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 5l7 7-7 7' /%3E%3C/svg%3E";
  }
  
  button.appendChild(icon);

  // Attach click handler
  if (onClick && typeof onClick === 'function') {
    button.addEventListener('click', () => onClick(button));
  }

  return button;
}

/**
 * Creates a tab group with multiple tabs
 * @param {Array<Object>} tabs - Array of tab configurations
 * @param {Function} [onTabClick] - Handler called with (index, tab, button) when tab is clicked
 * @param {string} [containerClass] - Optional class for container
 * @returns {HTMLDivElement} The tab group container
 */
function createTabGroup(tabs = [], onTabClick = null, containerClass = '') {
  const container = document.createElement('div');
  container.className = `tab-group ${containerClass}`.trim();
  container.setAttribute('role', 'tablist');

  tabs.forEach((tabConfig, index) => {
    const tab = createTab({
      ...tabConfig,
      onClick: (button) => {
        // Update active state
        setActiveTab(container, index);
        
        // Call custom handler
        if (onTabClick && typeof onTabClick === 'function') {
          onTabClick(index, tabConfig, button);
        }
      }
    });
    
    if (tab) {
      container.appendChild(tab);
    }
  });

  return container;
}

/**
 * Sets the active tab in a tab group
 * @param {HTMLElement} tabGroup - The tab group container
 * @param {number} index - Index of tab to activate
 */
function setActiveTab(tabGroup, index) {
  const tabs = tabGroup.querySelectorAll('.tab');
  tabs.forEach((tab, i) => {
    const isActive = i === index;
    tab.classList.toggle('tab--active', isActive);
    tab.classList.toggle('tab--idle', !isActive);
    tab.setAttribute('aria-selected', isActive.toString());
  });
}

/**
 * Updates tab label
 * @param {HTMLButtonElement} tab - The tab element
 * @param {string} label - New label text
 */
function updateTabLabel(tab, label) {
  const labelEl = tab.querySelector('.tab__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

/**
 * Updates tab subtitle
 * @param {HTMLButtonElement} tab - The tab element
 * @param {string} subtitle - New subtitle text
 */
function updateTabSubtitle(tab, subtitle) {
  let subtitleEl = tab.querySelector('.tab__subtitle');
  
  if (!subtitleEl && subtitle) {
    // Create subtitle if it doesn't exist
    subtitleEl = document.createElement('span');
    subtitleEl.className = 'tab__subtitle';
    const content = tab.querySelector('.tab__content');
    content.appendChild(subtitleEl);
  }
  
  if (subtitleEl) {
    subtitleEl.textContent = subtitle;
  }
}

/**
 * Toggles tab disabled state
 * @param {HTMLButtonElement} tab - The tab element
 * @param {boolean} disabled - Whether to disable the tab
 */
function toggleTabDisabled(tab, disabled) {
  tab.disabled = disabled;
  tab.classList.toggle('tab--disabled', disabled);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTab,
    createTabGroup,
    setActiveTab,
    updateTabLabel,
    updateTabSubtitle,
    toggleTabDisabled
  };
}
