/**
 * Folder Customization Service
 * Manages custom emoji and color for folders
 */
const FolderCustomizationService = (() => {
  const STORAGE_KEY = 'folderCustomization';
  
  // BMG-136 color palette
  const COLORS = [
    { name: 'Cloud', value: '#DBDCE0' },
    { name: 'Coral', value: '#FF847E' },
    { name: 'Sun', value: '#FFD549' },
    { name: 'Mint', value: '#69CB90' },
    { name: 'Blush', value: '#FF83CF' },
    { name: 'Lavender', value: '#CF88FF' },
    { name: 'Aqua', value: '#4DDCEF' },
    { name: 'Peach', value: '#FFAA63' }
  ];

  /**
   * Get all folder customizations
   */
  async function getAll() {
    const data = await Storage.get(STORAGE_KEY);
    return data || {};
  }

  /**
   * Get customization for a specific folder
   */
  async function get(folderId) {
    const all = await getAll();
    return all[folderId] || null;
  }

  /**
   * Set customization for a folder
   */
  async function set(folderId, customization) {
    const all = await getAll();
    all[folderId] = customization;
    await Storage.set({ [STORAGE_KEY]: all });
  }

  /**
   * Remove customization for a folder
   */
  async function remove(folderId) {
    const all = await getAll();
    delete all[folderId];
    await Storage.set({ [STORAGE_KEY]: all });
  }

  /**
   * Get available colors
   */
  function getColors() {
    return COLORS;
  }

  /**
   * Generate folder icon HTML with custom emoji and color
   */
  function getFolderIconHtml(customization) {
    if (!customization || (!customization.emoji && !customization.color)) {
      return '📁'; // Default folder emoji
    }

    const emoji = customization.emoji || '📁';
    const color = customization.color;

    if (color) {
      return `<span class="custom-folder-icon" style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: ${color}; border-radius: 4px; font-size: 14px;">${emoji}</span>`;
    }

    return emoji;
  }

  /**
   * Get folder styles (for borders and backgrounds)
   */
  function getFolderStyles(customization) {
    if (!customization || !customization.color) {
      return {};
    }

    const color = customization.color;
    return {
      borderColor: color,
      backgroundColor: `${color}15`, // 15 is ~8% opacity in hex
      hoverBackgroundColor: `${color}25`, // 25 is ~15% opacity
      selectedBackgroundColor: `${color}35` // 35 is ~20% opacity
    };
  }

  return {
    getAll,
    get,
    set,
    remove,
    getColors,
    getFolderIconHtml,
    getFolderStyles
  };
})();
