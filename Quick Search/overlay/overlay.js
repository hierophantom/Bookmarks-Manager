/**
 * file path and name: overlay/overlay.js
 * 
 * Manages the quick search overlay interface, handling its creation, display, 
 * user interactions, search suggestions, and keyboard navigation. Provides a 
 * spotlight-style search experience within the Chrome browser.
 */

/*=============================================================================
  CONFIGURATION AND SETTINGS
=============================================================================*/

//Default settings for the overlay
const defaultSettings = {
    theme: 'system',
    colorScheme: 'blue',
    searchEngine: 'google',
    blurEffect: 'on',
    categorySettings: {} // Add this line
};

// const { searchAll, formatResults } = window.SearchEngine;
const isNativeMode = window.location.protocol === 'chrome-extension:';

// State tracking variables
let selectedIndex = -1; // Track currently selected item
let currentCategory = 0; // Track current category
let resultItems = []; // Store all result items
let categories = []; // Store category sections

/*=============================================================================
  OVERLAY INITIALIZATION AND SETUP
=============================================================================*/

//Creates and initializes the overlay 
async function createAndSetupOverlay() {
    console.log('Creating overlay...');
    
    if (isNativeMode) {
        // Setup for native popup
        const overlay = document.getElementById('qse-spotlight-overlay');
        const elements = {
            searchInput: overlay.querySelector('.qse-search-input'),
            resultsSection: overlay.querySelector('.qse-results')
        };
        
        // Load and apply settings
        const settings = await loadAndApplySettings(overlay);
        
        // Initialize components
        await setupWikiArticles(overlay);
        setupSearchInput(elements, overlay);
        setupKeyboardNavigation(overlay, elements);
        
        // Focus search input
        setTimeout(() => elements.searchInput?.focus(), 50);
    } else {
        try {
            const response = await fetch(chrome.runtime.getURL('overlay/overlay.html'));
            const html = await response.text();
            
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            const overlay = temp.querySelector('#qse-spotlight-overlay');
            if (!overlay) {
                throw new Error('Could not find #qse-spotlight-overlay in template');
            }
            
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
            
            const elements = {
                searchInput: overlay.querySelector('.qse-search-input'),
                resultsSection: overlay.querySelector('.qse-results')
            };

            // Debug log to check elements
            console.log('Found elements:', elements);
            
            // Load and apply settings
            const settings = await loadAndApplySettings(overlay);
            
            // Initialize components
            await setupWikiArticles(overlay);
            setupSearchInput(elements, overlay);
            setupKeyboardNavigation(overlay, elements);
            setupClickOutside(overlay);
            
            // Focus search input
            setTimeout(() => elements.searchInput?.focus(), 50);
            
            console.log('Overlay created successfully');
        } catch (error) {
            console.error('Error creating overlay:', error);
        }
    }
}

// Initialize immediately if in native mode
if (isNativeMode) {
    document.addEventListener('DOMContentLoaded', () => {
        createAndSetupOverlay();
    });
}

//Initializes the overlay with necessary elements and event handlers
function initializeOverlay(overlay) {
    console.log('Initializing overlay...'); // Debug log
    setupWikiArticles(overlay);
    setupSearchInput(elements, overlay);
    
    const elements = {
        searchInput: overlay.querySelector('.qse-search-input'),
        resultsSection: overlay.querySelector('.qse-results')
    };
    
    // Verify elements
    Object.entries(elements).forEach(([key, element]) => {
        if (!element) console.error(`Missing element: ${key}`);
    });
    
    setupSearchInput(elements, overlay);
    setupKeyboardNavigation(overlay, elements);
    
    setTimeout(() => elements.searchInput?.focus(), 50);
}

//Sets up click outside behavior for closing the overlay
function setupClickOutside(overlay) {
    // Add click event listener to the overlay background
    overlay.addEventListener('click', (e) => {
        // Check if the click was on the overlay background (not the content)
        if (e.target.id === 'qse-spotlight-overlay') {
            overlay.remove();
            document.body.style.overflow = '';
        }
    });
}

