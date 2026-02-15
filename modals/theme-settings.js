/**
 * ThemeSettingsModal
 * Provides UI for theme selection and background customization
 * Refactored to use BaseModal pattern with Tailwind CSS utilities
 */

const ThemeSettingsModal = (() => {
  /**
   * Show theme and background settings modal
   */
  async function show() {
    const [themes, currentThemeId, bgSettings, newTabEnabled, quoteEnabled, storedSearchEngine] = await Promise.all([
      Promise.resolve(ThemesService.getThemes()),
      ThemesService.getCurrentThemeId(),
      BackgroundsService.getBackgroundSettings(),
      Storage.get('newTabOverrideEnabled'),
      Storage.get('dailyQuoteEnabled'),
      Storage.get('searchEngine'),
    ]);

    // Create overlay using BaseModal pattern
    const overlay = document.createElement('div');
    overlay.id = 'bm-modal-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    const modal = document.createElement('div');
    modal.className = 'bm-modal-card bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto';

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const unsplashCategories = BackgroundsService.getUnsplashCategories();
    const frequencies = BackgroundsService.FREQUENCIES;

    let selectedTheme = currentThemeId;
    let backgroundType = bgSettings.type;
    let selectedColor = bgSettings.color;
    let selectedCategories = bgSettings.unsplashCategories || [];
    let selectedFrequency = bgSettings.unsplashFrequency || 'never';
    let selectedDimmer = bgSettings.dimmer || 0;
    let newTabOverride = newTabEnabled !== false; // Default to true
    let dailyQuoteShow = quoteEnabled !== false; // Default to true

    const searchEngines = [
      { key: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' },
      { key: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
      { key: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
      { key: 'yahoo', name: 'Yahoo', url: 'https://search.yahoo.com/search?p=%s' },
      { key: 'custom', name: 'Custom', url: '' }
    ];
    const defaultSearchEngine = { key: 'google', url: 'https://www.google.com/search?q=%s' };
    const resolvedSearchEngine = storedSearchEngine && storedSearchEngine.url ? storedSearchEngine : defaultSearchEngine;
    let selectedSearchEngineKey = resolvedSearchEngine.key || 'google';
    let customSearchUrl = selectedSearchEngineKey === 'custom' ? (resolvedSearchEngine.url || '') : '';

    const themePreviewsHtml = Object.entries(themes)
      .map(
        ([id, theme]) => `
        <div class="theme-preview-item" data-theme-id="${id}" style="
          cursor: pointer;
          padding: 12px;
          border: ${id === selectedTheme ? '3px solid #000' : '2px solid #ddd'};
          border-radius: 8px;
          text-align: center;
          transition: all 0.2s;
          min-width: 120px;
        ">
          <div style="
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
          ">
            <div style="
              flex: 1;
              height: 30px;
              background: ${theme.primary};
              border-radius: 4px;
            "></div>
            <div style="
              flex: 1;
              height: 30px;
              background: ${theme.secondary};
              border-radius: 4px;
            "></div>
            <div style="
              flex: 1;
              height: 30px;
              background: ${theme.accent};
              border-radius: 4px;
            "></div>
          </div>
          <div style="font-size: 80%; font-weight: bold; color: #333;">${theme.name}</div>
        </div>
      `
      )
      .join('');

    const categoriesHtml = unsplashCategories
      .map(
        (cat) => `
        <label style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s;
        ">
          <input 
            type="checkbox" 
            class="unsplash-category" 
            value="${cat.id}"
            ${selectedCategories.includes(cat.id) ? 'checked' : ''}
            style="cursor: pointer;"
          >
          <span>${cat.name}</span>
        </label>
      `
      )
      .join('');

    const frequencyOptionsHtml = Object.entries(frequencies)
      .map(
        ([key, freq]) => `
        <option value="${key}" ${selectedFrequency === key ? 'selected' : ''}>
          ${freq.label}
        </option>
      `
      )
      .join('');

    modal.innerHTML = `
      <div style="
        background: var(--theme-background);
        border: 2px solid var(--theme-border);
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      ">
        <h2 style="margin-top: 0; margin-bottom: 24px; color: var(--theme-primary);">Personalize Your Experience</h2>

        <!-- Color Themes Section -->
        <div style="margin-bottom: 32px;">
          <h3 style="margin-top: 0; margin-bottom: 12px; color: var(--theme-primary);">Color Themes</h3>
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          ">
            ${themePreviewsHtml}
          </div>
        </div>
New Tab Override Section -->
        <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid var(--theme-border);">
          <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--theme-primary);">New Tab Behavior</h3>
          <label style="
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            padding: 12px;
            background: rgba(0,0,0,0.02);
            border-radius: 4px;
            margin-bottom: 8px;
          ">
            <input 
              type="checkbox" 
              id="new-tab-override-toggle"
              ${newTabOverride ? 'checked' : ''}
              style="cursor: pointer; width: 18px; height: 18px;"
            >
            <div>
              <div style="font-weight: bold; color: var(--theme-primary);">Open this extension on new tabs</div>
              <div style="font-size: 85%; color: var(--theme-secondary); margin-top: 4px;">
                When enabled, new tabs will show your bookmarks instead of the default Chrome new tab page.
              </div>
            </div>
          </label>
        </div>

        <!-- Daily Quote Section -->
        <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid var(--theme-border);">
          <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--theme-primary);">Daily Inspiration</h3>
          <label style="
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            padding: 12px;
            background: rgba(0,0,0,0.02);
            border-radius: 4px;
            margin-bottom: 8px;
          ">
            <input 
              type="checkbox" 
              id="daily-quote-toggle"
              ${dailyQuoteShow ? 'checked' : ''}
              style="cursor: pointer; width: 18px; height: 18px;"
            >
            <div>
              <div style="font-weight: bold; color: var(--theme-primary);">Show daily inspirational quote</div>
              <div style="font-size: 85%; color: var(--theme-secondary); margin-top: 4px;">
                Display a new inspirational quote each day on your homepage with manual refresh option.
              </div>
            </div>
          </label>
        </div>

        <!-- Search Engine Section -->
        <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid var(--theme-border);">
          <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--theme-primary);">Search Engine</h3>
          <label style="display: block; margin-bottom: 8px; font-weight: bold; color: var(--theme-primary);">
            Preferred search engine
          </label>
          <select id="search-engine-select" style="width: 100%; padding: 8px; border: 1px solid var(--theme-border); border-radius: 4px; margin-bottom: 12px; background: white; color: var(--theme-text);">
            ${searchEngines.map(engine => `
              <option value="${engine.key}" ${engine.key === selectedSearchEngineKey ? 'selected' : ''}>${engine.name}</option>
            `).join('')}
          </select>
          <input id="custom-engine-url" type="text" placeholder="Custom search URL (use %s for query)" value="${customSearchUrl}" style="width: 100%; padding: 8px; border: 1px solid var(--theme-border); border-radius: 4px; background: white; color: var(--theme-text); display: ${selectedSearchEngineKey === 'custom' ? 'block' : 'none'};" />
          <div style="font-size: 85%; color: var(--theme-secondary); margin-top: 6px;">
            Example: https://www.google.com/search?q=%s
          </div>
        </div>

        <!-- 
        <!-- Background Section -->
        <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid var(--theme-border);">
          <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--theme-primary);">Background</h3>

          <!-- Background Type Selector -->
          <div style="margin-bottom: 16px;">
            <label style="
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 12px;
              cursor: pointer;
            ">
              <input 
                type="radio" 
                name="bg-type" 
                value="color" 
                ${backgroundType === 'color' ? 'checked' : ''}
                style="cursor: pointer;"
              >
              <span>Solid Color</span>
            </label>
            <label style="
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 12px;
              cursor: pointer;
            ">
              <input 
                type="radio" 
                name="bg-type" 
                value="upload" 
                ${backgroundType === 'upload' ? 'checked' : ''}
                style="cursor: pointer;"
              >
              <span>Upload Image</span>
            </label>
            <label style="
              display: flex;
              align-items: center;
              gap: 8px;
              cursor: pointer;
            ">
              <input 
                type="radio" 
                name="bg-type" 
                value="unsplash" 
                ${backgroundType === 'unsplash' ? 'checked' : ''}
                style="cursor: pointer;"
              >
              <span>Unsplash</span>
            </label>
          </div>

          <!-- Color Picker -->
          <div id="color-bg-section" style="display: ${backgroundType === 'color' ? 'block' : 'none'}; margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: var(--theme-primary);">
              Pick a Color:
            </label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input 
                type="color" 
                id="bg-color-picker" 
                value="${selectedColor}" 
                style="width: 60px; height: 40px; cursor: pointer; border: 2px solid var(--theme-border); border-radius: 4px;"
              >
              <span id="color-value" style="font-family: monospace; color: var(--theme-secondary);">${selectedColor}</span>
            </div>
          </div>

          <!-- Image Upload -->
          <div id="upload-bg-section" style="display: ${backgroundType === 'upload' ? 'block' : 'none'}; margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: var(--theme-primary);">
              Upload Image:
            </label>
            <p style="font-size: 85%; color: var(--theme-secondary); margin: 0 0 8px 0;">
              Min: 400×300px, Max: 5MB (JPG, PNG, WebP)
            </p>
            <input 
              type="file" 
              id="image-upload" 
              accept="image/jpeg,image/png,image/webp"
              style="display: block;"
            >
            <div id="upload-status" style="margin-top: 8px; font-size: 90%;"></div>
          </div>

          <!-- Unsplash Section -->
          <div id="unsplash-bg-section" style="display: ${backgroundType === 'unsplash' ? 'block' : 'none'};">
            <label style="display: block; margin-bottom: 12px; font-weight: bold; color: var(--theme-primary);">
              Categories:
            </label>
            <div style="
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              margin-bottom: 16px;
              max-height: 150px;
              overflow-y: auto;
              border: 1px solid var(--theme-border);
              padding: 8px;
              border-radius: 4px;
              background: white;
            ">
              ${categoriesHtml}
            </div>

            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: var(--theme-primary);">
              Update Frequency:
            </label>
            <select id="unsplash-frequency" style="
              width: 100%;
              padding: 8px;
              border: 1px solid var(--theme-border);
              border-radius: 4px;
              margin-bottom: 16px;
              background: white;
              color: var(--theme-text);
            ">
              ${frequencyOptionsHtml}
            </select>

            <button id="fetch-unsplash-btn" style="
              width: 100%;
              padding: 10px;
              background: var(--theme-primary);
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: bold;
              transition: background 0.2s;
            ">
              Get Random Image
            </button>
            <div id="unsplash-status" style="margin-top: 8px; font-size: 90%;"></div>
          </div>
        </div>

        <!-- Dimmer/Shader Section -->
        <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid var(--theme-border);">
          <h3 style="margin-top: 0; margin-bottom: 8px; color: var(--theme-primary);">Background Shader</h3>
          <p style="margin: 0 0 16px 0; font-size: 85%; color: var(--theme-secondary);">Dim or lighten your background for better visibility</p>
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 12px; color: var(--theme-secondary); font-weight: 600; min-width: 60px;">Dimmest</span>
            <input 
              type="range" 
              id="dimmer-slider" 
              min="-70" 
              max="70" 
              value="${selectedDimmer}" 
              style="flex: 1; height: 6px; cursor: pointer; accent-color: var(--theme-primary);"
            />
            <span style="font-size: 12px; color: var(--theme-secondary); font-weight: 600; min-width: 60px; text-align: right;">Lightest</span>
          </div>
          <div style="text-align: center; margin-top: 8px; font-size: 12px; color: var(--theme-secondary);">
            <span id="dimmer-value">${selectedDimmer > 0 ? '+' : ''}${selectedDimmer}%</span>
          </div>
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 8px; justify-content: flex-end; padding-top: 16px; border-top: 1px solid var(--theme-border);">
          <button id="cancel-settings-btn" style="
            padding: 10px 20px;
            background: white;
            border: 1px solid var(--theme-border);
            color: var(--theme-primary);
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s;
          ">
            Cancel
          </button>
          <button id="save-settings-btn" style="
            padding: 10px 20px;
            background: var(--theme-primary);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.2s;
          ">
            Save
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // New tab override toggle
    const newTabToggle = modal.querySelector('#new-tab-override-toggle');
    if (newTabToggle) {
      newTabToggle.addEventListener('change', (e) => {
        newTabOverride = e.target.checked;
      });
    }

    // Daily quote toggle
    const quoteToggle = modal.querySelector('#daily-quote-toggle');
    if (quoteToggle) {
      quoteToggle.addEventListener('change', (e) => {
        dailyQuoteShow = e.target.checked;
      });
    }

    // Theme selection
    modal.querySelectorAll('.theme-preview-item').forEach((item) => {
      item.addEventListener('click', () => {
        modal.querySelectorAll('.theme-preview-item').forEach((el) => {
          el.style.border = '2px solid #ddd';
        });
        item.style.border = '3px solid #000';
        selectedTheme = item.dataset.themeId;
      });
    });

    // Search engine selector
    const searchEngineSelect = modal.querySelector('#search-engine-select');
    const customEngineInput = modal.querySelector('#custom-engine-url');
    if (searchEngineSelect) {
      searchEngineSelect.addEventListener('change', (e) => {
        selectedSearchEngineKey = e.target.value;
        if (customEngineInput) {
          customEngineInput.style.display = selectedSearchEngineKey === 'custom' ? 'block' : 'none';
        }
      });
    }
    if (customEngineInput) {
      customEngineInput.addEventListener('input', (e) => {
        customSearchUrl = e.target.value;
      });
    }

    // Background type radio buttons
    modal.querySelectorAll('input[name="bg-type"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        backgroundType = e.target.value;
        document.getElementById('color-bg-section').style.display =
          backgroundType === 'color' ? 'block' : 'none';
        document.getElementById('upload-bg-section').style.display =
          backgroundType === 'upload' ? 'block' : 'none';
        document.getElementById('unsplash-bg-section').style.display =
          backgroundType === 'unsplash' ? 'block' : 'none';
      });
    });

    // Color picker
    const colorPicker = modal.querySelector('#bg-color-picker');
    if (colorPicker) {
      colorPicker.addEventListener('change', (e) => {
        selectedColor = e.target.value;
        document.getElementById('color-value').textContent = selectedColor;
      });
    }

    // Image upload
    const imageUpload = modal.querySelector('#image-upload');
    if (imageUpload) {
      imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById('upload-status');
        statusEl.textContent = 'Uploading...';
        statusEl.style.color = '#666';

        try {
          await BackgroundsService.uploadCustomImage(file);
          statusEl.textContent = 'Image uploaded successfully!';
          statusEl.style.color = '#00b020';
          backgroundType = 'upload';
          modal.querySelector('input[value="upload"]').checked = true;
          document.getElementById('color-bg-section').style.display = 'none';
          document.getElementById('upload-bg-section').style.display = 'block';
          document.getElementById('unsplash-bg-section').style.display = 'none';
        } catch (err) {
          statusEl.textContent = `Error: ${err.message}`;
          statusEl.style.color = '#f5222d';
        }
      });
    }

    // Category checkboxes
    modal.querySelectorAll('.unsplash-category').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedCategories.push(e.target.value);
        } else {
          selectedCategories = selectedCategories.filter((id) => id !== e.target.value);
        }
      });
    });

    // Frequency select
    const frequencySelect = modal.querySelector('#unsplash-frequency');
    if (frequencySelect) {
      frequencySelect.addEventListener('change', (e) => {
        selectedFrequency = e.target.value;
      });
    }

    // Dimmer slider
    const dimmerSlider = modal.querySelector('#dimmer-slider');
    const dimmerValue = modal.querySelector('#dimmer-value');
    if (dimmerSlider) {
      dimmerSlider.addEventListener('input', (e) => {
        selectedDimmer = parseInt(e.target.value);
        dimmerValue.textContent = selectedDimmer > 0 ? '+' + selectedDimmer + '%' : selectedDimmer + '%';
      });
    }

    // Fetch Unsplash image
    const fetchBtn = modal.querySelector('#fetch-unsplash-btn');
    if (fetchBtn) {
      fetchBtn.addEventListener('click', async () => {
        if (selectedCategories.length === 0) {
          const statusEl = document.getElementById('unsplash-status');
          statusEl.textContent = 'Please select at least one category';
          statusEl.style.color = '#f5222d';
          return;
        }

        const statusEl = document.getElementById('unsplash-status');
        statusEl.textContent = 'Fetching image...';
        statusEl.style.color = '#666';
        fetchBtn.disabled = true;
// Save new tab override preference
        await Storage.set({ newTabOverrideEnabled: newTabOverride });

        
        try {
          await BackgroundsService.setUnsplashBackground(selectedCategories, selectedFrequency);
          statusEl.textContent = 'Image loaded successfully!';
          statusEl.style.color = '#00b020';
          backgroundType = 'unsplash';
          modal.querySelector('input[value="unsplash"]').checked = true;
          document.getElementById('color-bg-section').style.display = 'none';
          document.getElementById('upload-bg-section').style.display = 'none';
          document.getElementById('unsplash-bg-section').style.display = 'block';
        } catch (err) {
          statusEl.textContent = `Error: ${err.message}`;
          statusEl.style.color = '#f5222d';
        } finally {
          fetchBtn.disabled = false;
        }
      });
    }

    // Cancel button
    modal.querySelector('#cancel-settings-btn').addEventListener('click', () => {
      overlay.remove();
    });

    // Keyboard accessibility for theme settings
    const handleSave = async () => {
      try {
        // Apply theme
        await ThemesService.setTheme(selectedTheme);

        // Apply background
        if (backgroundType === 'color') {
          await BackgroundsService.setColorBackground(selectedColor);
        } else if (backgroundType === 'unsplash') {
          await BackgroundsService.updateUnsplashSettings(selectedCategories, selectedFrequency);
        }

        // Save dimmer preference
        const currentSettings = await BackgroundsService.getBackgroundSettings();
        currentSettings.dimmer = selectedDimmer;
        await BackgroundsService.saveBackgroundSettings(currentSettings);

        // Apply dimmer overlay
        if (typeof ShaderService !== 'undefined') {
          ShaderService.applyShader(selectedDimmer);
        }

        // Save new tab override preference
        await Storage.set({ newTabOverrideEnabled: newTabOverride });

        // Save daily quote preference
        await Storage.set({ dailyQuoteEnabled: dailyQuoteShow });

        // Save search engine preference
        const selectedEngine = searchEngines.find((engine) => engine.key === selectedSearchEngineKey) || defaultSearchEngine;
        let searchUrl = selectedEngine.url;
        if (selectedSearchEngineKey === 'custom') {
          searchUrl = (customSearchUrl || '').trim();
        }
        if (!searchUrl || !searchUrl.includes('%s')) {
          alert('Search URL must include %s for query');
          return;
        }
        await Storage.set({ searchEngine: { key: selectedSearchEngineKey, url: searchUrl } });

        overlay.remove();
        
        // Reload page to apply quote visibility change
        window.location.reload();
      } catch (e) {
        console.error('Failed to save settings', e);
        alert('Failed to save settings: ' + e.message);
      }
    };

    // Keyboard accessibility
    document.addEventListener('keydown', (e) => {
      // Only handle if overlay is visible
      if (!document.body.contains(overlay)) return;

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        overlay.remove();
      }
    }, true);

    // Save button
    modal.querySelector('#save-settings-btn').addEventListener('click', handleSave);

    return overlay;
  }

  const api = { show };
  if (typeof window !== 'undefined') window.ThemeSettingsModal = api;
  return api;
})();
