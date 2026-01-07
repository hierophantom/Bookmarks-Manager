/**
 * BackgroundsService
 * Manages background customization: solid colors, custom image uploads, and Unsplash random images
 * Handles frequency scheduling for automatic image rotation
 */

const BackgroundsService = (() => {
  const UNSPLASH_API_KEY = 'Cl3l2uuRTnCiseduo8ZzhKXbLgtOFP9_h0mTiUEwFK8';
  const UNSPLASH_API_URL = 'https://api.unsplash.com/photos/random';

  // Image validation constraints
  const IMAGE_CONSTRAINTS = {
    MIN_SIZE: 100 * 1024, // 100 KB
    MAX_SIZE: 5 * 1024 * 1024, // 5 MB
    ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
    MIN_WIDTH: 400,
    MIN_HEIGHT: 300,
  };

  // Frequency options for Unsplash rotation
  const FREQUENCIES = {
    never: { label: 'Never', value: 0 },
    '1h': { label: 'Every 1 hour', value: 3600000 },
    '6h': { label: 'Every 6 hours', value: 21600000 },
    '1d': { label: 'Every day', value: 86400000 },
  };

  /**
   * Get current background settings
   */
  async function getBackgroundSettings() {
    try {
      // Settings are in sync, large data (like image files) is in local
      const syncResult = await chrome.storage.sync.get('backgroundSettings');
      const localResult = await chrome.storage.local.get('backgroundImageData');
      
      const settings = syncResult.backgroundSettings || {
        type: 'color',
        color: '#FFFFFF',
        unsplashCategories: [],
        unsplashFrequency: 'never',
        lastUnsplashUpdate: null,
      };

      // Attach image data from local storage if it exists
      if (localResult.backgroundImageData) {
        settings.imageFile = localResult.backgroundImageData;
      }

      return settings;
    } catch (e) {
      console.error('Failed to get background settings', e);
      return {
        type: 'color',
        color: '#FFFFFF',
        unsplashCategories: [],
        unsplashFrequency: 'never',
        lastUnsplashUpdate: null,
      };
    }
  }

  /**
   * Save background settings (sync for settings, local for large image data)
   */
  async function saveBackgroundSettings(settings) {
    try {
      // Separate large image data from settings
      const settingsToSync = { ...settings };
      const imageData = settings.imageFile;
      delete settingsToSync.imageFile;

      // Save settings to sync storage
      await chrome.storage.sync.set({ backgroundSettings: settingsToSync });

      // Save image data to local storage if it exists
      if (imageData) {
        await chrome.storage.local.set({ backgroundImageData: imageData });
      } else {
        // Clear image data if switching away from upload
        await chrome.storage.local.remove('backgroundImageData');
      }

      applyBackgroundToDOM(settings);
      return true;
    } catch (e) {
      console.error('Failed to save background settings', e);
      return false;
    }
  }

  /**
   * Set solid color background
   */
  async function setColorBackground(color) {
    const settings = await getBackgroundSettings();
    settings.type = 'color';
    settings.color = color;
    settings.imageUrl = null;
    settings.imageFile = null;
    return saveBackgroundSettings(settings);
  }

  /**
   * Validate and upload custom image
   */
  async function uploadCustomImage(file) {
    // Validate file type
    if (!IMAGE_CONSTRAINTS.ALLOWED_FORMATS.includes(file.type)) {
      throw new Error(
        `Invalid format. Allowed: ${IMAGE_CONSTRAINTS.ALLOWED_FORMATS.join(', ')}`
      );
    }

    // Validate file size
    if (file.size < IMAGE_CONSTRAINTS.MIN_SIZE) {
      throw new Error(`Image too small. Minimum ${IMAGE_CONSTRAINTS.MIN_SIZE / 1024}KB`);
    }
    if (file.size > IMAGE_CONSTRAINTS.MAX_SIZE) {
      throw new Error(`Image too large. Maximum ${IMAGE_CONSTRAINTS.MAX_SIZE / 1024 / 1024}MB`);
    }

    // Validate image dimensions
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          if (
            img.width < IMAGE_CONSTRAINTS.MIN_WIDTH ||
            img.height < IMAGE_CONSTRAINTS.MIN_HEIGHT
          ) {
            reject(
              new Error(
                `Image too small. Minimum ${IMAGE_CONSTRAINTS.MIN_WIDTH}x${IMAGE_CONSTRAINTS.MIN_HEIGHT}px`
              )
            );
            return;
          }

          // Convert to data URL and store
          try {
            const settings = await getBackgroundSettings();
            settings.type = 'upload';
            settings.imageFile = e.target.result; // Store as data URL
            settings.imageUrl = null;
            await saveBackgroundSettings(settings);
            resolve(true);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Fetch random image from Unsplash
   */
  async function fetchUnsplashImage(categories = []) {
    try {
      const params = new URLSearchParams({
        client_id: UNSPLASH_API_KEY,
      });

      if (categories.length > 0) {
        params.append('collections', categories.join(','));
      }

      const response = await fetch(`${UNSPLASH_API_URL}?${params}`);
      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Ensure we have the right data structure
      if (!data || !data.urls || !data.urls.regular) {
        console.error('Unexpected Unsplash response format:', data);
        throw new Error('Invalid Unsplash response format');
      }

      return {
        url: data.urls.regular,
        photographer: data.user.name,
        photographerUrl: data.user.links.html,
        unsplashUrl: data.links.html,
      };
    } catch (e) {
      console.error('Failed to fetch Unsplash image', e);
      throw e;
    }
  }

  /**
   * Set Unsplash background with rotation frequency
   */
  async function setUnsplashBackground(categories, frequency) {
    try {
      const image = await fetchUnsplashImage(categories);
      const settings = await getBackgroundSettings();
      settings.type = 'unsplash';
      settings.imageUrl = image.url;
      settings.unsplashCategories = categories;
      settings.unsplashFrequency = frequency;
      settings.lastUnsplashUpdate = Date.now();
      settings.photographer = image.photographer;
      settings.photographerUrl = image.photographerUrl;
      settings.unsplashUrl = image.unsplashUrl;
      await saveBackgroundSettings(settings);
      scheduleUnsplashRotation(frequency, categories);
      return true;
    } catch (e) {
      console.error('Failed to set Unsplash background', e);
      throw e;
    }
  }

  /**
   * Update Unsplash settings (categories and frequency) without fetching new image
   */
  async function updateUnsplashSettings(categories, frequency) {
    try {
      const settings = await getBackgroundSettings();
      settings.unsplashCategories = categories;
      settings.unsplashFrequency = frequency;
      await saveBackgroundSettings(settings);
      scheduleUnsplashRotation(frequency, categories);
      return true;
    } catch (e) {
      console.error('Failed to update Unsplash settings', e);
      throw e;
    }
  }

  /**
   * Schedule Unsplash image rotation
   */
  function scheduleUnsplashRotation(frequency, categories) {
    // Clear existing timeout if any
    if (window._unsplashRotationTimeout) {
      clearTimeout(window._unsplashRotationTimeout);
    }

    if (frequency === 'never' || !FREQUENCIES[frequency]) {
      return;
    }

    const interval = FREQUENCIES[frequency].value;
    window._unsplashRotationTimeout = setInterval(async () => {
      try {
        await setUnsplashBackground(categories, frequency);
      } catch (e) {
        console.error('Failed to rotate Unsplash image', e);
      }
    }, interval);
  }

  /**
   * Apply background to DOM
   */
  function applyBackgroundToDOM(settings) {
    const root = document.documentElement;

    switch (settings.type) {
      case 'color':
        root.style.setProperty('--bg-type', 'color');
        root.style.setProperty('--bg-color', settings.color);
        root.style.setProperty(
          '--bg-image',
          'none'
        );
        break;

      case 'upload':
        if (settings.imageFile) {
          root.style.setProperty('--bg-type', 'image');
          root.style.setProperty('--bg-image', `url('${settings.imageFile}')`);
        }
        break;

      case 'unsplash':
        if (settings.imageUrl) {
          root.style.setProperty('--bg-type', 'image');
          root.style.setProperty('--bg-image', `url('${settings.imageUrl}')`);
        }
        break;
    }
  }

  /**
   * Initialize backgrounds on page load
   */
  async function init() {
    try {
      const settings = await getBackgroundSettings();
      applyBackgroundToDOM(settings);

      // Schedule Unsplash rotation if configured
      if (settings.type === 'unsplash' && settings.unsplashFrequency !== 'never') {
        scheduleUnsplashRotation(settings.unsplashFrequency, settings.unsplashCategories);
      }

      // Listen for changes from other tabs/windows (sync storage)
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.backgroundSettings) {
          const newSettings = changes.backgroundSettings.newValue;
          // Re-fetch image data from local storage if needed
          chrome.storage.local.get('backgroundImageData', (result) => {
            if (result.backgroundImageData && newSettings.type === 'upload') {
              newSettings.imageFile = result.backgroundImageData;
            }
            applyBackgroundToDOM(newSettings);
          });
        }
      });
    } catch (e) {
      console.error('BackgroundsService.init failed', e);
    }
  }

  /**
   * Get available Unsplash categories/collections
   * Note: In production, you might want to cache this or fetch from a list endpoint
   */
  function getUnsplashCategories() {
    return [
      { id: '1065976', name: 'Nature' },
      { id: '1088404', name: 'Urban' },
      { id: '1491704', name: 'Abstract' },
      { id: '799589', name: 'Animals' },
      { id: '1447306', name: 'Minimalism' },
      { id: '162', name: 'Business' },
      { id: '2102', name: 'Technology' },
      { id: '3178144', name: 'Art' },
      { id: '4206', name: 'Food' },
      { id: '6014849', name: 'Travel' },
    ];
  }

  const api = {
    getBackgroundSettings,
    saveBackgroundSettings,
    setColorBackground,
    uploadCustomImage,
    fetchUnsplashImage,
    setUnsplashBackground,
    updateUnsplashSettings,
    getUnsplashCategories,
    FREQUENCIES,
    IMAGE_CONSTRAINTS,
    init,
  };
  if (typeof window !== 'undefined') window.BackgroundsService = api;
  return api;
})();
