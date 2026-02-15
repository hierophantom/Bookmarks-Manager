/**
 * Background Shader Utility
 * Applies a dimmer/lighter overlay on top of background images
 * Range: -70 (full dim with black) to +70 (full lighten with white)
 */

const ShaderService = (() => {
  /**
   * Apply shader overlay based on dimmer value
   * @param {number} dimmerValue - Value from -70 to 70
   */
  function applyShader(dimmerValue = 0) {
    // Clamp value to valid range
    const clamped = Math.max(-70, Math.min(70, dimmerValue || 0));
    
    // Get or create shader layer
    let shaderLayer = document.getElementById('bmg-shader-layer');
    if (!shaderLayer) {
      shaderLayer = document.createElement('div');
      shaderLayer.id = 'bmg-shader-layer';
      
      // Insert after bmg-main-content background but before content
      const mainContent = document.getElementById('bmg-main-content');
      if (mainContent) {
        mainContent.style.position = 'relative';
        mainContent.insertBefore(shaderLayer, mainContent.firstChild);
      }
    }

    // Calculate overlay color and opacity
    if (clamped < 0) {
      // Dimmer: black overlay
      const opacity = (Math.abs(clamped) / 70) * 0.7; // Up to 70% opacity
      shaderLayer.style.backgroundColor = 'rgba(0, 0, 0, ' + opacity + ')';
    } else if (clamped > 0) {
      // Lighter: white overlay
      const opacity = (clamped / 70) * 0.7; // Up to 70% opacity
      shaderLayer.style.backgroundColor = 'rgba(255, 255, 255, ' + opacity + ')';
    } else {
      // No shader
      shaderLayer.style.backgroundColor = 'transparent';
    }
  }

  /**
   * Initialize shader from background settings
   */
  async function init() {
    try {
      const settings = await BackgroundsService.getBackgroundSettings();
      applyShader(settings.dimmer);

      // Watch for changes
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes.backgroundSettings) {
          const newSettings = changes.backgroundSettings.newValue;
          applyShader(newSettings.dimmer);
        }
      });
    } catch (error) {
      console.warn('[ShaderService] Initialization failed:', error);
    }
  }

  return {
    applyShader,
    init
  };
})();
