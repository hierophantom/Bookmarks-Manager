/**
 * 
 * file path and name: background.js
 * Chrome Extension Background Service Worker
 * 
 * This script serves as the central hub for the Quick Search Extension, managing:
 * 
 * - Search functionality across multiple Chrome data sources:
 *   • Browser History (recent 5 matches)
 *   • Downloads (recent 5 matches)
 *   • Bookmarks (all matches)
 *   • Chrome Settings (predefined settings database)
 *   • Extensions (installed extensions, up to 5 matches)
 * 
 * - Message handling between content scripts and Chrome APIs
 * - URL opening and navigation
 * - Extension command listeners (keyboard shortcuts)
 * - Extension icon click behavior
 * 
 * The script uses Chrome's Extension APIs to safely access browser data
 * and manages asynchronous communications between different parts of the extension.
 */

/*=============================================================================
  CHROME SETTINGS DATABASE
=============================================================================*/

const chromeSettings = [
    {
        title: "Password Manager",
        description: "Manage saved passwords",
        url: "chrome://password-manager/passwords",
        keywords: ["password", "login", "credentials", "security"]
    },
    {
        title: "Privacy and Security",
        description: "Control your privacy settings",
        url: "chrome://settings/privacy",
        keywords: ["privacy", "security", "tracking", "cookies", "safe"]
    },
    {
        title: "Appearance",
        description: "Customize Chrome's look",
        url: "chrome://settings/appearance",
        keywords: ["theme", "font", "display", "dark", "light"]
    },
    {
        title: "Search Engine",
        description: "Manage search engines",
        url: "chrome://settings/search",
        keywords: ["search", "engine", "google", "bing", "default"]
    },
    {
        title: "Clear Browsing Data",
        description: "Clear history and cache",
        url: "chrome://settings/clearBrowserData",
        keywords: ["clear", "history", "cache", "cookies", "data"]
    },
    {
        title: "Autofill",
        description: "Manage forms and payment methods",
        url: "chrome://settings/autofill",
        keywords: ["autofill", "forms", "payment", "address"]
    },
    {
        title: "Extensions",
        description: "Manage browser extensions",
        url: "chrome://extensions/",
        keywords: ["extensions", "plugins", "addons"]
    },
    {
        title: "Downloads",
        description: "View download history",
        url: "chrome://downloads/",
        keywords: ["downloads", "files"]
    },
    {
        title: "Languages",
        description: "Change language settings",
        url: "chrome://settings/languages",
        keywords: ["language", "translate", "spelling"]
    },
    {
        title: "System",
        description: "Hardware acceleration and system settings",
        url: "chrome://settings/system",
        keywords: ["system", "hardware", "performance"]
    }
];

/*=============================================================================
  EVENT LISTENERS
=============================================================================*/

async function determineOverlayType(tab) {
    // Check if URL is restricted
    const isRestricted = tab.url.startsWith('chrome://') || 
                        tab.url.startsWith('chrome-extension://') ||
                        tab.url === 'about:blank';

    if (isRestricted) {
        // Use native popup for restricted pages
        return 'native';
    } else {
        // Use content script overlay for regular pages
        return 'content';
    }
}


// Action click handler
chrome.action.onClicked.addListener(async (tab) => {
    const overlayType = await determineOverlayType(tab);
    
    if (overlayType === 'native') {
        chrome.action.setPopup({
            tabId: tab.id,
            popup: 'overlay/standalone_overlay.html'
        });
        // Trigger the popup to show
        chrome.action.openPopup();
    } else {
        chrome.tabs.sendMessage(tab.id, {action: "toggle_overlay"})
            .catch(error => console.error("Error showing overlay:", error));
    }
});


// Command handler
chrome.commands.onCommand.addListener((command) => {
    if (command === "_execute_action") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && !tabs[0].url.startsWith("chrome://") && !tabs[0].url.startsWith("chrome-extension://")) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggle_overlay"})
                    .catch(error => console.error("Error showing overlay:", error));
            }
        });
    }
});

/*=============================================================================
  SEARCH HELPER FUNCTIONS
=============================================================================*/

function searchChromeSettings(query) {
    const searchTerm = query.toLowerCase();
    return chromeSettings.filter(setting => {
        return setting.title.toLowerCase().includes(searchTerm) ||
               setting.description.toLowerCase().includes(searchTerm) ||
               setting.keywords.some(keyword => keyword.includes(searchTerm));
    });
}

