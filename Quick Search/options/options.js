/**
 * file path and name: options/options.js
 * 
 * Manages the extension's settings functionality, handling:
 * - Settings storage and retrieval using Chrome Storage API
 * - Theme and color scheme application
 * - User interface interactions
 * - Real-time settings updates
 * 
 * Organized into logical sections:
 * 1. Configuration and Constants
 * 2. Theme Management
 * 3. Color Scheme Management
 * 4. Settings Storage/Retrieval
 * 5. Event Handlers
 * 6. UI Initialization
 */

//=============================================================================
// CONFIGURATION AND CONSTANTS
//=============================================================================

/**
 * Default settings used when no stored preferences exist
 */
const defaultSettings = {
    theme: 'system',
    colorScheme: 'blue',
    searchEngine: 'google',
    blurEffect: 'on'
};

const CATEGORY_SETTINGS_KEY = 'categorySettings';

/**
 * Default category settings
 */
const defaultCategorySettings = Object.entries(CategoryConfig).reduce((acc, [key, config]) => {
    acc[key] = {
        enabled: key === SearchCategories.SEARCH_ENGINE ? true : config.enabled,
        priority: key === SearchCategories.SEARCH_ENGINE ? 1 : config.priority
    };
    return acc;
}, {});

const NOTIFICATION_DURATION = 2000;

/**
 * Available theme classes for the application
 */
const THEME_CLASSES = ['theme-light', 'theme-dark'];

/**
 * Color scheme definitions for both light and dark themes
 */
const COLOR_SCHEMES = {
    light: {
        clear: 'scheme-light-clear',
        blue: 'scheme-light-blue',
        violet: 'scheme-light-violet',
        grass: 'scheme-light-grass'
    },
    dark: {
        clear: 'scheme-dark-clear',
        blue: 'scheme-dark-blue',
        violet: 'scheme-dark-violet',
        grass: 'scheme-dark-grass'
    }
};

//=============================================================================
// THEME MANAGEMENT FUNCTIONS
//=============================================================================

/**
 * Applies the selected theme to the page
 * @param {string} theme - The theme to apply ('light', 'dark', or 'system')
 */
function applyTheme(theme) {
    const body = document.body;
    body.classList.remove(...THEME_CLASSES);
    
    const themeClass = theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light'
        : `theme-${theme}`;
    
    body.classList.add(themeClass);
}

/**
 * Retrieves the currently active theme
 * @returns {string} The current theme class or 'theme-light' as fallback
 */
function getCurrentTheme() {
    return THEME_CLASSES.find(cls => document.body.classList.contains(cls)) || 'theme-light';
}

//=============================================================================
// COLOR SCHEME MANAGEMENT FUNCTIONS
//=============================================================================

/**
 * Applies the selected color scheme to the page
 * @param {string} scheme - The color scheme to apply ('clear', 'blue', 'violet', 'grass')
 */
function applyColorScheme(scheme) {
    const body = document.body;
    const currentTheme = getCurrentTheme();
    
    // Clean up existing color schemes
    Object.values(COLOR_SCHEMES.light).forEach(cls => body.classList.remove(cls));
    Object.values(COLOR_SCHEMES.dark).forEach(cls => body.classList.remove(cls));
    
    // Apply new color scheme
    const themeType = currentTheme.includes('dark') ? 'dark' : 'light';
    body.classList.add(COLOR_SCHEMES[themeType][scheme]);
}

/**
 * Updates the visual selection state of color scheme radio buttons
 * @param {string} selectedColor - The color that should be marked as selected
 */
function updateColorSelection(selectedColor) {
    document.querySelectorAll('input[name="colorScheme"]').forEach(radio => {
        radio.checked = (radio.value === selectedColor);
    });
}

/**
 * Loads and applies category settings
 */
function loadCategorySettings() {
    chrome.storage.local.get({
        [CATEGORY_SETTINGS_KEY]: defaultCategorySettings
    }, (result) => {
        const savedSettings = result[CATEGORY_SETTINGS_KEY];
        Object.entries(savedSettings).forEach(([key, settings]) => {
            if (CategoryConfig[key]) {
                CategoryConfig[key].enabled = settings.enabled;
                CategoryConfig[key].priority = settings.priority;
            }
        });
        renderCategoriesList();
    });
}