async function setupWikiArticles(overlay) {
    const wikiList = overlay.querySelector('.qse-wiki-list');
    const refreshButton = overlay.querySelector('.qse-wiki-refresh');
    const wikiSection = overlay.querySelector('.qse-wiki-articles');
    const searchInput = overlay.querySelector('.qse-search-input');

    // Add class for navigation
    refreshButton.classList.add('qse-wiki-navigable');
    
    // Add icons to refresh button
    refreshButton.innerHTML = `
        <span class="qse-result-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
        </span>
        <span class="qse-result-text">Get New Articles</span>
    `;

    // Hide articles when typing
    searchInput.addEventListener('input', (e) => {
        if (e.target.value.length > 0) {
            wikiSection.classList.add('hidden');
        } else {
            wikiSection.classList.remove('hidden');
        }
    });

    // Refresh button handler
    refreshButton.addEventListener('click', async () => {
        refreshButton.disabled = true;
        await fetchAndDisplayArticles(wikiList);
        refreshButton.disabled = false;
    });

    // Initial load
    await fetchAndDisplayArticles(wikiList);
}

async function fetchAndDisplayArticles(wikiList) {
    try {
        const response = await fetch(
            'https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=3&origin=*'
        );
        
        const data = await response.json();
        wikiList.innerHTML = '';
        
        data.query.random.forEach(article => {
            const link = document.createElement('a');
            link.className = 'qse-wiki-item';
            link.innerHTML = `
                <span class="qse-result-icon">
                    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M18 0.191557C18 0.256464 17.9794 0.31504 17.9398 0.368865C17.8987 0.421108 17.8559 0.448021 17.8069 0.448021C17.4127 0.486016 17.0881 0.612665 16.838 0.829552C16.5863 1.04486 16.3282 1.45805 16.0607 2.06596L11.9763 11.2702C11.9493 11.3557 11.8749 11.3984 11.7515 11.3984C11.6549 11.3984 11.5805 11.3557 11.5266 11.2702L9.23588 6.47968L6.60158 11.2702C6.54776 11.3557 6.47335 11.3984 6.37678 11.3984C6.25963 11.3984 6.18206 11.3557 6.14406 11.2702L2.13087 2.06596C1.88074 1.49446 1.61636 1.09551 1.33773 0.86913C1.06069 0.642744 0.672823 0.501847 0.177309 0.448021C0.134565 0.448021 0.0934037 0.425857 0.0569921 0.379947C0.0189974 0.33562 0 0.283377 0 0.224802C0 0.0744063 0.0427441 0 0.128232 0C0.486016 0 0.859631 0.015831 1.25066 0.0474933C1.61319 0.0807387 1.95515 0.09657 2.27493 0.09657C2.60106 0.09657 2.98575 0.0807387 3.42902 0.0474933C3.89288 0.015831 4.30449 0 4.66227 0C4.74776 0 4.7905 0.0744063 4.7905 0.224802C4.7905 0.373615 4.76359 0.448021 4.71135 0.448021C4.35356 0.474934 4.07177 0.566755 3.86596 0.720317C3.66016 0.875462 3.55726 1.0781 3.55726 1.32982C3.55726 1.45805 3.6 1.61794 3.68549 1.8095L7.00211 9.29921L8.88443 5.74354L7.13034 2.06596C6.8153 1.41055 6.55567 0.98628 6.35303 0.796306C6.1504 0.607915 5.84327 0.490765 5.43166 0.448021C5.39367 0.448021 5.35884 0.425857 5.32401 0.379947C5.28918 0.33562 5.27177 0.283377 5.27177 0.224802C5.27177 0.0744063 5.30818 0 5.38417 0C5.74195 0 6.06966 0.015831 6.36887 0.0474933C6.65699 0.0807387 6.96412 0.09657 7.29024 0.09657C7.61003 0.09657 7.94881 0.0807387 8.3066 0.0474933C8.67546 0.015831 9.03799 0 9.39578 0C9.48127 0 9.52401 0.0744063 9.52401 0.224802C9.52401 0.373615 9.49868 0.448021 9.44485 0.448021C8.72929 0.497098 8.3715 0.699736 8.3715 1.05752C8.3715 1.21741 8.45383 1.46596 8.62005 1.80158L9.78048 4.15726L10.9346 2.00264C11.0945 1.69868 11.1752 1.44222 11.1752 1.23325C11.1752 0.74248 10.8174 0.481266 10.1018 0.448021C10.0369 0.448021 10.0053 0.373615 10.0053 0.224802C10.0053 0.170976 10.0211 0.120316 10.0528 0.0728231C10.086 0.0237466 10.1177 0 10.1493 0C10.4058 0 10.7208 0.015831 11.0945 0.0474933C11.4522 0.0807387 11.7467 0.09657 11.9763 0.09657C12.1409 0.09657 12.3847 0.082322 12.7045 0.055409C13.1098 0.0189974 13.4501 0 13.7224 0C13.7858 0 13.8174 0.0633244 13.8174 0.191557C13.8174 0.362533 13.7588 0.448021 13.6417 0.448021C13.2253 0.490765 12.8897 0.606332 12.6364 0.79314C12.3831 0.979947 12.0665 1.40422 11.6881 2.06596L10.1493 4.91082L12.2327 9.15515L15.3087 2.00264C15.4148 1.74143 15.4686 1.50079 15.4686 1.28232C15.4686 0.758311 15.1108 0.481266 14.3953 0.448021C14.3303 0.448021 14.2987 0.373615 14.2987 0.224802C14.2987 0.0744063 14.3462 0 14.4427 0C14.704 0 15.0142 0.015831 15.372 0.0474933C15.7029 0.0807387 15.9815 0.09657 16.2048 0.09657C16.4406 0.09657 16.7129 0.0807387 17.0216 0.0474933C17.343 0.015831 17.6311 0 17.8876 0C17.962 0 18 0.0633244 18 0.191557Z" fill=""/>
</svg>

                </span>
                <span class="qse-result-text">${article.title}</span>
                <span class="qse-hover-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                        <path fill="" d="M14.055 7.055v2h-8.78l1.92-1.92a.664.664 0 1 0-.94-.94l-3.06 3.06c-.26.26-.26.68 0 .94l3.06 3.06a.664.664 0 1 0 .94-.94l-1.92-1.927h9.447c.366 0 .666-.3.666-.666V7.055c0-.367-.3-.667-.666-.667-.367 0-.667.3-.667.667Z"/>
                    </svg>
                </span>
            `;
            link.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.runtime.sendMessage({
                    action: "open_chrome_url",
                    url: link.href
                });
            });
            wikiList.appendChild(link);
        });
    } catch (error) {
        console.error('Error fetching Wikipedia articles:', error);
        wikiList.innerHTML = '<div style="color: var(--text-1);">Error loading articles</div>';
    }
}