async function searchExtensions(query) {
    const extensions = await chrome.management.getAll();
    return extensions
        .filter(ext => 
            ext.name.toLowerCase().includes(query.toLowerCase()) ||
            ext.description?.toLowerCase().includes(query.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(ext => ({
            id: ext.id,
            name: ext.shortName || ext.name.split(' - ')[0],
            description: ext.description || 'No description available',
            icon: getExtensionIcon(ext)
        }));
}

async function searchDownloads(query) {
    const downloads = await chrome.downloads.search({
        query: [query],
        state: 'complete'  // Only show completed downloads
    });
    
    return downloads
        .filter(download => 
            download.filename.toLowerCase().includes(query.toLowerCase()) &&
            download.exists)  // Only show existing files
        .sort((a, b) => b.startTime - a.startTime);
}


async function searchBookmarksTree(query) {
    const searchBookmarks = async (node) => {
        let results = [];
        
        if (node.url && (
            node.title.toLowerCase().includes(query.toLowerCase()) ||
            node.url.toLowerCase().includes(query.toLowerCase())
        )) {
            results.push({
                title: node.title,
                url: node.url
            });
        }
        
        if (node.children) {
            for (const child of node.children) {
                const childResults = await searchBookmarks(child);
                results = results.concat(childResults);
            }
        }
        
        return results;
    };

    const tree = await chrome.bookmarks.getTree();
    const results = [];
    
    for (const node of tree) {
        const nodeResults = await searchBookmarks(node);
        results.push(...nodeResults);
    }
    
    return results;
}

/*=============================================================================
  UTILITY FUNCTIONS
=============================================================================*/

function getExtensionIcon(extension) {
    if (extension.icons && extension.icons.length > 0) {
        // Get the smallest icon (16x16 or 32x32 is ideal for the results list)
        const preferredSizes = [16, 32];
        let icon = extension.icons.find(icon => preferredSizes.includes(icon.size));
        
        // If no preferred size found, use the first available icon
        if (!icon) {
            icon = extension.icons[0];
        }

        // Return the icon object with size and URL
        return {
            url: icon.url,
            size: icon.size
        };
    }
    return null; // Return null if no icon found
}
/*=============================================================================
  MESSAGE HANDLER
=============================================================================*/

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

        if (request.action === "show_notification") {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Calculator',
            message: request.message
        });
    }
    
    switch (request.action) {
        case "open_options":
            handleOpenOptions(sendResponse);
            break;

        case "search_history":
            handleSearchHistory(request.query, sendResponse);
            break;

        case "search_downloads":
            searchDownloads(request.query).then(sendResponse);
            break;

        case "search_bookmarks":
            searchBookmarksTree(request.query).then(sendResponse);
            break;

        case "search_settings":
            sendResponse(searchChromeSettings(request.query));
            break;

        case "search_extensions":
            searchExtensions(request.query).then(sendResponse);
            break;

        case "open_chrome_url":
            handleOpenUrl(request.url, sendResponse);
            break;

        case "open_download":
            chrome.downloads.show(request.id);
            sendResponse({ success: true });
            break;
    }

    return true; // Keep message channel open for async responses
});

/*=============================================================================
  MESSAGE HANDLER HELPERS
=============================================================================*/

function handleOpenOptions(sendResponse) {
    try {
        chrome.runtime.openOptionsPage(() => {
            if (chrome.runtime.lastError) {
                chrome.tabs.create({
                    url: 'chrome-extension://' + chrome.runtime.id + '/options/options.html'
                });
            }
            sendResponse({status: "success"});
        });
    } catch (error) {
        console.error("Error in open_options handler:", error);
        chrome.tabs.create({
            url: 'chrome-extension://' + chrome.runtime.id + '/options/options.html'
        });
        sendResponse({status: "fallback_used"});
    }
}

function handleSearchHistory(query, sendResponse) {
    chrome.history.search({
        text: query,
        startTime: 0
    }, sendResponse);
}

function handleOpenUrl(url, sendResponse) {
    // Handle both chrome:// and regular URLs
    chrome.tabs.create({ url }, (tab) => {
        if (chrome.runtime.lastError) {
            console.error("Error creating tab:", chrome.runtime.lastError);
            sendResponse({ 
                success: false, 
                error: chrome.runtime.lastError.message 
            });
        } else {
            console.log("Successfully opened URL:", url);
            sendResponse({ 
                success: true, 
                tabId: tab.id 
            });
        }
    });
}
