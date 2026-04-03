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
    const [themes, currentThemeId, bgSettings, newTabEnabled, quoteEnabled, topbarBackdropEnabled] = await Promise.all([
      Promise.resolve(ThemesService.getThemes()),
      ThemesService.getCurrentThemeId(),
      BackgroundsService.getBackgroundSettings(),
      Storage.get('newTabOverrideEnabled'),
      Storage.get('dailyQuoteEnabled'),
      Storage.get('topbarBackdropEnabled'),
    ]);

    if (typeof createModal !== 'function' || typeof showModal !== 'function') {
      await Modal.openError({
        title: 'Modal unavailable',
        message: 'Theme settings modal is unavailable. Please reload and try again.'
      });
      return null;
    }

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
    let showTopbarBackdrop = topbarBackdropEnabled !== false; // Default to true

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

    const content = document.createElement('div');
    content.className = 'theme-settings-modal__content';

    content.innerHTML = `
      <div class="theme-settings-modal__surface">

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

        <!-- Topbar Backdrop Section -->
        <div style="margin-bottom: 32px; padding-top: 24px; border-top: 1px solid var(--theme-border);">
          <h3 style="margin-top: 0; margin-bottom: 16px; color: var(--theme-primary);">Topbar Appearance</h3>
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
              id="topbar-backdrop-toggle"
              ${showTopbarBackdrop ? 'checked' : ''}
              style="cursor: pointer; width: 18px; height: 18px;"
            >
            <div>
              <div style="font-weight: bold; color: var(--theme-primary);">Show topbar background</div>
              <div style="font-size: 85%; color: var(--theme-secondary); margin-top: 4px;">
                When disabled, the topbar will be transparent with no backdrop blur.
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
        <div class="theme-settings-modal__utility-actions" style="display: flex; gap: 8px; justify-content: space-between; padding-top: 16px; border-top: 1px solid var(--theme-border);">
          <button id="privacy-policy-btn" style="
            padding: 10px 16px;
            background: transparent;
            border: 1px solid var(--theme-border);
            color: var(--theme-primary);
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
          ">
            <span class="material-symbols-outlined" aria-hidden="true" style="font-size: 18px;">policy</span>
            Privacy Policy
          </button>
        </div>
      </div>
    `;

    let shouldReload = false;

    const modalOverlay = createModal({
      type: 'form',
      title: 'Personalize your experience',
      content,
      buttons: [
        { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
        { label: 'Save', type: 'primary', role: 'confirm', shortcut: '↵' }
      ],
      onSubmit: handleSave,
      onClose: (confirmed) => {
        if (confirmed && shouldReload) {
          window.location.reload();
        }
      }
    });

    const modal = modalOverlay.querySelector('.modal');
    modal.classList.add('theme-settings-modal');
    showModal(modalOverlay);

    // New tab override toggle
    const newTabToggle = modalOverlay.querySelector('#new-tab-override-toggle');
    if (newTabToggle) {
      newTabToggle.addEventListener('change', (e) => {
        newTabOverride = e.target.checked;
      });
    }

    // Daily quote toggle
    const quoteToggle = modalOverlay.querySelector('#daily-quote-toggle');
    if (quoteToggle) {
      quoteToggle.addEventListener('change', (e) => {
        dailyQuoteShow = e.target.checked;
      });
    }

    // Topbar backdrop toggle
    const topbarBackdropToggle = modalOverlay.querySelector('#topbar-backdrop-toggle');
    if (topbarBackdropToggle) {
      topbarBackdropToggle.addEventListener('change', (e) => {
        showTopbarBackdrop = e.target.checked;
      });
    }

    // Theme selection
    modalOverlay.querySelectorAll('.theme-preview-item').forEach((item) => {
      item.addEventListener('click', () => {
        modalOverlay.querySelectorAll('.theme-preview-item').forEach((el) => {
          el.style.border = '2px solid #ddd';
        });
        item.style.border = '3px solid #000';
        selectedTheme = item.dataset.themeId;
      });
    });

    // Background type radio buttons
    modalOverlay.querySelectorAll('input[name="bg-type"]').forEach((radio) => {
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
    const colorPicker = modalOverlay.querySelector('#bg-color-picker');
    if (colorPicker) {
      colorPicker.addEventListener('change', (e) => {
        selectedColor = e.target.value;
        document.getElementById('color-value').textContent = selectedColor;
      });
    }

    // Image upload
    const imageUpload = modalOverlay.querySelector('#image-upload');
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
          modalOverlay.querySelector('input[value="upload"]').checked = true;
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
    modalOverlay.querySelectorAll('.unsplash-category').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedCategories.push(e.target.value);
        } else {
          selectedCategories = selectedCategories.filter((id) => id !== e.target.value);
        }
      });
    });

    // Frequency select
    const frequencySelect = modalOverlay.querySelector('#unsplash-frequency');
    if (frequencySelect) {
      frequencySelect.addEventListener('change', (e) => {
        selectedFrequency = e.target.value;
      });
    }

    // Dimmer slider
    const dimmerSlider = modalOverlay.querySelector('#dimmer-slider');
    const dimmerValue = modalOverlay.querySelector('#dimmer-value');
    if (dimmerSlider) {
      dimmerSlider.addEventListener('input', (e) => {
        selectedDimmer = parseInt(e.target.value);
        dimmerValue.textContent = selectedDimmer > 0 ? '+' + selectedDimmer + '%' : selectedDimmer + '%';
      });
    }

    // Fetch Unsplash image
    const fetchBtn = modalOverlay.querySelector('#fetch-unsplash-btn');
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
          modalOverlay.querySelector('input[value="unsplash"]').checked = true;
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

    // Privacy policy button
    const privacyPolicyBtn = modalOverlay.querySelector('#privacy-policy-btn');
    if (privacyPolicyBtn) {
      privacyPolicyBtn.addEventListener('click', () => {
        const policyUrl = chrome.runtime.getURL('core/privacy-policy.html');
        window.open(policyUrl, '_blank', 'noopener,noreferrer');
      });
    }

    // Keyboard accessibility for theme settings
    async function handleSave() {
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

        // Save topbar backdrop preference
        await Storage.set({ topbarBackdropEnabled: showTopbarBackdrop });
        
        // Apply topbar backdrop immediately
        const topbar = document.querySelector('.topbar');
        if (topbar) {
          if (showTopbarBackdrop) {
            topbar.classList.remove('topbar--no-backdrop');
          } else {
            topbar.classList.add('topbar--no-backdrop');
          }
        }

        shouldReload = true;
        return true;
      } catch (e) {
        console.error('Failed to save settings', e);
        await Modal.openError({
          title: 'Save failed',
          message: 'Failed to save settings: ' + e.message
        });
        return false;
      }
    }

    return modalOverlay;
  }

  const api = { show };
  if (typeof window !== 'undefined') window.ThemeSettingsModal = api;
  return api;
})();
