/**
 * Search Bar Component
 * 
 * Design System Component - BMG-89
 * 
 * @example
 * // Create a search bar button
 * const searchBar = createSearchBar({
 *   onClick: () => openSearchOverlay(),
 *   shortcutKeys: ['⌘', 'E']
 * });
 * 
 * @example
 * // Create search bar with custom text
 * const customSearch = createSearchBar({
 *   text: 'Find bookmarks',
 *   onClick: () => console.log('Search clicked')
 * });
 */

/**
 * Creates a search bar button element
 * @param {Object} options - Search bar configuration
 * @param {string} [options.text='Search'] - Button text
 * @param {string} [options.searchIcon] - Custom search icon path (SVG)
 * @param {Array<string>} [options.shortcutKeys] - Keyboard shortcut keys to display (e.g., ['⌘', 'E'])
 * @param {Function} [options.onClick] - Click handler
 * @param {boolean} [options.disabled=false] - Whether button is disabled
 * @param {string} [options.ariaLabel] - Accessibility label
 * @returns {HTMLButtonElement} The search bar button element
 */
function createSearchBar(options = {}) {
  const {
    text = 'Search',
    searchIcon = null,
    shortcutKeys = ['⌘', 'E'],
    onClick = null,
    disabled = false,
    ariaLabel = 'Search bookmarks'
  } = options;

  // Create button element
  const button = document.createElement('button');
  button.className = 'search-bar';
  button.type = 'button';
  button.setAttribute('aria-label', ariaLabel);
  
  if (disabled) {
    button.disabled = true;
    button.classList.add('search-bar--disabled');
  }

  // Create content container
  const content = document.createElement('div');
  content.className = 'search-bar__content';

  // Create search icon
  const iconEl = document.createElement('img');
  iconEl.className = 'search-bar__icon';
  iconEl.alt = '';
  iconEl.setAttribute('aria-hidden', 'true');
  
  // Use custom icon or default SVG
  if (searchIcon) {
    iconEl.src = searchIcon;
  } else {
    // Default search icon
    iconEl.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' /%3E%3C/svg%3E";
  }
  
  content.appendChild(iconEl);

  // Create text element
  const textEl = document.createElement('span');
  textEl.className = 'search-bar__text';
  textEl.textContent = text;
  content.appendChild(textEl);
  
  button.appendChild(content);

  // Create keyboard shortcut hint
  if (shortcutKeys && shortcutKeys.length > 0) {
    const shortcut = document.createElement('div');
    shortcut.className = 'search-bar__shortcut';
    shortcut.setAttribute('aria-hidden', 'true');
    
    shortcutKeys.forEach(key => {
      const keyEl = document.createElement('span');
      keyEl.className = 'search-bar__shortcut-key';
      keyEl.textContent = key;
      shortcut.appendChild(keyEl);
    });
    
    button.appendChild(shortcut);
  }

  // Attach click handler
  if (onClick && typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  return button;
}

/**
 * Updates search bar text
 * @param {HTMLButtonElement} searchBar - The search bar element
 * @param {string} text - New text
 */
function updateSearchBarText(searchBar, text) {
  const textEl = searchBar.querySelector('.search-bar__text');
  if (textEl) {
    textEl.textContent = text;
  }
}

/**
 * Toggle search bar disabled state
 * @param {HTMLButtonElement} searchBar - The search bar element
 * @param {boolean} disabled - Whether to disable the search bar
 */
function toggleSearchBarDisabled(searchBar, disabled) {
  searchBar.disabled = disabled;
  searchBar.classList.toggle('search-bar--disabled', disabled);
}

/**
 * Update keyboard shortcut keys
 * @param {HTMLButtonElement} searchBar - The search bar element
 * @param {Array<string>} keys - New shortcut keys
 */
function updateSearchBarShortcut(searchBar, keys) {
  const shortcut = searchBar.querySelector('.search-bar__shortcut');
  if (shortcut) {
    shortcut.innerHTML = '';
    keys.forEach(key => {
      const keyEl = document.createElement('span');
      keyEl.className = 'search-bar__shortcut-key';
      keyEl.textContent = key;
      shortcut.appendChild(keyEl);
    });
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSearchBar,
    updateSearchBarText,
    toggleSearchBarDisabled,
    updateSearchBarShortcut
  };
}
