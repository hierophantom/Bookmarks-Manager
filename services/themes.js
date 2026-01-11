/**
 * ThemesService
 * Manages vibrant color themes inspired by Slack (Electric Blue, Jazzy Yellow, etc.)
 * Stores preferences in chrome.storage.sync
 */

const ThemesService = (() => {
  // Slack-style vibrant themes
  const THEMES = {
    'electric-blue': {
      name: 'Electric Blue',
      primary: '#0066FF',
      secondary: '#0052CC',
      accent: '#00A8E8',
      background: '#F0F5FF',
      text: '#1A1A1A',
      border: '#D4E6FF',
    },
    'jazzy-yellow': {
      name: 'Jazzy Yellow',
      primary: '#FFD700',
      secondary: '#FFC700',
      accent: '#FFB700',
      background: '#FFFBF0',
      text: '#1A1A1A',
      border: '#FFE8B6',
    },
    'neon-pink': {
      name: 'Neon Pink',
      primary: '#FF006E',
      secondary: '#E0005F',
      accent: '#FB5607',
      background: '#FFF0F5',
      text: '#1A1A1A',
      border: '#FFB3D9',
    },
    'tropical-green': {
      name: 'Tropical Green',
      primary: '#00D926',
      secondary: '#00B020',
      accent: '#13C2C2',
      background: '#F6FFED',
      text: '#1A1A1A',
      border: '#B7EB8F',
    },
    'cosmic-purple': {
      name: 'Cosmic Purple',
      primary: '#9254DE',
      secondary: '#722ED1',
      accent: '#B37FEB',
      background: '#F9F0FF',
      text: '#1A1A1A',
      border: '#D3ADF7',
    },
    'sunset-orange': {
      name: 'Sunset Orange',
      primary: '#FF7A45',
      secondary: '#FF6B35',
      accent: '#FFA500',
      background: '#FFF4E6',
      text: '#1A1A1A',
      border: '#FFD591',
    },
    'ocean-cyan': {
      name: 'Ocean Cyan',
      primary: '#13C2C2',
      secondary: '#08979C',
      accent: '#36CFC9',
      background: '#E6FFFB',
      text: '#1A1A1A',
      border: '#87E8DE',
    },
    'crimson-red': {
      name: 'Crimson Red',
      primary: '#F5222D',
      secondary: '#D9001B',
      accent: '#FF4D4F',
      background: '#FFF1F0',
      text: '#1A1A1A',
      border: '#FFA39E',
    },
    'high-contrast': {
      name: 'High Contrast (Accessible)',
      primary: '#000000',
      secondary: '#000000',
      accent: '#FFD700',
      background: '#FFFFFF',
      text: '#000000',
      border: '#000000',
    },
  };

  const DEFAULT_THEME = 'electric-blue';

  /**
   * Get all available themes
   */
  function getThemes() {
    return THEMES;
  }

  /**
   * Get a specific theme by ID
   */
  function getTheme(themeId) {
    return THEMES[themeId] || THEMES[DEFAULT_THEME];
  }

  /**
   * Get current active theme ID
   */
  async function getCurrentThemeId() {
    try {
      const result = await chrome.storage.sync.get('currentTheme');
      return result.currentTheme || DEFAULT_THEME;
    } catch (e) {
      console.error('Failed to get current theme', e);
      return DEFAULT_THEME;
    }
  }

  /**
   * Get current active theme object
   */
  async function getCurrentTheme() {
    const id = await getCurrentThemeId();
    return getTheme(id);
  }

  /**
   * Set theme by ID
   */
  async function setTheme(themeId) {
    if (!THEMES[themeId]) {
      console.error('Theme not found:', themeId);
      return false;
    }
    try {
      await chrome.storage.sync.set({ currentTheme: themeId });
      applyThemeToDOM(themeId);
      return true;
    } catch (e) {
      console.error('Failed to set theme', e);
      return false;
    }
  }

  /**
   * Apply theme to DOM via CSS variables
   */
  function applyThemeToDOM(themeId) {
    const theme = getTheme(themeId);
    const root = document.documentElement;

    Object.entries(theme).forEach(([key, value]) => {
      if (key === 'name') return;
      const cssVarName = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVarName, value);
    });
  }

  /**
   * Initialize theming on page load
   */
  async function init() {
    try {
      const themeId = await getCurrentThemeId();
      applyThemeToDOM(themeId);

      // Listen for changes from other tabs/windows
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.currentTheme) {
          applyThemeToDOM(changes.currentTheme.newValue);
        }
      });
    } catch (e) {
      console.error('ThemesService.init failed', e);
    }
  }

  const api = { getThemes, getTheme, getCurrentThemeId, getCurrentTheme, setTheme, applyThemeToDOM, init };
  if (typeof window !== 'undefined') window.ThemesService = api;
  return api;
})();