/*=============================================================================
  SETTINGS MANAGEMENT
=============================================================================*/

//Loads and applies settings to the overlay
async function loadAndApplySettings(overlay) {
    try {
        const settings = await chrome.storage.local.get({
            ...defaultSettings,
            categorySettings: {}
        });
        
        // Apply theme
        const themeClass = settings.theme === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light'
            : `theme-${settings.theme}`;
        
        overlay.classList.remove('theme-light', 'theme-dark');
        overlay.classList.add(themeClass);

        // Apply color scheme
        const themeType = themeClass.includes('dark') ? 'dark' : 'light';
        const schemeClass = `scheme-${themeType}-${settings.colorScheme}`;
        
        // Remove existing color schemes
        overlay.classList.remove(
            'scheme-light-clear', 'scheme-light-blue', 'scheme-light-violet', 'scheme-light-grass',
            'scheme-dark-clear', 'scheme-dark-blue', 'scheme-dark-violet', 'scheme-dark-grass'
        );
        overlay.classList.add(schemeClass);

        const searchEngineName = overlay.querySelector('.qse-search-engine-name');
        if (searchEngineName) {
            // Capitalize first letter
            const formattedName = settings.searchEngine.charAt(0).toUpperCase() + 
                                settings.searchEngine.slice(1);
            searchEngineName.textContent = formattedName;
        }

        // Apply blur effect
        if (settings.blurEffect === 'on') {
            overlay.classList.add('qse-blur-effect');
        } else {
            overlay.classList.remove('qse-blur-effect');
        }

        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        return defaultSettings;
    }
}


/*=============================================================================
  SEARCH FUNCTIONALITY
=============================================================================*/

//Generates search URL based on query and search engine
function getSearchUrl(query, searchEngine) {
    const encodedQuery = encodeURIComponent(query);
    const searchUrls = {
        'google': `https://www.google.com/search?q=${encodedQuery}`,
        'bing': `https://www.bing.com/search?q=${encodedQuery}`,
        'duckduckgo': `https://duckduckgo.com/?q=${encodedQuery}`,
        'brave': `https://search.brave.com/search?q=${encodedQuery}`,
        'yahoo': `https://search.yahoo.com/search?p=${encodedQuery}`
    };
    return searchUrls[searchEngine] || searchUrls['google'];
}

