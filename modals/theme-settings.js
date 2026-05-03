/**
 * ThemeSettingsModal
 * Preferences modal rebuilt with Shelf design-system components.
 */

const ThemeSettingsModal = (() => {
  const BOOKMARK_LINK_TRIGGER_STORAGE_KEY = 'bookmarkLinkTriggerMode';

  async function show() {
    const requiredApis = [
      'createActionButton',
      'createTab',
      'createOptionCard',
      'createChoiceGroup',
      'createTextField',
      'createSelectionField',
      'createSelectionMenu',
      'createSettingSection',
      'createDimmer'
    ];

    const missingApis = requiredApis.filter((name) => typeof window[name] !== 'function');
    if (missingApis.length > 0) {
      await Modal.openError({
        title: 'Preferences unavailable',
        message: `Missing UI dependencies: ${missingApis.join(', ')}`
      });
      return null;
    }

    const [themes, currentThemeId, bgSettings, newTabEnabled, quoteEnabled, topbarBackdropEnabled, searchEngine, customSearchProviderTemplate, bookmarkLinkTriggerMode] = await Promise.all([
      Promise.resolve(ThemesService.getThemes()),
      ThemesService.getCurrentThemeId(),
      BackgroundsService.getBackgroundSettings(),
      Storage.get('newTabOverrideEnabled'),
      Storage.get('dailyQuoteEnabled'),
      Storage.get('topbarBackdropEnabled'),
      Storage.get('searchEngine'),
      Storage.get('customSearchProviderTemplate'),
      Storage.get(BOOKMARK_LINK_TRIGGER_STORAGE_KEY)
    ]);

    const frequencyOptions = Object.entries(BackgroundsService.FREQUENCIES).map(([value, config]) => ({
      value,
      label: config.label
    }));

    const state = {
      activePane: 'look-feel',
      themes,
      unsplashCategories: BackgroundsService.getUnsplashCategories(),
      frequencyOptions,
      selectedTheme: currentThemeId,
      backgroundType: bgSettings.type || 'color',
      selectedColor: bgSettings.color || '#001194',
      selectedCategories: Array.isArray(bgSettings.unsplashCategories) ? [...bgSettings.unsplashCategories] : [],
      selectedFrequency: bgSettings.unsplashFrequency || 'never',
      selectedDimmer: Number.isFinite(bgSettings.dimmer) ? bgSettings.dimmer : 0,
      newTabOverride: newTabEnabled !== false,
      dailyQuoteShow: quoteEnabled !== false,
      showTopbarBackdrop: topbarBackdropEnabled !== false,
      homePageSections: typeof HomePageSectionsService !== 'undefined' && HomePageSectionsService
        ? await HomePageSectionsService.getState()
        : {},
      searchEngine: normalizeSearchProviderId(searchEngine),
      customSearchProviderTemplate: typeof customSearchProviderTemplate === 'string' ? customSearchProviderTemplate : '',
      bookmarkLinkTriggerMode: normalizeBookmarkLinkTriggerMode(bookmarkLinkTriggerMode),
      searchEngineStatus: '',
      searchEngineStatusTone: 'muted',
      backgroundSettings: bgSettings,
      pendingUploadName: '',
      uploadStatus: '',
      uploadStatusTone: 'muted',
      unsplashStatus: '',
      unsplashStatusTone: 'muted',
      cleanupFns: []
    };

    const content = document.createElement('div');
    content.className = 'theme-settings-modal__content';

    const modalOverlay = createPreferencesShell({
      content,
      onClose: () => {
        cleanupRender(state);
      }
    });

    renderModal(content, modalOverlay.close, state);
    showPreferencesShell(modalOverlay.overlay);

    return modalOverlay.overlay;
  }

  function renderModal(content, closePreferences, state) {
    cleanupRender(state);
    content.innerHTML = '';

    const closeButton = createActionButton({
      icon: createModalIcon('close'),
      label: 'Close preferences',
      onClick: closePreferences
    });
    closeButton.classList.add('theme-settings-modal__close');

    const layout = document.createElement('div');
    layout.className = 'theme-settings-modal__layout';

    layout.appendChild(buildSidebar(state, () => renderModal(content, closePreferences, state)));
    layout.appendChild(buildPanel(state, () => renderModal(content, closePreferences, state)));

    content.append(layout, closeButton);
  }

  function buildSidebar(state, rerender) {
    const sidebar = document.createElement('aside');
    sidebar.className = 'theme-settings-modal__sidebar';

    const sidebarContent = document.createElement('div');
    sidebarContent.className = 'theme-settings-modal__sidebar-content';

    const tabs = document.createElement('div');
    tabs.className = 'theme-settings-modal__tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Preferences sections');

    const tabConfigs = [
      {
        key: 'look-feel',
        label: 'Look & feel',
        subtitle: 'Control how the app looks'
      },
      {
        key: 'general',
        label: 'General behaviour',
        subtitle: 'Control how the app acts'
      }
    ];

    tabConfigs.forEach((config) => {
      const tab = createTab({
        label: config.label,
        subtitle: config.subtitle,
        hideBadge: true,
        active: state.activePane === config.key,
        onClick: () => {
          if (state.activePane === config.key) return;
          state.activePane = config.key;
          rerender();
        }
      });
      tabs.appendChild(tab);
    });

    const footer = document.createElement('div');
    footer.className = 'theme-settings-modal__sidebar-footer';

    const privacyLink = document.createElement('a');
    privacyLink.className = 'theme-settings-modal__privacy-link';
    privacyLink.textContent = 'Privacy Policy';
    privacyLink.href = chrome.runtime.getURL('core/privacy-policy.html');
    privacyLink.target = '_blank';
    privacyLink.rel = 'noopener noreferrer';

    sidebarContent.append(tabs, footer);
    footer.appendChild(privacyLink);
    sidebar.appendChild(sidebarContent);
    return sidebar;
  }

  function buildPanel(state, rerender) {
    const panel = document.createElement('section');
    panel.className = 'theme-settings-modal__panel';

    const header = document.createElement('div');
    header.className = 'theme-settings-modal__panel-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'theme-settings-modal__title-wrap';

    const title = document.createElement('h2');
    title.className = 'theme-settings-modal__title';
    title.id = 'theme-settings-title';
    title.textContent = state.activePane === 'look-feel' ? 'Look & feel' : 'General behaviour';

    const subtitle = document.createElement('p');
    subtitle.className = 'theme-settings-modal__subtitle';
    subtitle.textContent = state.activePane === 'look-feel'
      ? 'Control how the app looks'
      : 'Control how the app acts';

    titleWrap.append(title, subtitle);

    header.append(titleWrap);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'theme-settings-modal__panel-body';
    body.appendChild(
      state.activePane === 'look-feel'
        ? buildLookAndFeelPane(state, rerender)
        : buildGeneralBehaviourPane(state, rerender)
    );
    panel.appendChild(body);

    return panel;
  }

  function buildLookAndFeelPane(state, rerender) {
    const pane = document.createElement('div');
    pane.className = 'theme-settings-modal__pane';

    pane.appendChild(buildThemesSection(state, rerender));
    pane.appendChild(buildBackgroundSection(state, rerender));
    pane.appendChild(buildDimmerSection(state));
    pane.appendChild(createSettingSection({
      title: 'Header backdrop',
      description: 'Show or hide the blurred background behind the top bar.',
      content: createChoiceGroup({
        type: 'radio',
        items: [
          { label: 'Show', value: 'show', checked: state.showTopbarBackdrop },
          { label: 'Hide', value: 'hide', checked: !state.showTopbarBackdrop }
        ],
        onChange: async ({ changedValue }) => {
          state.showTopbarBackdrop = changedValue === 'show';
          await Storage.set({ topbarBackdropEnabled: state.showTopbarBackdrop });
          const topbar = document.querySelector('.topbar');
          if (topbar) {
            topbar.classList.toggle('topbar--no-backdrop', !state.showTopbarBackdrop);
          }
        }
      })
    }));

    return pane;
  }

  function buildGeneralBehaviourPane(state, rerender) {
    const pane = document.createElement('div');
    pane.className = 'theme-settings-modal__pane';

    pane.appendChild(createSettingSection({
      title: 'Open Journey on new tabs',
      description: 'Allow Journey to replace the default Chrome new-tab page.',
      content: createChoiceGroup({
        type: 'radio',
        items: [
          { label: 'Enabled', value: 'enabled', checked: state.newTabOverride },
          { label: 'Disabled', value: 'disabled', checked: !state.newTabOverride }
        ],
        onChange: async ({ changedValue }) => {
          state.newTabOverride = changedValue === 'enabled';
          await Storage.set({ newTabOverrideEnabled: state.newTabOverride });
        }
      })
    }));

    pane.appendChild(createSettingSection({
      title: 'Link interaction',
      description: 'Choose how bookmark links open when you click them.',
      content: createChoiceGroup({
        type: 'radio',
        name: 'bookmark-link-trigger-mode',
        items: [
          { label: 'Open in a new tab', value: 'new-tab', checked: state.bookmarkLinkTriggerMode === 'new-tab' },
          { label: 'Open in the same tab', value: 'same-tab', checked: state.bookmarkLinkTriggerMode === 'same-tab' }
        ],
        onChange: async ({ changedValue }) => {
          state.bookmarkLinkTriggerMode = normalizeBookmarkLinkTriggerMode(changedValue);
          await Storage.set({ [BOOKMARK_LINK_TRIGGER_STORAGE_KEY]: state.bookmarkLinkTriggerMode });
          if (typeof window.setBookmarkLinkTriggerMode === 'function') {
            window.setBookmarkLinkTriggerMode(state.bookmarkLinkTriggerMode);
          }
        }
      })
    }));

    pane.appendChild(buildSearchEngineSection(state, rerender));
    pane.appendChild(buildHomePageSectionsSection(state, rerender));

    pane.appendChild(createSettingSection({
      title: 'Daily inspiration',
      description: 'Display a new inspirational quote each day on the home screen.',
      divided: false,
      content: createChoiceGroup({
        type: 'radio',
        items: [
          { label: 'Show', value: 'show', checked: state.dailyQuoteShow },
          { label: 'Hide', value: 'hide', checked: !state.dailyQuoteShow }
        ],
        onChange: async ({ changedValue }) => {
          state.dailyQuoteShow = changedValue === 'show';
          await applyDailyQuoteVisibility(state.dailyQuoteShow);
        }
      })
    }));

    return pane;
  }

  function buildSearchEngineSection(state, rerender) {
    const content = [];

    content.push(createChoiceGroup({
      type: 'radio',
      items: [
        { label: 'Google', value: 'google', checked: state.searchEngine === 'google' },
        { label: 'DuckDuckGo', value: 'duckduckgo', checked: state.searchEngine === 'duckduckgo' },
        { label: 'Yahoo', value: 'yahoo', checked: state.searchEngine === 'yahoo' },
        { label: 'Bing', value: 'bing', checked: state.searchEngine === 'bing' },
        { label: 'Custom', value: 'custom', checked: state.searchEngine === 'custom' }
      ],
      onChange: async ({ changedValue }) => {
        state.searchEngine = normalizeSearchProviderId(changedValue);
        state.searchEngineStatus = '';
        state.searchEngineStatusTone = 'muted';
        await persistSearchEnginePreferences(state);
        rerender();
      }
    }));

    if (state.searchEngine === 'custom') {
      const templateField = createTextField({
        value: state.customSearchProviderTemplate,
        placeholder: 'https://example.com/search?q={query}',
        contrast: 'high',
        ariaLabel: 'Custom search URL template',
        onInput: (_event, value) => {
          state.customSearchProviderTemplate = value;
        },
        onSubmit: async (_event, value) => {
          state.customSearchProviderTemplate = value;
          await persistSearchEnginePreferences(state);
          rerender();
        }
      });
      templateField.classList.add('theme-settings-modal__search-template-field');
      const templateInput = templateField.querySelector('.text-field__input');
      if (templateInput) {
        templateInput.addEventListener('blur', async () => {
          await persistSearchEnginePreferences(state);
          rerender();
        });
      }
      content.push(templateField);
      content.push(createHelpText('Use {query} where the user search should be inserted.'));
    }

    if (state.searchEngineStatus) {
      content.push(createStatusMessage(state.searchEngineStatus, state.searchEngineStatusTone));
    }

    return createSettingSection({
      title: 'Search engine',
      description: 'Select the homepage search provider.',
      content
    });
  }

  function buildHomePageSectionsSection(state, rerender) {
    const stack = document.createElement('div');
    stack.className = 'theme-settings-modal__stack';

    const definitions = typeof HomePageSectionsService !== 'undefined' && HomePageSectionsService
      ? HomePageSectionsService.getDefinitions()
      : [];

    definitions
      .sort((left, right) => {
        const leftOrder = state.homePageSections[left.id]?.order ?? left.defaultOrder ?? 0;
        const rightOrder = state.homePageSections[right.id]?.order ?? right.defaultOrder ?? 0;
        return leftOrder - rightOrder;
      })
      .forEach((definition) => {
        const visible = state.homePageSections[definition.id]
          ? state.homePageSections[definition.id].visible !== false
          : definition.defaultVisible !== false;

        const leading = createModalIcon(definition.icon);
        const card = createOptionCard({
          label: definition.label,
          description: visible ? 'Visible on the home page' : 'Hidden from the home page',
          leading,
          trailing: visible ? 'visibility' : 'visibility_off',
          selected: visible,
          value: definition.id,
          onClick: async () => {
            if (typeof HomePageSectionsService === 'undefined' || !HomePageSectionsService) {
              return;
            }

            const nextVisible = !visible;
            state.homePageSections = await HomePageSectionsService.setSectionVisibility(definition.id, nextVisible);
            await refreshHomepageSectionVisibility(state.homePageSections);
            rerender();
          }
        });
        stack.appendChild(card);
      });

    return createSettingSection({
      title: 'Home page sections',
      description: 'Hide or show homepage sections without deleting their saved content. This also lays the groundwork for future section ordering.',
      content: stack
    });
  }

  function buildThemesSection(state, rerender) {
    const grid = document.createElement('div');
    grid.className = 'theme-settings-modal__option-grid';

    Object.entries(state.themes).forEach(([themeId, theme]) => {
      const leading = document.createElement('span');
      leading.className = 'theme-settings-modal__theme-dot';
      leading.style.background = theme.primary;

      const card = createOptionCard({
        label: theme.name,
        leading,
        selected: state.selectedTheme === themeId,
        value: themeId,
        onClick: async () => {
          state.selectedTheme = themeId;
          await ThemesService.setTheme(themeId);
          grid.querySelectorAll('.option-card').forEach((item) => {
            setOptionCardSelected(item, item.dataset.optionCardValue === themeId);
          });
        }
      });
      grid.appendChild(card);
    });

    return createSettingSection({
      title: 'Themes',
      content: grid
    });
  }

  function buildBackgroundSection(state, rerender) {
    const sectionContent = [];

    sectionContent.push(createChoiceGroup({
      type: 'radio',
      items: [
        {
          label: 'Solid color',
          value: 'color',
          checked: state.backgroundType === 'color',
          meta: state.selectedColor,
          metaType: 'tag'
        },
        {
          label: 'Upload image',
          value: 'upload',
          checked: state.backgroundType === 'upload',
          meta: getUploadSummary(state)
        },
        {
          label: 'Unsplash',
          value: 'unsplash',
          checked: state.backgroundType === 'unsplash'
        }
      ],
        onChange: async ({ changedValue }) => {
        state.backgroundType = changedValue;
          await applyBackgroundTypeSelection(state);
        rerender();
      }
    }));

    if (state.backgroundType === 'color') {
      sectionContent.push(buildColorControls(state));
    }

    if (state.backgroundType === 'upload') {
      sectionContent.push(buildUploadControls(state, rerender));
    }

    if (state.backgroundType === 'unsplash') {
      sectionContent.push(buildUnsplashControls(state, rerender));
    }

    return createSettingSection({
      title: 'Background',
      description: 'Select solid color, a random picture, or your own image.',
      content: sectionContent
    });
  }

  function buildColorControls(state) {
    const wrap = document.createElement('div');
    wrap.className = 'theme-settings-modal__color-controls';

    const input = document.createElement('input');
    input.className = 'theme-settings-modal__color-input';
    input.type = 'color';
    input.value = state.selectedColor;
    input.setAttribute('aria-label', 'Background color');
    input.addEventListener('input', async (event) => {
      state.selectedColor = event.target.value;
      swatch.style.background = state.selectedColor;
      valueTag.textContent = state.selectedColor;
      await BackgroundsService.setColorBackground(state.selectedColor);
      state.backgroundSettings = await BackgroundsService.getBackgroundSettings();
    });

    const swatch = document.createElement('span');
    swatch.className = 'theme-settings-modal__color-swatch';
    swatch.style.background = state.selectedColor;

    const valueTag = document.createElement('span');
    valueTag.className = 'theme-settings-modal__color-value';
    valueTag.textContent = state.selectedColor;

    wrap.append(input, swatch, valueTag);
    return wrap;
  }

  function buildUploadControls(state, rerender) {
    const wrap = document.createElement('div');
    wrap.className = 'theme-settings-modal__stack';

    const controls = document.createElement('div');
    controls.className = 'theme-settings-modal__upload-controls';

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'file';
    hiddenInput.accept = 'image/jpeg,image/png,image/webp';
    hiddenInput.className = 'theme-settings-modal__file-input';

    const button = createPrimaryButton({
      label: state.pendingUploadData ? 'Replace image' : 'Upload image',
      contrast: 'high',
      icon: 'add_2',
      onClick: () => hiddenInput.click()
    });

    const currentFile = document.createElement('span');
    currentFile.className = 'theme-settings-modal__meta-text';
    currentFile.textContent = getUploadSummary(state);

    hiddenInput.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      state.uploadStatus = 'Uploading image...';
      state.uploadStatusTone = 'muted';
      rerender();

      try {
        await BackgroundsService.uploadCustomImage(file);
        state.pendingUploadName = file.name;
        state.backgroundType = 'upload';
        state.backgroundSettings = await BackgroundsService.getBackgroundSettings();
        state.uploadStatus = 'Image applied.';
        state.uploadStatusTone = 'success';
      } catch (error) {
        state.uploadStatus = error.message;
        state.uploadStatusTone = 'error';
      }

      rerender();
    });

    controls.append(button, currentFile, hiddenInput);
    wrap.appendChild(controls);

    wrap.appendChild(createHelpText(getUploadRequirementsLabel()));

    if (state.uploadStatus) {
      wrap.appendChild(createStatusMessage(state.uploadStatus, state.uploadStatusTone));
    }

    return wrap;
  }

  function buildUnsplashControls(state, rerender) {
    const wrap = document.createElement('div');
    wrap.className = 'theme-settings-modal__stack';

    wrap.appendChild(createChoiceGroup({
      type: 'checkbox',
      columns: 2,
      items: state.unsplashCategories.map((category) => ({
        label: category.name,
        value: category.id,
        checked: state.selectedCategories.includes(category.id)
      })),
      onChange: ({ value }) => {
        state.selectedCategories = Array.isArray(value) ? value : [];
        persistUnsplashPreferences(state).catch((error) => {
          state.unsplashStatus = error.message;
          state.unsplashStatusTone = 'error';
          rerender();
        });
      }
    }));

    const controlsRow = document.createElement('div');
    controlsRow.className = 'theme-settings-modal__unsplash-controls';

    const frequencyField = buildFrequencyField(state, rerender);
    controlsRow.appendChild(frequencyField);

    const fetchButton = createPrimaryButton({
      label: 'Load random image',
      contrast: 'high',
      onClick: async () => {
        if (state.selectedCategories.length === 0) {
          state.unsplashStatus = 'Select at least one category before loading an image.';
          state.unsplashStatusTone = 'error';
          rerender();
          return;
        }

          state.unsplashStatus = 'Fetching image...';
        state.unsplashStatusTone = 'muted';
        rerender();

        try {
          await BackgroundsService.setUnsplashBackground(state.selectedCategories, state.selectedFrequency);
          state.backgroundSettings = await BackgroundsService.getBackgroundSettings();
          state.backgroundType = 'unsplash';
          state.unsplashStatus = 'Random image applied.';
          state.unsplashStatusTone = 'success';
        } catch (error) {
          state.unsplashStatus = error.message;
          state.unsplashStatusTone = 'error';
        }

        rerender();
      }
    });
    controlsRow.appendChild(fetchButton);

    wrap.appendChild(controlsRow);

    if (state.unsplashStatus) {
      wrap.appendChild(createStatusMessage(state.unsplashStatus, state.unsplashStatusTone));
    }

    return wrap;
  }

  function buildFrequencyField(state, rerender) {
    const currentOption = state.frequencyOptions.find((option) => option.value === state.selectedFrequency) || state.frequencyOptions[0];
    const hasSelection = Boolean(currentOption && currentOption.value !== 'never');
    const field = createSelectionField({
      label: currentOption ? currentOption.label : 'Never',
      selectionText: currentOption ? currentOption.label : 'Never',
      contrast: 'high',
      state: hasSelection ? 'selection' : 'idle',
      onClear: hasSelection
        ? () => {
            state.selectedFrequency = 'never';
            persistUnsplashPreferences(state).catch(() => {});
            rerender();
          }
        : null
    });
    field.classList.add('theme-settings-modal__frequency-field');

    let open = false;
    let menuWrapper = null;
    let documentClickHandler = null;

    const closeMenu = () => {
      if (!open) return;
      open = false;
      if (menuWrapper && menuWrapper.parentNode) {
        menuWrapper.parentNode.removeChild(menuWrapper);
      }
      menuWrapper = null;
      applySelectionFieldState(field, hasSelection ? 'selection' : 'idle');
      if (documentClickHandler) {
        document.removeEventListener('click', documentClickHandler);
        documentClickHandler = null;
      }
    };

    const openMenu = () => {
      if (open) return;
      open = true;
      const selectedIndex = Math.max(0, state.frequencyOptions.findIndex((option) => option.value === state.selectedFrequency));
      const menu = createSelectionMenu({
        type: 'sort',
        contrast: 'high',
        items: state.frequencyOptions.map((option) => option.label),
        selectedIndex,
        onSelect: (index) => {
          const selection = state.frequencyOptions[index];
          state.selectedFrequency = selection ? selection.value : 'never';
          persistUnsplashPreferences(state).catch(() => {});
          closeMenu();
          rerender();
        }
      });

      menuWrapper = document.createElement('div');
      menuWrapper.className = 'selection-field__menu';
      menuWrapper.appendChild(menu);
      field.appendChild(menuWrapper);
      applySelectionFieldState(field, 'active');

      documentClickHandler = (event) => {
        if (!field.contains(event.target)) {
          closeMenu();
        }
      };
      document.addEventListener('click', documentClickHandler);
    };

    field.addEventListener('click', (event) => {
      event.stopPropagation();
      if (open) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    state.cleanupFns.push(() => {
      closeMenu();
    });

    return field;
  }

  function buildDimmerSection(state) {
    return createSettingSection({
      title: 'Dimmer',
      description: 'Dim or lighten your background for better readability.',
      divided: false,
      content: createDimmer({
        value: state.selectedDimmer,
        showValue: true,
        onInput: (value) => {
          state.selectedDimmer = value;
          if (typeof ShaderService !== 'undefined') {
            ShaderService.applyShader(value);
          }
        },
        onChange: async (value) => {
          state.selectedDimmer = value;
          const currentSettings = await BackgroundsService.getBackgroundSettings();
          currentSettings.dimmer = value;
          await BackgroundsService.saveBackgroundSettings(currentSettings);
          state.backgroundSettings = currentSettings;
        }
      })
    });
  }

  function getUploadRequirementsLabel() {
    const constraints = BackgroundsService.IMAGE_CONSTRAINTS || {};
    const formats = (constraints.ALLOWED_FORMATS || [])
      .map((type) => type.split('/')[1])
      .filter(Boolean)
      .map((part) => part.toUpperCase())
      .join(', ');

    const sizeLabel = typeof constraints.MAX_SIZE === 'number'
      ? `${Math.round(constraints.MAX_SIZE / 1024 / 1024)}MB`
      : '5MB';

    return `Min: ${constraints.MIN_WIDTH || 400}x${constraints.MIN_HEIGHT || 300}px, Max ${sizeLabel} (${formats || 'JPG, PNG, WEBP'})`;
  }

  function getUploadSummary(state) {
    if (state.pendingUploadName) return state.pendingUploadName;
    if (state.backgroundSettings.type === 'upload' && state.backgroundSettings.imageFile) return 'Saved image';
    return 'No file chosen';
  }

  async function persistUnsplashPreferences(state) {
    const currentSettings = await BackgroundsService.getBackgroundSettings();
    currentSettings.unsplashCategories = [...state.selectedCategories];
    currentSettings.unsplashFrequency = state.selectedFrequency;
    await BackgroundsService.saveBackgroundSettings(currentSettings);
    state.backgroundSettings = currentSettings;
  }

    async function applyBackgroundTypeSelection(state) {
      if (state.backgroundType === 'color') {
        await BackgroundsService.setColorBackground(state.selectedColor);
        state.backgroundSettings = await BackgroundsService.getBackgroundSettings();
        return;
      }

      if (state.backgroundType === 'upload') {
        const currentSettings = await BackgroundsService.getBackgroundSettings();
        if (!currentSettings.imageFile) {
          state.uploadStatus = 'Choose an image to apply this background.';
          state.uploadStatusTone = 'muted';
          return;
        }

        currentSettings.type = 'upload';
        currentSettings.imageUrl = null;
        currentSettings.photographer = null;
        currentSettings.photographerUrl = null;
        currentSettings.unsplashUrl = null;
        currentSettings.lastUnsplashUpdate = null;
        await BackgroundsService.saveBackgroundSettings(currentSettings);
        state.backgroundSettings = currentSettings;
        return;
      }

      if (state.selectedCategories.length === 0) {
        state.unsplashStatus = 'Select at least one category to apply Unsplash.';
        state.unsplashStatusTone = 'muted';
        return;
      }

      const currentSettings = await BackgroundsService.getBackgroundSettings();
      currentSettings.unsplashCategories = [...state.selectedCategories];
      currentSettings.unsplashFrequency = state.selectedFrequency;

      if (currentSettings.imageUrl) {
        currentSettings.type = 'unsplash';
        await BackgroundsService.saveBackgroundSettings(currentSettings);
      } else {
        await BackgroundsService.setUnsplashBackground(state.selectedCategories, state.selectedFrequency);
      }

      state.backgroundSettings = await BackgroundsService.getBackgroundSettings();
    }

  function createHelpText(text) {
    const help = document.createElement('p');
    help.className = 'theme-settings-modal__helptext';
    help.textContent = text;
    return help;
  }

  function createStatusMessage(message, tone = 'muted') {
    const status = document.createElement('div');
    status.className = `theme-settings-modal__status theme-settings-modal__status--${tone}`;
    status.textContent = message;
    return status;
  }

  function normalizeSearchProviderId(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['google', 'duckduckgo', 'yahoo', 'bing', 'custom'].includes(normalized)) {
      return normalized;
    }
    return 'google';
  }

  function normalizeBookmarkLinkTriggerMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'same-tab' ? 'same-tab' : 'new-tab';
  }

  function isValidCustomSearchTemplate(template) {
    if (typeof template !== 'string') return false;
    const normalized = template.trim();
    if (!normalized || !normalized.includes('{query}')) return false;
    try {
      const parsed = new URL(normalized.replace('{query}', 'example'));
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  async function persistSearchEnginePreferences(state) {
    const providerId = normalizeSearchProviderId(state.searchEngine);
    const nextState = { searchEngine: providerId };

    if (providerId === 'custom') {
      if (!isValidCustomSearchTemplate(state.customSearchProviderTemplate)) {
        state.searchEngineStatus = 'Add a valid URL template with {query} to enable the custom provider.';
        state.searchEngineStatusTone = 'error';
      } else {
        nextState.customSearchProviderTemplate = state.customSearchProviderTemplate.trim();
        state.searchEngineStatus = 'Custom search provider saved.';
        state.searchEngineStatusTone = 'success';
      }
    } else {
      state.searchEngineStatus = `${getSearchEngineLabel(providerId)} selected.`;
      state.searchEngineStatusTone = 'success';
    }

    await Storage.set(nextState);
    await refreshHomepageSearchWidget();
  }

  function getSearchEngineLabel(providerId) {
    switch (providerId) {
      case 'duckduckgo': return 'DuckDuckGo';
      case 'yahoo': return 'Yahoo';
      case 'bing': return 'Bing';
      case 'custom': return 'Custom provider';
      default: return 'Google';
    }
  }

  async function refreshHomepageSearchWidget() {
    if (typeof WidgetsService === 'undefined' || !WidgetsService || typeof WidgetsService.render !== 'function') {
      return;
    }

    const container = document.getElementById('widgets-container');
    if (!container) return;
    await WidgetsService.render('widgets-container');
  }

  async function refreshHomepageSectionVisibility() {
    await refreshHomepageSearchWidget();
  }

  function cleanupRender(state) {
    if (!Array.isArray(state.cleanupFns)) {
      state.cleanupFns = [];
      return;
    }

    state.cleanupFns.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Theme settings cleanup failed', error);
      }
    });
    state.cleanupFns = [];
  }

  function createModalIcon(name) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = name;
    return icon;
  }

  function createPreferencesShell(options = {}) {
    const {
      content = null,
      onClose = null,
      closeOnEscape = true,
      closeOnBackdrop = true
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay modal-overlay--entering theme-settings-shell-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'theme-settings-title');

    const shell = document.createElement('div');
    shell.className = 'theme-settings-shell theme-settings-shell--entering';

    if (content instanceof HTMLElement) {
      shell.appendChild(content);
    }

    overlay.appendChild(shell);

    let closed = false;

    function close(confirmed = false) {
      if (closed) return;
      closed = true;

      overlay.classList.add('modal-overlay--exiting');
      shell.classList.add('theme-settings-shell--exiting');
      document.removeEventListener('keydown', handleKeyDown);

      window.setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        if (typeof onClose === 'function') {
          onClose(confirmed);
        }
      }, 200);
    }

    function handleKeyDown(event) {
      if (closeOnEscape && event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
    }

    overlay.addEventListener('click', (event) => {
      if (closeOnBackdrop && event.target === overlay) {
        close(false);
      }
    });

    document.addEventListener('keydown', handleKeyDown);

    return { overlay, shell, close };
  }

  function showPreferencesShell(overlay) {
    document.body.appendChild(overlay);

    window.setTimeout(() => {
      const firstFocusable = overlay.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 80);
  }

  async function applyDailyQuoteVisibility(show) {
    if (typeof DailyQuoteService !== 'undefined' && typeof DailyQuoteService.setEnabled === 'function') {
      await DailyQuoteService.setEnabled(show);
    } else {
      await Storage.set({ dailyQuoteEnabled: show });
    }

    const quoteContainer = document.getElementById('header-inspiration');
    const quoteText = document.getElementById('header-quote-text');
    const quoteAuthor = document.getElementById('header-quote-author');

    if (!show) {
      if (quoteContainer) quoteContainer.style.display = 'none';
      return;
    }

    if (quoteContainer) quoteContainer.style.display = '';

    if (typeof DailyQuoteService !== 'undefined' && typeof DailyQuoteService.getQuote === 'function') {
      try {
        const quote = await DailyQuoteService.getQuote();
        if (quoteText) quoteText.textContent = `"${quote.text}"`;
        if (quoteAuthor) {
          const authorName = quote.author;
          quoteAuthor.textContent = authorName;
          quoteAuthor.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(authorName.replace(/ /g, '_'))}`;
        }
      } catch (error) {
        console.warn('Failed to refresh daily quote visibility', error);
      }
    }
  }

  const api = { show };
  if (typeof window !== 'undefined') window.ThemeSettingsModal = api;
  return api;
})();