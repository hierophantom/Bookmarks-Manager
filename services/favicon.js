/**
 * FaviconService
 * 
 * Provides favicon fetching and fallback generation for bookmarks.
 * This service can be used across the extension for displaying bookmark favicons
 * with reliable fallback handling when favicons are unavailable.
 * 
 * Features:
 * - Chrome's favicon API for reliable favicon fetching
 * - Multiple fallback strategies (Google S2, direct favicon.ico)
 * - Deterministic fallback icon generation per domain
 * - Non-blocking preload support
 * - Automatic fallback on load errors
 */
const FaviconService = (() => {
  // Cache for favicon URLs to avoid repeated computation
  const cache = new Map();

  const KNOWN_FAVICON_OVERRIDES = {
    'docs.google.com': 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico'
  };
  
  /**
   * Extract domain from URL for fallback generation
   * @param {string} url - The bookmark URL
   * @returns {string} - The domain name
   */
  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      console.warn('Invalid URL for favicon extraction:', url);
      return '';
    }
  }

  function extractHostname(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function shouldStripSearchAndHashForLookup(hostname, hrefLength) {
    const normalizedHost = (hostname || '').replace(/^www\./, '');
    if (normalizedHost === 'google.com') return true;
    return hrefLength > 512;
  }

  function getNormalizedFaviconLookupUrl(url) {
    try {
      const parsed = new URL(url);
      if (shouldStripSearchAndHashForLookup(parsed.hostname, parsed.href.length)) {
        parsed.search = '';
        parsed.hash = '';
      }
      return parsed.href;
    } catch (e) {
      return url;
    }
  }

  function isGoogleHost(hostname) {
    const normalizedHost = (hostname || '').replace(/^www\./, '').toLowerCase();
    return normalizedHost === 'google.com' || normalizedHost.endsWith('.google.com');
  }

  function isHttpUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function isHttpsUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function isLikelyPublicDomain(domain) {
    if (!domain) return false;
    if (domain === 'localhost') return true;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return true;
    return domain.includes('.');
  }

  /**
   * Get the first letter of a domain for letter-based fallback
   * @param {string} domain - The domain name
   * @returns {string} - The first letter (uppercase)
   */
  function getFirstLetter(domain) {
    if (!domain) return '?';
    const cleaned = domain.replace(/^www\./, '').trim();
    return cleaned.charAt(0).toUpperCase() || '?';
  }

  /**
   * Generate a deterministic color based on domain
   * @param {string} domain - The domain name
   * @returns {string} - A hex color code
   */
  function getDomainColor(domain) {
    if (!domain) return '#6B7280'; // gray-500 as default
    
    // Simple hash function for deterministic colors
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = domain.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Generate a pleasant color palette
    const colors = [
      '#EF4444', // red-500
      '#F59E0B', // amber-500
      '#10B981', // emerald-500
      '#3B82F6', // blue-500
      '#8B5CF6', // violet-500
      '#EC4899', // pink-500
      '#06B6D4', // cyan-500
      '#84CC16', // lime-500
      '#F97316', // orange-500
      '#6366F1', // indigo-500
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  /**
   * Get Chrome's favicon URL for a given page URL
   * Uses chrome:// protocol which works in extension context
   * @param {string} url - The bookmark URL
   * @param {number} size - The desired favicon size (default: 16)
   * @returns {string} - Chrome favicon URL
   */
  function getChromeFaviconUrl(url, size = 16) {
    if (!url) return null;
    
    try {
      const lookupUrl = getNormalizedFaviconLookupUrl(url);
      // Chrome's favicon API using chrome:// protocol
      // Note: This only works in certain Chrome contexts
      const encodedUrl = encodeURIComponent(lookupUrl);
      return `chrome://favicon2/?pageUrl=${encodedUrl}&size=${size}&scaleFactor=1x`;
    } catch (e) {
      console.warn('Error generating Chrome favicon URL:', e);
      return null;
    }
  }

  /**
   * Get Google's S2 favicon service URL as a fallback
   * @param {string} url - The bookmark URL
   * @param {number} size - The desired favicon size (default: 16)
   * @returns {string} - Google S2 favicon URL
   */
  function getGoogleFaviconUrl(url, size = 16) {
    if (!url) return null;
    
    try {
      const normalizedUrl = new URL(getNormalizedFaviconLookupUrl(url));
      const domain = extractDomain(url);
      if (!isHttpsUrl(url) || !isLikelyPublicDomain(domain)) return null;
      // domain_url preserves sub-product context better than domain-only lookups.
      return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(normalizedUrl.href)}&sz=${size}`;
    } catch (e) {
      console.warn('Error generating Google favicon URL:', e);
      return null;
    }
  }

  /**
   * Get Google's S2 favicon using hostname only for broader fallback coverage
   * @param {string} url - The bookmark URL
   * @param {number} size - The desired favicon size (default: 16)
   * @returns {string|null} - Google S2 favicon URL using domain
   */
  function getGoogleDomainFaviconUrl(url, size = 16) {
    if (!url) return null;

    try {
      const domain = extractDomain(url);
      if (!isHttpsUrl(url) || !isLikelyPublicDomain(domain)) return null;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
    } catch (e) {
      console.warn('Error generating Google domain favicon URL:', e);
      return null;
    }
  }

  /**
   * Get DuckDuckGo icon proxy URL as an additional cross-domain fallback source
   * @param {string} url - The bookmark URL
   * @returns {string|null} - DuckDuckGo favicon URL
   */
  function getDuckDuckGoFaviconUrl(url) {
    if (!url) return null;

    try {
      const hostname = extractHostname(url);
      if (!hostname) return null;
      return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`;
    } catch (e) {
      console.warn('Error generating DuckDuckGo favicon URL:', e);
      return null;
    }
  }

  /**
   * Get a hardcoded favicon URL for known domains with unreliable generic lookups
   * @param {string} url - The bookmark URL
   * @returns {string|null} - Domain-specific favicon override URL
   */
  function getKnownDomainFaviconUrl(url) {
    if (!url) return null;
    const hostname = extractHostname(url);
    return KNOWN_FAVICON_OVERRIDES[hostname] || null;
  }

  function getOrderedGoogleLookupUrls(url, size = 16) {
    const hostname = extractHostname(url);
    const byDomainUrl = getGoogleFaviconUrl(url, size);
    const byDomain = getGoogleDomainFaviconUrl(url, size);

    if (isGoogleHost(hostname)) {
      return [byDomainUrl, byDomain].filter(Boolean);
    }

    return [byDomain, byDomainUrl].filter(Boolean);
  }

  /**
   * Get direct /favicon.ico URL for a given page URL as a fallback option
   * @param {string} url - The bookmark URL
   * @returns {string|null} - Direct favicon.ico URL
   */
  function getDirectFaviconUrl(url) {
    if (!url) return null;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return `${parsed.origin}/favicon.ico`;
    } catch (e) {
      console.warn('Error generating direct favicon URL:', e);
      return null;
    }
  }

  /**
   * Build ordered favicon source candidates from most specific to least specific
   * @param {string} url - The bookmark URL
   * @param {number} size - Desired favicon size
   * @returns {string[]} - Ordered favicon source candidates
   */
  function getFaviconCandidates(url, size = 16) {
    if (!url || !isHttpUrl(url)) return [];

    return [
      getKnownDomainFaviconUrl(url),
      ...getOrderedGoogleLookupUrls(url, size),
      getChromeFaviconUrl(url, size),
      getDuckDuckGoFaviconUrl(url),
      getDirectFaviconUrl(url)
    ].filter(Boolean);
  }

  /**
   * Create a data URL for a letter-based fallback favicon
   * @param {string} url - The bookmark URL
   * @returns {string} - Data URL for the generated favicon
   */
  function generateLetterFallback(url) {
    const domain = extractDomain(url);
    const letter = getFirstLetter(domain);
    const color = getDomainColor(domain);
    
    // Create SVG with letter
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" fill="${color}" rx="4"/>
        <text x="16" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" 
              font-size="16" font-weight="600" fill="white">${letter}</text>
      </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  /**
   * Create a data URL for a default globe icon fallback
   * @returns {string} - Data URL for the globe icon
   */
  function getDefaultGlobeFallback() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" fill="#E5E7EB" rx="4"/>
        <circle cx="16" cy="16" r="8" fill="none" stroke="#6B7280" stroke-width="2"/>
        <path d="M16 8 Q20 12 16 16 Q12 12 16 8 M16 16 Q20 20 16 24 Q12 20 16 16" 
              fill="none" stroke="#6B7280" stroke-width="1.5"/>
        <line x1="8" y1="16" x2="24" y2="16" stroke="#6B7280" stroke-width="2"/>
      </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  /**
   * Get the primary favicon URL for a bookmark
   * This will be attempted first before falling back to alternatives
   * @param {string} url - The bookmark URL
   * @param {number} size - The desired favicon size (default: 16)
   * @returns {string} - The favicon URL to try
   */
  function getFaviconUrl(url, size = 16) {
    if (!url) return getDefaultGlobeFallback();

    if (!isHttpUrl(url)) {
      return getFallbackIcon(url);
    }
    
    // Check cache
    const cacheKey = `${url}:${size}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const knownDomainFavicon = getKnownDomainFaviconUrl(url);
    if (knownDomainFavicon) {
      cache.set(cacheKey, knownDomainFavicon);
      return knownDomainFavicon;
    }

    const orderedGoogleLookups = getOrderedGoogleLookupUrls(url, size);
    for (const googleUrl of orderedGoogleLookups) {
      if (googleUrl) {
        cache.set(cacheKey, googleUrl);
        return googleUrl;
      }
    }

    const duckDuckGoFavicon = getDuckDuckGoFaviconUrl(url);
    if (duckDuckGoFavicon) {
      cache.set(cacheKey, duckDuckGoFavicon);
      return duckDuckGoFavicon;
    }

    const directFavicon = getDirectFaviconUrl(url);
    if (directFavicon) {
      cache.set(cacheKey, directFavicon);
      return directFavicon;
    }

    const chromeFavicon = getChromeFaviconUrl(url, size);
    if (chromeFavicon) {
      cache.set(cacheKey, chromeFavicon);
      return chromeFavicon;
    }
    
    // Fallback to generated icon
    const letterFallback = generateLetterFallback(url);
    cache.set(cacheKey, letterFallback);
    return letterFallback;
  }

  /**
   * Get a fallback favicon URL (letter-based or globe icon)
   * @param {string} url - The bookmark URL
   * @returns {string} - The fallback favicon data URL
   */
  function getFallbackIcon(url) {
    if (url) {
      return generateLetterFallback(url);
    }
    return getDefaultGlobeFallback();
  }

  /**
   * Create an img element with favicon and automatic fallback handling
   * This is the recommended way to display favicons with proper error handling
   * @param {string} url - The bookmark URL
   * @param {Object} options - Configuration options
   * @param {number} options.size - Favicon size in pixels (default: 16)
   * @param {string} options.className - CSS class to apply to the img element
   * @param {string} options.alt - Alt text for the image
   * @returns {HTMLImageElement} - The favicon img element with error handling
   */
  function createFaviconElement(url, options = {}) {
    const {
      size = 16,
      className = 'bookmark-favicon',
      alt = 'Favicon'
    } = options;
    
    const img = document.createElement('img');
    img.className = className;
    img.alt = alt;
    img.width = size;
    img.height = size;
    img.loading = 'lazy'; // Lazy load for better performance

    const candidates = getFaviconCandidates(url, size);
    const fallbackIcon = getFallbackIcon(url);

    if (candidates.length === 0) {
      const icon = document.createElement('span');
      icon.className = `material-symbols-outlined ${className}`.trim();
      icon.setAttribute('aria-hidden', 'true');
      icon.style.fontSize = `${size}px`;
      icon.style.width = `${size}px`;
      icon.style.height = `${size}px`;
      icon.textContent = 'book';
      return icon;
    }

    img.dataset.faviconCandidateIndex = '0';
    img.src = candidates[0];

    // On load failure, advance through known sources before letter/globe fallback.
    img.onerror = () => {
      const currentIndex = Number(img.dataset.faviconCandidateIndex || '0');
      const nextIndex = currentIndex + 1;

      if (nextIndex < candidates.length) {
        img.dataset.faviconCandidateIndex = String(nextIndex);
        img.src = candidates[nextIndex];
        return;
      }

      if (!img.dataset.fallbackAttempted) {
        img.dataset.fallbackAttempted = 'true';
        img.src = fallbackIcon;
      }
    };
    
    return img;
  }

  /**
   * Preload a favicon (non-blocking)
   * Useful for preloading favicons before they're needed
   * @param {string} url - The bookmark URL
   * @param {number} size - The desired favicon size (default: 16)
   */
  function preloadFavicon(url, size = 16) {
    if (!url) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = getFaviconUrl(url, size);
    document.head.appendChild(link);
  }

  /**
   * Clear the favicon cache
   * Useful when bookmarks are updated and favicons need to be refreshed
   */
  function clearCache() {
    cache.clear();
  }

  /**
   * Attach error handlers to favicon images
   * Call this after inserting HTML with favicon images to enable fallback
   * @param {HTMLElement} container - Container element with favicon images
   */
  function attachErrorHandlers(container) {
    if (!container) return;
    
    const faviconImages = container.querySelectorAll('img.bookmark-favicon[data-fallback-url]');
    faviconImages.forEach(img => {
      if (img.dataset.handlerAttached) return; // Already attached
      
      img.onerror = function() {
        if (!this.dataset.fallbackAttempted) {
          this.dataset.fallbackAttempted = 'true';
          const fallbackUrl = this.dataset.fallbackUrl;
          if (fallbackUrl) {
            this.src = fallbackUrl;
          }
        }
      };
      
      img.dataset.handlerAttached = 'true';
    });
  }

  /**
   * Get favicon HTML string for inline rendering
   * Note: Does not include onerror handler due to CSP restrictions
   * Use createFaviconElement() for automatic fallback handling
   * @param {string} url - The bookmark URL
   * @param {Object} options - Configuration options
   * @returns {string} - HTML string for the favicon img element
   */
  function getFaviconHtml(url, options = {}) {
    const {
      size = 16,
      className = 'bookmark-favicon',
      alt = 'Favicon'
    } = options;
    
    const faviconUrl = getFaviconUrl(url, size);
    
    // Note: No inline onerror handler due to CSP
    // Fallback must be handled separately if needed
    return `<img src="${faviconUrl}" 
                 width="${size}" 
                 height="${size}" 
                 alt="${alt}" 
                 class="${className}" 
                 loading="lazy"
                 data-fallback-url="${getFallbackIcon(url)}"
            />`;
  }

  // Public API
  return {
    getFaviconUrl,
    getFallbackIcon,
    createFaviconElement,
    preloadFavicon,
    clearCache,
    getFaviconHtml,
    attachErrorHandlers,
    getChromeFaviconUrl,
    getGoogleFaviconUrl,
    getGoogleDomainFaviconUrl,
    getDuckDuckGoFaviconUrl,
    getKnownDomainFaviconUrl,
    getDirectFaviconUrl,
    getFaviconCandidates
  };
})();