//Performs search using selected search engine
function performSearch(query, settings) {
    const searchUrl = getSearchUrl(query, settings.searchEngine);
    chrome.runtime.sendMessage({
        action: "open_chrome_url",
        url: searchUrl
    });
}

/*=============================================================================
  SUGGESTION AND RESULTS MANAGEMENT
=============================================================================*/

async function generateSuggestions(query) {
    const settings = await chrome.storage.local.get(defaultSettings);
    const results = await searchAll(query, settings);
    return formatResults(results);
}

//Sets up search input handling and triggers suggestion updates
function setupSearchInput(elements, overlay) {
    const { searchInput, resultsSection } = elements;
    
    if (!searchInput || !resultsSection) {
        console.error('Missing required elements for search');
        return;
    }
    
    searchInput.addEventListener('input', async () => {
        const query = searchInput.value.trim();
        
        // Clear results if query is empty or less than 3 characters
        if (!query || query.length < 3) {
            resultsSection.innerHTML = '';
            if (query.length > 0 && query.length < 3) {
                resultsSection.innerHTML = '<div class="qse-loading-indicator">Keep typing to search...</div>';
            }
            return;
        }

        try {
            // Show loading state
            resultsSection.innerHTML = '<div class="qse-loading-indicator">Searching...</div>';
            
            // Get settings
            const settings = await chrome.storage.local.get(defaultSettings);
            
            // Get search results
            const suggestions = await generateSuggestions(query);
            
            // Update results
            updateResults(suggestions, resultsSection, overlay);
        } catch (error) {
            console.error('Error during search:', error);
            resultsSection.innerHTML = '<div class="qse-loading-indicator">Error performing search</div>';
        }
    });
}


//Updates and displays search results in the overlay
function updateResults(suggestions, resultsSection, overlay) {
    if (!resultsSection) return;
    
    resultsSection.innerHTML = '';
    
    // Group suggestions by type
    const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
        if (!acc[suggestion.type]) {
            acc[suggestion.type] = [];
        }
        acc[suggestion.type].push(suggestion);
        return acc;
    }, {});

    // Create sections for each type
    Object.entries(groupedSuggestions).forEach(([type, items]) => {
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'qse-category-title';
        categoryTitle.textContent = type.toUpperCase();
        resultsSection.appendChild(categoryTitle);

        const categoryContent = document.createElement('div');
        categoryContent.className = 'qse-category-content';

        items.forEach(suggestion => {
        const resultItem = document.createElement('div');
        resultItem.className = 'qse-result-item';
        
        // Check if this is a calculator result
        const isCalculatorResult = type === 'Calculate';
        
        resultItem.innerHTML = `
            <span class="qse-result-icon">${suggestion.icon}</span>
            <span class="qse-result-text">${suggestion.text}</span>
            ${!isCalculatorResult ? `
                <span class="qse-hover-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                        <path fill="" d="M14.055 7.055v2h-8.78l1.92-1.92a.664.664 0 1 0-.94-.94l-3.06 3.06c-.26.26-.26.68 0 .94l3.06 3.06a.664.664 0 1 0 .94-.94l-1.92-1.927h9.447c.366 0 .666-.3.666-.666V7.055c0-.367-.3-.667-.666-.667-.367 0-.667.3-.667.667Z"/>
                    </svg>
                </span>
            ` : ''}
            ${isCalculatorResult ? '<span class="qse-hover-text">Copy to clipboard</span>' : ''}
        `;
            
            resultItem.addEventListener('click', () => {
                suggestion.action();
                overlay.remove();
                document.body.style.overflow = '';
            });
            
            categoryContent.appendChild(resultItem);
        });

        resultsSection.appendChild(categoryContent);
    });

    // Reset selection
    selectedIndex = -1;
    currentCategory = 0;
}


/*=============================================================================
  NAVIGATION AND INTERACTION
=============================================================================*/

