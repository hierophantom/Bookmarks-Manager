/**
 * Favicon Service Tests
 * 
 * Basic tests to verify the favicon service functionality
 */

describe('FaviconService', () => {
  beforeEach(() => {
    // Mock Chrome API if needed
    if (typeof chrome === 'undefined') {
      global.chrome = {
        runtime: {
          id: 'test-extension-id'
        }
      };
    }
    
    // Load the service
    if (typeof FaviconService === 'undefined') {
      console.warn('FaviconService not loaded in test environment');
    }
  });

  describe('getFaviconUrl', () => {
    it('should return a favicon URL for valid URLs', () => {
      const url = 'https://www.google.com';
      const faviconUrl = FaviconService.getFaviconUrl(url);
      
      expect(faviconUrl).toBeDefined();
      expect(typeof faviconUrl).toBe('string');
      expect(faviconUrl.length).toBeGreaterThan(0);
    });

    it('should return default fallback for invalid URLs', () => {
      const url = '';
      const faviconUrl = FaviconService.getFaviconUrl(url);
      
      expect(faviconUrl).toBeDefined();
      expect(faviconUrl).toContain('data:image/svg+xml');
    });

    it('should return a safe favicon URL for valid URLs', () => {
      const url = 'https://github.com';
      const faviconUrl = FaviconService.getFaviconUrl(url);
      
      expect(faviconUrl).toBeDefined();
      // Should be a broadly compatible URL or fallback
      expect(
        faviconUrl.includes('google.com/s2/favicons') ||
        faviconUrl.includes('/favicon.ico') ||
        faviconUrl.includes('chrome://favicon2') ||
        faviconUrl.includes('data:image/svg+xml')
      ).toBe(true);
    });
  });

  describe('getFaviconCandidates', () => {
    it('should include ordered source candidates for http/https URLs', () => {
      const url = 'https://keep.google.com/u/0/';
      const candidates = FaviconService.getFaviconCandidates(url);

      expect(candidates.length).toBeGreaterThan(1);
      expect(candidates[0]).toContain('google.com/s2/favicons?domain_url=');
      expect(candidates[0]).toContain(encodeURIComponent(url));
      expect(candidates[1]).toContain('google.com/s2/favicons?domain=');
      expect(candidates[2]).toContain('chrome://favicon2');
    });

    it('should prioritize domain-level lookup first for non-google hosts', () => {
      const url = 'https://yts.do/';
      const candidates = FaviconService.getFaviconCandidates(url);

      expect(candidates[0]).toContain('google.com/s2/favicons?domain=');
      expect(candidates[1]).toContain('google.com/s2/favicons?domain_url=');
      expect(candidates.some(candidate => candidate.includes('icons.duckduckgo.com/ip3/yts.do.ico'))).toBe(true);
    });

    it('should prioritize known domain override for docs.google.com', () => {
      const url = 'https://docs.google.com/document/d/abc123/edit';
      const candidates = FaviconService.getFaviconCandidates(url);

      expect(candidates[0]).toBe('https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico');
    });

    it('should normalize noisy google.com search URLs for favicon lookups', () => {
      const url = 'https://www.google.com/search?q=The+1975&sourceid=chrome&ie=UTF-8#ebo=0';
      const candidates = FaviconService.getFaviconCandidates(url);

      expect(candidates[0]).toContain('google.com/s2/favicons?domain_url=');
      expect(candidates[0]).toContain(encodeURIComponent('https://www.google.com/search'));
      expect(candidates[0]).not.toContain(encodeURIComponent('q=The+1975'));
    });

    it('should return empty candidates for non-http URL', () => {
      const candidates = FaviconService.getFaviconCandidates('chrome://extensions');
      expect(candidates).toEqual([]);
    });
  });

  describe('getFallbackIcon', () => {
    it('should generate letter-based fallback for valid URL', () => {
      const url = 'https://www.example.com';
      const fallback = FaviconService.getFallbackIcon(url);
      
      expect(fallback).toBeDefined();
      expect(fallback).toContain('data:image/svg+xml');
      // Should contain the letter 'E' for example.com
      expect(atob(fallback.split(',')[1])).toContain('E');
    });

    it('should return default globe icon for empty URL', () => {
      const url = '';
      const fallback = FaviconService.getFallbackIcon(url);
      
      expect(fallback).toBeDefined();
      expect(fallback).toContain('data:image/svg+xml');
    });
  });

  describe('createFaviconElement', () => {
    it('should create an img element with correct attributes', () => {
      const url = 'https://www.wikipedia.org';
      const img = FaviconService.createFaviconElement(url);
      
      expect(img).toBeDefined();
      expect(img.tagName).toBe('IMG');
      expect(img.width).toBe(16);
      expect(img.height).toBe(16);
      expect(img.className).toContain('bookmark-favicon');
      expect(img.loading).toBe('lazy');
    });

    it('should accept custom options', () => {
      const url = 'https://www.stackoverflow.com';
      const options = {
        size: 32,
        className: 'custom-favicon',
        alt: 'Custom Alt'
      };
      const img = FaviconService.createFaviconElement(url, options);
      
      expect(img.width).toBe(32);
      expect(img.height).toBe(32);
      expect(img.className).toBe('custom-favicon');
      expect(img.alt).toBe('Custom Alt');
    });

    it('should have error handler for fallback', () => {
      const url = 'https://www.test.com';
      const img = FaviconService.createFaviconElement(url);
      
      expect(img.onerror).toBeDefined();
      expect(typeof img.onerror).toBe('function');
    });

    it('should start with page-specific source for accurate icons', () => {
      const url = 'https://keep.google.com/u/0/';
      const img = FaviconService.createFaviconElement(url);

      expect(img.src).toContain('google.com/s2/favicons?domain_url=');
      expect(img.src).toContain(encodeURIComponent(url));
    });

    it('should start with domain-level source for non-google hosts', () => {
      const url = 'https://yts.do/';
      const img = FaviconService.createFaviconElement(url);

      expect(img.src).toContain('google.com/s2/favicons?domain=');
      expect(img.src).toContain('yts.do');
    });

    it('should use docs-specific favicon override when applicable', () => {
      const url = 'https://docs.google.com/document/d/abc123/edit';
      const img = FaviconService.createFaviconElement(url);

      expect(img.src).toContain('ssl.gstatic.com/docs/documents/images/kix-favicon7.ico');
    });

    it('should use normalized lookup URL for google search favicon source', () => {
      const url = 'https://www.google.com/search?q=The+1975&hl=en#ebo=0';
      const img = FaviconService.createFaviconElement(url);

      expect(img.src).toContain('google.com/s2/favicons?domain_url=');
      expect(img.src).toContain(encodeURIComponent('https://www.google.com/search'));
      expect(img.src).not.toContain(encodeURIComponent('q=The+1975'));
    });
  });

  describe('getFaviconHtml', () => {
    it('should return HTML string with img tag', () => {
      const url = 'https://www.reddit.com';
      const html = FaviconService.getFaviconHtml(url);
      
      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html).toContain('<img');
      expect(html).toContain('src=');
      expect(html).toContain('width="16"');
      expect(html).toContain('height="16"');
    });

    it('should include error handler in HTML', () => {
      const url = 'https://www.example.org';
      const html = FaviconService.getFaviconHtml(url);
      
      expect(html).toContain('onerror=');
    });

    it('should accept custom options', () => {
      const url = 'https://www.amazon.com';
      const options = { size: 24, className: 'large-favicon' };
      const html = FaviconService.getFaviconHtml(url, options);
      
      expect(html).toContain('width="24"');
      expect(html).toContain('height="24"');
      expect(html).toContain('large-favicon');
    });
  });

  describe('Cache management', () => {
    it('should cache favicon URLs', () => {
      const url = 'https://www.twitter.com';
      
      const firstCall = FaviconService.getFaviconUrl(url);
      const secondCall = FaviconService.getFaviconUrl(url);
      
      // Should return the same cached value
      expect(firstCall).toBe(secondCall);
    });

    it('should clear cache', () => {
      const url = 'https://www.linkedin.com';
      
      FaviconService.getFaviconUrl(url);
      FaviconService.clearCache();
      
      // After clearing, should work fine
      const faviconUrl = FaviconService.getFaviconUrl(url);
      expect(faviconUrl).toBeDefined();
    });
  });

  describe('URL variations', () => {
    it('should handle URLs with paths', () => {
      const url = 'https://github.com/user/repo';
      const faviconUrl = FaviconService.getFaviconUrl(url);
      
      expect(faviconUrl).toBeDefined();
    });

    it('should handle URLs with query parameters', () => {
      const url = 'https://www.google.com/search?q=test';
      const faviconUrl = FaviconService.getFaviconUrl(url);
      
      expect(faviconUrl).toBeDefined();
    });

    it('should handle URLs with different protocols', () => {
      const httpUrl = 'http://example.com';
      const httpsUrl = 'https://example.com';
      
      const httpFavicon = FaviconService.getFaviconUrl(httpUrl);
      const httpsFavicon = FaviconService.getFaviconUrl(httpsUrl);
      
      expect(httpFavicon).toBeDefined();
      expect(httpsFavicon).toBeDefined();
    });
  });
});