/**
 * Renders the categories list in the UI
 */
function renderCategoriesList() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;
    
    categoriesList.innerHTML = '';
    
    Object.entries(CategoryConfig)
        .filter(([key, _]) => key !== SearchCategories.SEARCH_ENGINE) // Filter out search category
        .sort((a, b) => a[1].priority - b[1].priority)
        .forEach(([key, config]) => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.setAttribute('data-category', key);
            categoryItem.draggable = true;
            
            categoryItem.innerHTML = `
                <div class="drag-handle">⋮⋮</div>
                <div class="category-info">
                    <div class="category-icon">${config.icon}</div>
                    <span class="category-name">${config.title}</span>
                </div>
                <label class="switch">
                    <input type="checkbox" ${config.enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;
            
            categoriesList.appendChild(categoryItem);
        });
    
    initializeCategoryDragAndDrop();
    initializeCategoryToggles();
}

//=============================================================================
// SETTINGS STORAGE AND RETRIEVAL
//=============================================================================

/**
 * Loads and applies saved settings from Chrome storage
 */
function loadSettings() {
    chrome.storage.local.get(defaultSettings, (settings) => {
        // Apply theme settings
        const themeRadio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
            applyTheme(settings.theme);
        }
        
        // Apply color scheme settings
        const colorRadio = document.querySelector(`input[name="colorScheme"][value="${settings.colorScheme}"]`);
        if (colorRadio) {
            colorRadio.checked = true;
            applyColorScheme(settings.colorScheme);
        }
        
        // Apply search engine settings
        const engineRadio = document.querySelector(`input[name="searchEngine"][value="${settings.searchEngine}"]`);
        if (engineRadio) engineRadio.checked = true;

        const blurToggle = document.getElementById('blurToggle');
        if (blurToggle) {
            blurToggle.checked = settings.blurEffect;
        }

        // Apply blur effect settings
        const blurRadio = document.querySelector(`input[name="blurEffect"][value="${settings.blurEffect}"]`);
        if (blurRadio) {
            blurRadio.checked = true;
            const option = blurRadio.closest('.selection-option');
            if (option) option.classList.add('selected');
        }
    });
}

/**
 * Saves current settings to Chrome storage
 */
function saveSettings() {
    const settings = {
        theme: document.querySelector('input[name="theme"]:checked').value,
        colorScheme: document.querySelector('input[name="colorScheme"]:checked').value,
        searchEngine: document.querySelector('input[name="searchEngine"]:checked').value,
        blurEffect: document.querySelector('input[name="blurEffect"]:checked').value,
        [CATEGORY_SETTINGS_KEY]: Object.entries(CategoryConfig).reduce((acc, [key, config]) => {
            acc[key] = {
                // Search category is always enabled
                enabled: key === SearchCategories.SEARCH_ENGINE ? true : config.enabled,
                // Search category is always priority 1
                priority: key === SearchCategories.SEARCH_ENGINE ? 1 : config.priority
            };
            return acc;
        }, {})
    };
    
    chrome.storage.local.set(settings, () => {
        applyTheme(settings.theme);
        applyColorScheme(settings.colorScheme);
        showNotification();
    });
}

//=============================================================================
// EVENT HANDLERS
//=============================================================================

/**
 * Handles theme selection changes
 * @param {Event} event - The change event from theme radio buttons
 */
function handleThemeChange(event) {
    const theme = event.target.value;
    applyTheme(theme);
    
    const currentColorScheme = document.querySelector('input[name="colorScheme"]:checked').value;
    applyColorScheme(currentColorScheme);
}

/**
 * Handles color scheme selection changes
 * @param {Event} event - The change event from color scheme radio buttons
 */
function handleColorSchemeChange(event) {
    applyColorScheme(event.target.value);
}

/**
 * Handles system theme preference changes
 * @param {Event} event - The change event from system theme changes
 */
function handleSystemThemeChange(event) {
    if (document.getElementById('themeSelect').value === 'system') {
        applyTheme('system');
    }
}

/**
 * Shows a temporary save confirmation notification
 */
function showNotification() {
    const notification = document.getElementById('save-notification');
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, NOTIFICATION_DURATION);
}

//=============================================================================
// UI INITIALIZATION AND EVENT BINDING
//=============================================================================

// Make selection options clickable
document.querySelectorAll('.selection-option').forEach(option => {
    option.addEventListener('click', function() {
        const radio = this.querySelector('input[type="radio"]');
        radio.checked = true;
        
        document.querySelectorAll('.selection-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        this.classList.add('selected');
        radio.dispatchEvent(new Event('change'));
    });
    
    const radio = option.querySelector('input[type="radio"]');
    if (radio.checked) {
        option.classList.add('selected');
    }
});

/**
 * Initializes all event listeners for the settings page
 */
function initializeEventListeners() {
    // Theme change listeners
    document.querySelectorAll('input[name="theme"]')
        .forEach(radio => radio.addEventListener('change', handleThemeChange));
    
    // Color scheme change listeners
    document.querySelectorAll('input[name="colorScheme"]')
        .forEach(radio => radio.addEventListener('change', handleColorSchemeChange));
    
    // Save button listener
    document.getElementById('saveButton').addEventListener('click', saveSettings);
    
    // System theme change listener
    window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', handleSystemThemeChange);

    // Add keyboard shortcut listener
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Initialize the application

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadCategorySettings();
    initializeEventListeners();
});

/**
 * Initializes drag and drop functionality for categories
 */
function initializeCategoryDragAndDrop() {
    const items = document.getElementsByClassName('category-item');
    Array.from(items).forEach(item => {
        item.addEventListener('dragstart', handleCategoryDragStart);
        item.addEventListener('dragend', handleCategoryDragEnd);
        item.addEventListener('dragover', handleCategoryDragOver);
        item.addEventListener('drop', handleCategoryDrop);
    });
}

/**
 * Handles category drag start
 */
function handleCategoryDragStart(e) {
    this.classList.add('dragging');
    e.dataTransfer.setData('text/plain', this.getAttribute('data-category'));
}

/**
 * Handles category drag end
 */
function handleCategoryDragEnd(e) {
    this.classList.remove('dragging');
}

/**
 * Handles category drag over
 */
function handleCategoryDragOver(e) {
    e.preventDefault();
}

/**
 * Handles category drop
 */
function handleCategoryDrop(e) {
    e.preventDefault();
    const draggedCategory = e.dataTransfer.getData('text/plain');
    const dropTarget = this;
    
    if (draggedCategory !== dropTarget.getAttribute('data-category')) {
        const list = document.getElementById('categoriesList');
        const draggedItem = document.querySelector(`[data-category="${draggedCategory}"]`);
        
        const draggedIndex = Array.from(list.children).indexOf(draggedItem);
        const dropIndex = Array.from(list.children).indexOf(dropTarget);
        
        if (draggedIndex < dropIndex) {
            dropTarget.parentNode.insertBefore(draggedItem, dropTarget.nextSibling);
        } else {
            dropTarget.parentNode.insertBefore(draggedItem, dropTarget);
        }
        
        updateCategoryPriorities();
    }
}

/**
 * Initializes category toggle switches
 */
function initializeCategoryToggles() {
    const toggles = document.querySelectorAll('.category-item .switch input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const categoryItem = this.closest('.category-item');
            const category = categoryItem.getAttribute('data-category');
            CategoryConfig[category].enabled = this.checked;
        });
    });
}

/**
 * Updates category priorities based on current order
 */
function updateCategoryPriorities() {
    // Search category is always priority 1
    if (CategoryConfig[SearchCategories.SEARCH_ENGINE]) {
        CategoryConfig[SearchCategories.SEARCH_ENGINE].priority = 1;
    }

    // Update other categories starting from priority 2
    const items = document.getElementById('categoriesList').children;
    Array.from(items).forEach((item, index) => {
        const category = item.getAttribute('data-category');
        CategoryConfig[category].priority = index + 2; // Start from 2 since search is 1
    });
}

/**
 * Handles keyboard shortcuts for saving settings
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyboardShortcuts(event) {
    // Check for Command+S (Mac) or Ctrl+S (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault(); // Prevent browser's default save behavior
        saveSettings();
    }
}