//Sets up keyboard navigation handlers
function setupKeyboardNavigation(overlay, elements) {
    const { searchInput, resultsSection } = elements;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.body.style.overflow = '';
            return;
        }

        // If search is empty, handle wiki navigation
        if (!searchInput.value) {
            const navigableItems = overlay.querySelectorAll('.qse-wiki-navigable, .qse-wiki-item');
            if (!navigableItems.length) return;

            const currentSelected = overlay.querySelector('.qse-wiki-navigable.selected, .qse-wiki-item.selected');
            let currentIndex = Array.from(navigableItems).indexOf(currentSelected);

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                navigableItems.forEach(item => item.classList.remove('selected'));
                
                currentIndex = e.key === 'ArrowDown' 
                    ? (currentIndex + 1) % navigableItems.length 
                    : (currentIndex - 1 + navigableItems.length) % navigableItems.length;
                
                navigableItems[currentIndex].classList.add('selected');
                navigableItems[currentIndex].scrollIntoView({ block: 'nearest' });
            }

            if (e.key === 'Enter' && currentIndex >= 0) {
                e.preventDefault();
                navigableItems[currentIndex].click();
            }
            return;
        }
 
        // Add Tab key handling
        if (e.key === 'Tab') {
            e.preventDefault();
            navigateCategories(e.shiftKey ? -1 : 1);
            return;
        }
 
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            navigateResults(e.key === 'ArrowDown' ? 1 : -1);
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            selectCurrentResult();
        }
    });
}



//Handles selection of the current result
function selectCurrentResult() {
    const selectedItem = document.querySelector('.qse-result-item.selected');
    if (selectedItem) {
        selectedItem.click();
    }
}

//Handles navigation between result items
function navigateResults(direction) {
    const items = document.querySelectorAll('.qse-result-item');
    if (!items.length) return;

    // Remove current selection
    items.forEach(item => item.classList.remove('selected'));

    // Update selected index
    if (selectedIndex === -1) {
        selectedIndex = direction > 0 ? 0 : items.length - 1;
    } else {
        selectedIndex = (selectedIndex + direction + items.length) % items.length;
    }

    // Apply new selection
    items[selectedIndex].classList.add('selected');
    items[selectedIndex].scrollIntoView({ 
        block: 'nearest',
        behavior: 'smooth'
    });

    // Prevent default arrow key scrolling
    document.querySelector('.qse-search-input').blur();
    setTimeout(() => {
        document.querySelector('.qse-search-input').focus();
    }, 0);
}

//Handles navigation between result categories
function navigateCategories(direction) {
    const categories = document.querySelectorAll('.qse-category-title');
    if (!categories.length) return;

    currentCategory = (currentCategory + direction + categories.length) % categories.length;
    
    // Scroll to category and select first item in that category
    categories[currentCategory].scrollIntoView({ block: 'nearest' });
    
    // Find first result item in this category
    const categoryItems = categories[currentCategory].nextElementSibling
        .querySelectorAll('.qse-result-item');
    
    if (categoryItems.length) {
        // Remove previous selection
        const items = document.querySelectorAll('.qse-result-item');
        items.forEach(item => item.classList.remove('selected'));
        
        // Select first item in category
        categoryItems[0].classList.add('selected');
        selectedIndex = Array.from(items).indexOf(categoryItems[0]);
    }
}

/*=============================================================================
  OVERLAY CONTROL
=============================================================================*/

//Toggles the overlay visibility
function toggleOverlay() {
    console.log('Toggle overlay called');
    
    let overlay = document.getElementById('qse-spotlight-overlay');
    
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
        return;
    }
    
    if (!document.getElementById('qse-spotlight-overlay-css')) {
        const linkElem = document.createElement('link');
        linkElem.id = 'qse-spotlight-overlay-css';
        linkElem.rel = 'stylesheet';
        linkElem.href = chrome.runtime.getURL('overlay/overlay.css');
        document.head.appendChild(linkElem);
    }
    
    createAndSetupOverlay();
}

/*=============================================================================
  EVENT LISTENERS
=============================================================================*/

// Chrome message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request); // Debug log
    if (request.action === "toggle_overlay") {
        toggleOverlay();
        sendResponse({status: "success"});
    }
    return true;
});

// Configuration link click listener
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('qse-settings-link')) {
    e.preventDefault();
    chrome.runtime.sendMessage({action: "open_options"});
  }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        const overlay = document.getElementById('qse-spotlight-overlay');
        if (overlay) {
            loadAndApplySettings(overlay);
        }
    }
});
