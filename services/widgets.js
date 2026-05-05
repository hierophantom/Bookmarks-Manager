const WidgetsService = (()=>{
  const STORAGE_KEY = 'slotWidgets';
  const DEFAULT_SLOTS = 8;
  const BOOKMARK_WIDGETS_KEY = 'bookmarkWidgetSlots';
  const BOOKMARK_ROW_SIZE = 5;
  const SEARCH_WIDGET_ID = 'widget-search-bar';
  const LEGACY_SEARCH_WIDGET_IDS = new Set(['search-bar-widget']);
  const SEARCH_WIDGET_SEEDED_KEY = 'searchBarWidgetSeeded';
  const SEARCH_PROVIDER_KEY = 'searchEngine';
  const SEARCH_CUSTOM_TEMPLATE_KEY = 'customSearchProviderTemplate';
  const SEARCH_WIDGET_SEARCH_DEBOUNCE_MS = 180;
  const BOOKMARK_LINK_TRIGGER_STORAGE_KEY = 'bookmarkLinkTriggerMode';
  const QUICK_LINKS_SEEDED_KEY = 'quickLinksTopSitesSeeded';
  const renderedWidgetCleanups = [];
  const SEARCH_PROVIDER_REGISTRY = {
    google: {
      id: 'google',
      name: 'Google',
      shortLabel: 'G',
      assetNames: ['Google', 'google'],
      template: 'https://www.google.com/search?q={query}'
    },
    bing: {
      id: 'bing',
      name: 'Bing',
      shortLabel: 'B',
      assetNames: ['Bing', 'bing'],
      template: 'https://www.bing.com/search?q={query}'
    },
    duckduckgo: {
      id: 'duckduckgo',
      name: 'DuckDuckGo',
      shortLabel: 'D',
      assetNames: ['Duckduckgo', 'duckduckgo'],
      template: 'https://duckduckgo.com/?q={query}'
    },
    yahoo: {
      id: 'yahoo',
      name: 'Yahoo',
      shortLabel: 'Y',
      assetNames: ['Yahoo', 'yahoo'],
      template: 'https://search.yahoo.com/search?p={query}'
    },
    custom: {
      id: 'custom',
      name: 'Custom',
      shortLabel: 'C',
      materialIcon: 'language',
      template: 'https://www.google.com/search?q={query}'
    }
  };

  async function render(containerId){
    const container = document.getElementById(containerId);
    if (!container) return;
    cleanupRenderedWidgets();
    container.innerHTML = '';

    await ensureSearchWidgetSeeded();
    await ensureQuickLinksSeeded();
    const sectionState = await getHomePageSectionState();
    const orderedSections = [
      { id: 'search', defaultOrder: 20, renderSection: () => renderSearchWidget(container, containerId, sectionState) },
      { id: 'quick-links', defaultOrder: 30, renderSection: () => renderBookmarkWidgets(container, containerId, sectionState) },
      { id: 'widgets', defaultOrder: 40, renderSection: () => renderStandardWidgets(container, containerId, sectionState) }
    ].sort((left, right) => {
      const leftOrder = sectionState && sectionState[left.id] ? sectionState[left.id].order : left.defaultOrder;
      const rightOrder = sectionState && sectionState[right.id] ? sectionState[right.id].order : right.defaultOrder;
      return leftOrder - rightOrder;
    });

    for (const section of orderedSections) {
      await section.renderSection();
    }
  }

  function normalizeBookmarkLinkTriggerMode(value) {
    return String(value || '').toLowerCase() === 'same-tab' ? 'same-tab' : 'new-tab';
  }

  async function openLinkByPreference(url, event = null) {
    if (!url) return;

    const openInBackgroundTab = Boolean(event && (event.metaKey || event.ctrlKey));
    if (openInBackgroundTab) {
      await chrome.tabs.create({ url, active: false });
      return;
    }

    let triggerMode = 'new-tab';
    try {
      triggerMode = normalizeBookmarkLinkTriggerMode(await Storage.get(BOOKMARK_LINK_TRIGGER_STORAGE_KEY));
    } catch (error) {
      console.warn('Failed to read link interaction preference in widgets, defaulting to new tab', error);
    }

    if (triggerMode === 'same-tab') {
      try {
        const currentTab = await chrome.tabs.getCurrent();
        if (currentTab && currentTab.id) {
          await chrome.tabs.update(currentTab.id, { url });
          return;
        }
      } catch (error) {
        console.warn('Widgets could not update current tab, falling back to location.assign', error);
      }
      window.location.assign(url);
      return;
    }

    await chrome.tabs.create({ url });
  }

  async function getHomePageSectionState() {
    if (typeof HomePageSectionsService === 'undefined' || !HomePageSectionsService || typeof HomePageSectionsService.getState !== 'function') {
      return null;
    }

    return HomePageSectionsService.getState();
  }

  async function ensureSearchWidgetSeeded() {
    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    const normalizedSlots = slots.map(normalizeSearchWidgetRecord);
    const slotsChanged = JSON.stringify(normalizedSlots) !== JSON.stringify(slots);

    if (slotsChanged) {
      await SlotSystem.save(STORAGE_KEY, normalizedSlots);
    }

    if (normalizedSlots.some(isSearchWidgetRecord)) {
      if (await Storage.get(SEARCH_WIDGET_SEEDED_KEY) !== true) {
        await Storage.set({ [SEARCH_WIDGET_SEEDED_KEY]: true });
      }
      return;
    }

    const seeded = await Storage.get(SEARCH_WIDGET_SEEDED_KEY);
    if (seeded) return;

    const emptyIndex = normalizedSlots.findIndex((slot) => !slot);
    if (emptyIndex === -1) {
      await Storage.set({ [SEARCH_WIDGET_SEEDED_KEY]: true });
      return;
    }

    await SlotSystem.setSlot(STORAGE_KEY, emptyIndex, createSearchWidgetRecord());
    await Storage.set({ [SEARCH_WIDGET_SEEDED_KEY]: true });
  }

  async function ensureQuickLinksSeeded() {
    const seeded = await Storage.get(QUICK_LINKS_SEEDED_KEY);
    if (seeded) return;

    // If user already has data, respect it and just mark seeded
    const existingSlots = await SlotSystem.getSlots(BOOKMARK_WIDGETS_KEY);
    const hasExistingData = Array.isArray(existingSlots) && existingSlots.some(Boolean);
    if (hasExistingData) {
      await Storage.set({ [QUICK_LINKS_SEEDED_KEY]: true });
      return;
    }

    // Mark seeded upfront so a failed call never retries
    await Storage.set({ [QUICK_LINKS_SEEDED_KEY]: true });

    let topSites = [];
    try {
      if (typeof chrome !== 'undefined' && chrome.topSites && typeof chrome.topSites.get === 'function') {
        topSites = await chrome.topSites.get();
      }
    } catch (error) {
      console.warn('Quick links seeding: could not load top sites', error);
    }

    if (!topSites.length) return;

    const toSeed = topSites.slice(0, BOOKMARK_ROW_SIZE);
    const seedSlots = toSeed.map((site) => createBookmarkWidgetRecord({ title: site.title || site.url, url: site.url }));
    while (seedSlots.length < BOOKMARK_ROW_SIZE) {
      seedSlots.push(null);
    }
    await SlotSystem.save(BOOKMARK_WIDGETS_KEY, seedSlots);
  }

  async function renderSearchWidget(container, containerId, sectionState = null) {
    if (sectionState && sectionState.search && sectionState.search.visible === false) {
      return;
    }

    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    if (slots.findIndex(isSearchWidgetRecord) === -1) return;

    const widget = await createHomepageSearchWidget(containerId);

    container.appendChild(createSearchWidgetSection(widget));
  }

  async function renderBookmarkWidgets(container, containerId, sectionState = null) {
    if (sectionState && sectionState['quick-links'] && sectionState['quick-links'].visible === false) {
      return;
    }

    const slots = await normalizeBookmarkSlots({ compact: true });

    const bookmarkItems = slots.map((item, idx) => {
      if (!item) {
        const emptyWidget = createWidgetGalleryTileSmall({
          type: 'empty',
          state: 'idle'
        });

        emptyWidget.addEventListener('click', async () => {
          const data = await Modal.openBookmarkForm({}, { showTabsSuggestions: true, showTags: false });
          if (!data) return;
          await setBookmarkSlot(idx, createBookmarkWidgetRecord(data));
          await render(containerId);
        });

        emptyWidget.addEventListener('dragover', (e) => {
          e.preventDefault();
          emptyWidget.classList.add('widget-gallery-tile-small--dragged');
        });
        emptyWidget.addEventListener('dragleave', () => {
          emptyWidget.classList.remove('widget-gallery-tile-small--dragged');
        });
        emptyWidget.addEventListener('drop', async (e) => {
          e.preventDefault();
          emptyWidget.classList.remove('widget-gallery-tile-small--dragged');
          const srcIndex = parseInt(e.dataTransfer.getData('text/bookmark-widget-index'), 10);
          if (isNaN(srcIndex)) return;
          await swapBookmarkSlots(srcIndex, idx);
          await render(containerId);
        });

        return emptyWidget;
      }

      const editBtn = createIconButton({
        icon: 'edit',
        label: 'Edit bookmark',
        tooltip: 'Edit bookmark',
        colorScheme: 'default',
        onClick: async (e) => {
          e.stopPropagation();
          const updated = await Modal.openBookmarkForm(
            { title: item.title || '', url: item.url || '' },
            { showTabsSuggestions: false, showTags: false }
          );
          if (!updated) return;
          await setBookmarkSlot(idx, createBookmarkWidgetRecord(updated));
          await render(containerId);
        }
      });

      const removeBtn = createIconButton({
        icon: 'close',
        label: 'Remove bookmark',
        tooltip: 'Remove bookmark',
        colorScheme: 'destructive',
        onClick: async (e) => {
          e.stopPropagation();
          const confirmed = await Modal.openConfirmation({
            title: 'Remove bookmark?',
            message: 'This bookmark will be removed from this widget section.',
            confirmText: 'Remove',
            destructive: true
          });
          if (!confirmed) return;
          await setBookmarkSlot(idx, null);
          await render(containerId);
        }
      });

      const faviconIcon = (typeof FaviconService !== 'undefined' && item.url)
        ? FaviconService.createFaviconElement(item.url, {
          size: 24,
          className: 'widget-gallery-tile-small__favicon',
          alt: item.title || 'Bookmark favicon'
        })
        : 'book';

      const widget = createWidgetGalleryTileSmall({
        type: 'widget',
        state: 'idle',
        label: item.title || 'Bookmark',
        subtext: getBookmarkSubtext(item.url),
        icon: faviconIcon,
        actions: [editBtn, removeBtn]
      });

      widget.setAttribute('draggable', 'true');
      widget.addEventListener('click', (event) => {
        if (!item.url) return;
        openLinkByPreference(item.url, event);
      });
      widget.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/bookmark-widget-index', String(idx));
        e.dataTransfer.effectAllowed = 'move';
      });
      widget.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      widget.addEventListener('drop', async (e) => {
        e.preventDefault();
        const srcIndex = parseInt(e.dataTransfer.getData('text/bookmark-widget-index'), 10);
        if (isNaN(srcIndex)) return;
        await swapBookmarkSlots(srcIndex, idx);
          await render(containerId);
      });
      widget.addEventListener('mouseenter', () => {
        widget.classList.remove('widget-gallery-tile-small--idle');
        widget.classList.add('widget-gallery-tile-small--hover');
      });
      widget.addEventListener('mouseleave', () => {
        widget.classList.remove('widget-gallery-tile-small--hover');
        widget.classList.add('widget-gallery-tile-small--idle');
      });

      return widget;
    });

    const addBookmarkAction = createLabeledIconButton({
      icon: 'add',
      label: 'Add bookmark',
      colorScheme: 'primary',
      onClick: async () => {
        const data = await Modal.openBookmarkForm({}, { showTabsSuggestions: true, showTags: false });
        if (!data) return;
        await addBookmarkToWidgetSection(createBookmarkWidgetRecord(data));
        await render(containerId);
      }
    });

    const bookmarkSection = createWidgetSection({
      items: bookmarkItems,
      state: 'idle',
      wrap: 'none',
      action: addBookmarkAction
    });
    bookmarkSection.classList.add('widget-section--even-slots');

    container.appendChild(createWidgetSectionWrapper('Quick links', bookmarkSection));
  }

  async function renderStandardWidgets(container, containerId, sectionState = null) {
    if (sectionState && sectionState.widgets && sectionState.widgets.visible === false) {
      return;
    }

    const slots = await normalizeStandardWidgetSlots();
    const slotEntries = slots
      .map((item, slotIndex) => ({ item, slotIndex }))
      .filter(({ item }) => !isSearchWidgetRecord(item));
    
    // Create cube section with widgets
    const widgetItems = slotEntries.map(({ item, slotIndex }) => {
      if (!item) {
        // Empty slot
        const emptyWidget = createWidgetGalleryTileSmall({
          type: 'empty',
          state: 'idle'
        });
        
        // Click to add widget
        emptyWidget.addEventListener('click', async () => {
          const pick = await Modal.openWidgetPicker();
          if (!pick) return;
          const result = await setStandardWidgetSlot(slotIndex, pick);
          if (!result.success && result.reason === 'duplicate-search-widget') {
            await Modal.openError({
              title: 'Search widget already added',
              message: 'Only one search bar widget can be added to the homepage.'
            });
            return;
          }
          await render(containerId);
        });
        
        // Drag and drop handlers
        emptyWidget.addEventListener('dragover', (e) => {
          e.preventDefault();
          emptyWidget.classList.add('widget-gallery-tile-small--dragged');
        });
        emptyWidget.addEventListener('dragleave', () => {
          emptyWidget.classList.remove('widget-gallery-tile-small--dragged');
        });
        emptyWidget.addEventListener('drop', async (e) => {
          e.preventDefault();
          emptyWidget.classList.remove('widget-gallery-tile-small--dragged');
          const srcIndex = parseInt(e.dataTransfer.getData('text/widget-index'), 10);
          if (isNaN(srcIndex)) return;
          await swapSlots(srcIndex, slotIndex);
          await render(containerId);
        });
        
        return emptyWidget;
      } else {
        const normalizedItem = normalizeStandardWidgetRecord(item);
        const preview = getStandardWidgetPreview(normalizedItem);
        const canEditWidget = typeof WidgetRegistryService !== 'undefined'
          && WidgetRegistryService
          && typeof WidgetRegistryService.hasSettings === 'function'
          && WidgetRegistryService.hasSettings(normalizedItem);
        
        // Create action buttons for hover state
        const editBtn = canEditWidget
          ? createIconButton({
            icon: 'edit',
            label: 'Edit',
            tooltip: 'Edit widget',
            colorScheme: 'default',
            onClick: async (e) => {
              e.stopPropagation();
              if (typeof Modal === 'undefined' || !Modal || typeof Modal.openWidgetSettings !== 'function') {
                return;
              }

              const updatedWidget = await Modal.openWidgetSettings(normalizedItem);
              if (!updatedWidget) return;

              await setStandardWidgetSlot(slotIndex, updatedWidget);
              await render(containerId);
            }
          })
          : null;
        
        const removeBtn = createIconButton({
          icon: 'close',
          label: 'Remove',
          tooltip: 'Remove widget',
          colorScheme: 'destructive',
          onClick: async (e) => {
            e.stopPropagation();
            const confirmed = await Modal.openConfirmation({
              title: 'Remove widget?',
              message: 'This widget will be removed from the slot.',
              confirmText: 'Remove',
              destructive: true
            });
            if (!confirmed) return;
            await SlotSystem.clearSlot(STORAGE_KEY, slotIndex);
            await render(containerId);
          }
        });
        
        const widget = createWidgetGalleryTileSmall({
          type: 'widget',
          state: 'idle',
          label: preview.label,
          subtext: preview.subtext,
          icon: preview.icon,
          actions: [editBtn, removeBtn].filter(Boolean)
        });
        bindStandardWidget(widget, normalizedItem);
        
        // Make widget draggable
        widget.setAttribute('draggable', 'true');
        widget.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/widget-index', String(slotIndex));
          e.dataTransfer.effectAllowed = 'move';
        });
        
        // Drag and drop handlers
        widget.addEventListener('dragover', (e) => {
          e.preventDefault();
        });
        widget.addEventListener('drop', async (e) => {
          e.preventDefault();
          const srcIndex = parseInt(e.dataTransfer.getData('text/widget-index'), 10);
          if (isNaN(srcIndex)) return;
          await swapSlots(srcIndex, slotIndex);
          await render(containerId);
        });
        
        // Show actions on hover
        widget.addEventListener('mouseenter', () => {
          widget.classList.remove('widget-gallery-tile-small--idle');
          widget.classList.add('widget-gallery-tile-small--hover');
        });
        widget.addEventListener('mouseleave', () => {
          widget.classList.remove('widget-gallery-tile-small--hover');
          widget.classList.add('widget-gallery-tile-small--idle');
        });
        
        return widget;
      }
    });
    
    // Create add widget action button
    const addWidgetAction = createLabeledIconButton({
      icon: 'add',
      label: 'Add widget',
      colorScheme: 'primary',
      onClick: async () => {
        const pick = await Modal.openWidgetPicker();
        if (!pick) return;
        const success = await addWidgetToFirstEmpty(pick);
        if (!success && pick.id === SEARCH_WIDGET_ID) {
          await Modal.openError({
            title: 'Search widget already added',
            message: 'Only one search bar widget can be added to the homepage.'
          });
          return;
        }
        if (success) {
          await render(containerId);
        }
      }
    });
    
    // Create cube section
    const cubeSection = createWidgetSection({
      items: widgetItems,
      state: 'idle',
      wrap: 'none',
      action: addWidgetAction
    });
    cubeSection.classList.add('widget-section--even-slots');

    container.appendChild(createWidgetSectionWrapper('Widgets', cubeSection));
  }

  function createWidgetSectionWrapper(title, sectionElement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-stack-section';

    const heading = document.createElement('h3');
    heading.className = 'subheading widget-stack-section__title';
    heading.textContent = title;

    wrapper.appendChild(heading);
    wrapper.appendChild(sectionElement);
    return wrapper;
  }

  function createSearchWidgetSection(sectionElement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-stack-section widget-stack-section--search';

    wrapper.appendChild(sectionElement);
    return wrapper;
  }

  function createBookmarkWidgetRecord(data) {
    return {
      title: data.title || 'Bookmark',
      url: data.url || ''
    };
  }

  function createSearchWidgetRecord() {
    return {
      id: SEARCH_WIDGET_ID,
      title: 'Search',
      subtitle: 'Web + bookmarks',
      icon: 'search'
    };
  }

  function normalizeSearchWidgetRecord(item) {
    if (!item || typeof item !== 'object') {
      return item;
    }

    if (item.id === SEARCH_WIDGET_ID) {
      return item;
    }

    if (!LEGACY_SEARCH_WIDGET_IDS.has(item.id)) {
      return item;
    }

    return {
      ...item,
      id: SEARCH_WIDGET_ID,
      title: item.title || 'Search',
      subtitle: item.subtitle || 'Web + bookmarks',
      icon: item.icon || 'search'
    };
  }

  function isSearchWidgetRecord(item) {
    return Boolean(
      item
      && typeof item.id === 'string'
      && (item.id === SEARCH_WIDGET_ID || LEGACY_SEARCH_WIDGET_IDS.has(item.id))
    );
  }

  async function setStandardWidgetSlot(index, item) {
    const normalizedItem = normalizeStandardWidgetRecord(item);

    if (isSearchWidgetRecord(normalizedItem)) {
      const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
      const existingSearchIndex = slots.findIndex(isSearchWidgetRecord);
      if (existingSearchIndex !== -1 && existingSearchIndex !== index) {
        return { success: false, reason: 'duplicate-search-widget' };
      }
    }

    await SlotSystem.setSlot(STORAGE_KEY, index, normalizedItem);
    return { success: true };
  }

  function cleanupRenderedWidgets() {
    while (renderedWidgetCleanups.length > 0) {
      const cleanup = renderedWidgetCleanups.pop();
      if (typeof cleanup !== 'function') continue;

      try {
        cleanup();
      } catch (error) {
        console.warn('Widget cleanup failed', error);
      }
    }
  }

  async function normalizeStandardWidgetSlots() {
    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    let changed = false;

    const normalizedSlots = slots.map((item) => {
      if (!item) {
        return item;
      }

      if (isSearchWidgetRecord(item)) {
        const normalizedSearchWidget = normalizeSearchWidgetRecord(item);
        if (JSON.stringify(normalizedSearchWidget) !== JSON.stringify(item)) {
          changed = true;
        }
        return normalizedSearchWidget;
      }

      const normalizedItem = normalizeStandardWidgetRecord(item);
      if (JSON.stringify(normalizedItem) !== JSON.stringify(item)) {
        changed = true;
      }

      return normalizedItem;
    });

    if (changed) {
      await SlotSystem.save(STORAGE_KEY, normalizedSlots);
    }

    return normalizedSlots;
  }

  function normalizeStandardWidgetRecord(item) {
    if (!item || isSearchWidgetRecord(item)) {
      return item;
    }

    if (typeof WidgetRegistryService !== 'undefined' && WidgetRegistryService && typeof WidgetRegistryService.normalizeStoredRecord === 'function') {
      return WidgetRegistryService.normalizeStoredRecord(item);
    }

    return item;
  }

  function getStandardWidgetPreview(item) {
    if (typeof WidgetRegistryService !== 'undefined' && WidgetRegistryService && typeof WidgetRegistryService.getWidgetPreview === 'function') {
      return WidgetRegistryService.getWidgetPreview(item);
    }

    return {
      label: item?.title || item?.id || 'Widget',
      subtext: item?.subtitle || 'Custom widget',
      icon: item?.icon || 'bookmark'
    };
  }

  function bindStandardWidget(widget, item) {
    if (typeof WidgetRegistryService === 'undefined' || !WidgetRegistryService || typeof WidgetRegistryService.bindWidgetElement !== 'function') {
      return;
    }

    const cleanup = WidgetRegistryService.bindWidgetElement(widget, item);
    if (typeof cleanup === 'function') {
      renderedWidgetCleanups.push(cleanup);
    }
  }

  async function createHomepageSearchWidget(containerId) {
    const provider = await getSearchProvider();
    const widget = createWidgetSearchBar({
      provider: { visual: createSearchProviderVisual(provider) },
      ariaLabel: 'Search bookmarks, tabs, history, and the web',
      onInput: (event, value) => {
        scheduleSearch(value);
      },
      onEscape: async (event, value, widgetEl) => {
        event.preventDefault();
        setSearchBarWidgetResults(widgetEl, []);
        applySearchBarWidgetState(widgetEl, 'unfocused-idle');
        const input = widgetEl.querySelector('.widget-search-bar__input');
        if (input) {
          input.blur();
        }
      }
    });

    const input = widget.querySelector('.widget-search-bar__input');
    let debounceTimer = null;
    let closeMenuTimer = null;
    let requestId = 0;
    let resultButtons = [];
    let selectedResultIndex = -1;

    const collectResultButtons = () => {
      resultButtons = Array.from(widget.querySelectorAll('.widget-search-bar-item, .widget-search-bar__fallback-result'));
      resultButtons.forEach((button, index) => {
        button.dataset.searchWidgetIndex = String(index);
        button.tabIndex = -1;
      });
      selectedResultIndex = resultButtons.length ? 0 : -1;
      syncSelectedResult();
    };

    const syncSelectedResult = () => {
      resultButtons.forEach((button, index) => {
        const isSelected = index === selectedResultIndex;
        button.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        if (typeof applySearchResultItemState === 'function' && button.classList.contains('widget-search-bar-item')) {
          applySearchResultItemState(button, isSelected ? 'focused' : 'idle');
        }
      });
    };

    const selectResult = (nextIndex) => {
      if (!resultButtons.length) {
        selectedResultIndex = -1;
        return;
      }

      if (nextIndex < 0) {
        nextIndex = resultButtons.length - 1;
      } else if (nextIndex >= resultButtons.length) {
        nextIndex = 0;
      }

      selectedResultIndex = nextIndex;
      syncSelectedResult();

      const selectedButton = resultButtons[selectedResultIndex];
      if (selectedButton && typeof selectedButton.scrollIntoView === 'function') {
        selectedButton.scrollIntoView({ block: 'nearest' });
      }
    };

    const clearSelection = () => {
      selectedResultIndex = -1;
      syncSelectedResult();
    };

    const executeSelectedResult = async () => {
      if (selectedResultIndex < 0 || selectedResultIndex >= resultButtons.length) {
        return false;
      }

      resultButtons[selectedResultIndex].click();
      return true;
    };

    const clearCloseTimer = () => {
      if (closeMenuTimer) {
        clearTimeout(closeMenuTimer);
        closeMenuTimer = null;
      }
    };

    const scheduleSearch = (query) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        performSearch(query);
      }, SEARCH_WIDGET_SEARCH_DEBOUNCE_MS);
    };

    const performSearch = async (query) => {
      const localRequestId = ++requestId;
      const normalizedQuery = (query || '').trim();
      const activeProvider = await getSearchProvider();
      updateSearchBarWidgetProvider(widget, { visual: createSearchProviderVisual(activeProvider) });

      const bridgeResults = await requestSearchResults(normalizedQuery);
      if (localRequestId !== requestId) return;

      const sections = buildSearchWidgetSections(normalizedQuery, bridgeResults, activeProvider);
      setSearchBarWidgetResults(widget, sections, {
        onResultClick: async (item, _widget, event) => {
          clearCloseTimer();
          clearSelection();
          await handleSearchWidgetResultClick(item, widget, containerId, event);
        }
      });

      collectResultButtons();

      applySearchBarWidgetState(
        widget,
        sections.length > 0
          ? 'results'
          : (document.activeElement === input ? 'focused-idle' : 'unfocused-idle')
      );
    };

    if (input) {
      input.addEventListener('focus', () => {
        clearCloseTimer();
        scheduleSearch(input.value || '');
      });

      input.addEventListener('keydown', async (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (!resultButtons.length) {
            scheduleSearch(input.value || '');
            return;
          }
          selectResult(selectedResultIndex + 1);
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (!resultButtons.length) {
            scheduleSearch(input.value || '');
            return;
          }
          selectResult(selectedResultIndex <= 0 ? resultButtons.length - 1 : selectedResultIndex - 1);
          return;
        }

        if (event.key === 'Enter' && selectedResultIndex >= 0) {
          event.preventDefault();
          await executeSelectedResult();
        }
      });

      input.addEventListener('blur', () => {
        clearCloseTimer();
        closeMenuTimer = setTimeout(() => {
          clearSelection();
          setSearchBarWidgetResults(widget, []);
          applySearchBarWidgetState(widget, 'unfocused-idle');
        }, 120);
      });
    }

    widget.addEventListener('mousedown', clearCloseTimer);
    widget.addEventListener('mousemove', (event) => {
      const button = event.target.closest('.widget-search-bar-item, .widget-search-bar__fallback-result');
      if (!button || !widget.contains(button)) return;
      const index = Number(button.dataset.searchWidgetIndex);
      if (!Number.isNaN(index) && index !== selectedResultIndex) {
        selectedResultIndex = index;
        syncSelectedResult();
      }
    });

    return widget;
  }

  function createSearchProviderBadge(label) {
    const badge = document.createElement('span');
    badge.className = 'widget-search-bar__provider-badge';
    badge.textContent = label;
    return badge;
  }

  function createSearchProviderVisual(provider) {
    const fallback = createSearchProviderFallbackVisual(provider);
    const assetSources = getSearchProviderAssetSources(provider);
    if (!assetSources.length) {
      return fallback;
    }

    const image = document.createElement('img');
    image.className = 'widget-search-bar__provider-image';
    image.alt = `${provider.name} logo`;

    let sourceIndex = 0;
    image.addEventListener('error', () => {
      sourceIndex += 1;
      if (sourceIndex < assetSources.length) {
        image.src = assetSources[sourceIndex];
        return;
      }
      image.replaceWith(fallback);
    });

    image.src = assetSources[sourceIndex];
    return image;
  }

  function createSearchProviderFallbackVisual(provider) {
    if (provider && provider.materialIcon) {
      const icon = document.createElement('span');
      icon.className = 'widget-search-bar__provider-visual material-symbols-outlined';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = provider.materialIcon;
      return icon;
    }

    return createSearchProviderBadge(provider?.shortLabel || '?');
  }

  function getSearchProviderAssetSources(provider) {
    if (!provider || !Array.isArray(provider.assetNames) || provider.assetNames.length === 0 || typeof chrome === 'undefined' || !chrome.runtime?.getURL) {
      return [];
    }

    return provider.assetNames.flatMap((assetName) => {
      const basePath = `assets/icons/search-providers/${assetName}`;
      return [
        chrome.runtime.getURL(`${basePath}.svg`),
        chrome.runtime.getURL(`${basePath}.png`)
      ];
    });
  }

  async function getSearchProvider() {
    const providerId = await Storage.get(SEARCH_PROVIDER_KEY);
    if (providerId === 'custom') {
      const customTemplate = await Storage.get(SEARCH_CUSTOM_TEMPLATE_KEY);
      return {
        ...SEARCH_PROVIDER_REGISTRY.custom,
        template: isValidCustomSearchTemplate(customTemplate)
          ? customTemplate.trim()
          : SEARCH_PROVIDER_REGISTRY.custom.template
      };
    }

    return SEARCH_PROVIDER_REGISTRY[providerId] || SEARCH_PROVIDER_REGISTRY.google;
  }

  function isValidCustomSearchTemplate(template) {
    if (typeof template !== 'string') return false;
    const normalized = template.trim();
    if (!normalized || !normalized.includes('{query}')) return false;
    try {
      const previewUrl = normalized.replace('{query}', 'example');
      const parsed = new URL(previewUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  async function requestSearchResults(query) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'SEARCH', query }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          resolve({});
          return;
        }
        resolve(response.results || {});
      });
    });
  }

  function buildSearchWidgetSections(query, results, provider) {
    const sections = [];

    if (query) {
      sections.push({
        title: 'Search the web',
        items: [
          {
            id: 'search-web',
            title: `Search "${query}"`,
            meta: `${provider.name} search`,
            leading: createSearchProviderVisual(provider),
            state: 'focused',
            resultType: 'web-search',
            query
          }
        ]
      });
    }

    const localActions = buildSearchWidgetActionItems();
    const bridgeActions = mapSearchBridgeItems(results.Actions || [], 'Actions');
    const actions = [...localActions, ...bridgeActions];
    if (actions.length) {
      sections.push({ title: 'Actions', items: actions });
    }

    const categoryOrder = ['Bookmarks', 'Tags', 'History', 'Tabs', 'Chrome Settings'];
    categoryOrder.forEach((category) => {
      const items = mapSearchBridgeItems(results[category] || [], category);
      if (items.length) {
        sections.push({ title: category, items });
      }
    });

    return sections;
  }

  function buildSearchWidgetActionItems() {
    return [
      {
        id: 'save-session',
        title: 'Save journey',
        details: 'Save all tabs in this window as bookmarks',
        meta: 'Action',
        leading: 'save',
        resultType: 'action',
        actionId: 'save-session'
      }
    ];
  }

  function mapSearchBridgeItems(items, category) {
    return items.map((item) => ({
      id: item.id,
      title: item.title || item.url || 'Untitled',
      details: item.description || '',
      meta: formatSearchBridgeMeta(item, category),
      leading: createSearchBridgeLeading(item),
      resultType: item.type,
      metadata: item.metadata || {},
      url: item.url,
      tabId: item.tabId
    }));
  }

  function formatSearchBridgeMeta(item, category) {
    if (category === 'Tabs') return 'Open tab';
    if (category === 'Bookmarks') return 'Bookmark';
    if (category === 'History') return 'History';
    if (category === 'Chrome Settings') return 'Chrome settings';
    if (category === 'Tags') return 'Tagged bookmark';
    return category;
  }

  function createSearchBridgeLeading(item) {
    if (item.type === 'bookmark' && item.url && typeof FaviconService !== 'undefined') {
      return FaviconService.createFaviconElement(item.url, {
        size: 24,
        className: 'widget-search-bar-item__image',
        alt: ''
      });
    }

    const iconMap = {
      tab: 'tab',
      history: 'history',
      'chrome-settings': 'settings',
      action: 'bolt',
      bookmark: 'book',
      download: 'download',
      extension: 'extension'
    };

    return iconMap[item.type] || 'language';
  }

  async function handleSearchWidgetResultClick(item, widget, _containerId, event = null) {
    if (item.resultType === 'web-search') {
      await executeWebSearch(item.query, { newTab: false });
      return;
    }

    if (item.resultType === 'action' && item.actionId === 'save-session') {
      setSearchBarWidgetResults(widget, []);
      applySearchBarWidgetState(widget, 'unfocused-idle');
      await handleSaveSession();
      return;
    }

    if (item.resultType === 'tab' && item.tabId) {
      await chrome.tabs.update(item.tabId, { active: true });
      const tab = await chrome.tabs.get(item.tabId);
      await chrome.windows.update(tab.windowId, { focused: true });
      return;
    }

    if (item.url) {
      await openLinkByPreference(item.url, event);
    }
  }

  async function executeWebSearch(query, options = {}) {
    const normalizedQuery = (query || '').trim();
    if (!normalizedQuery) return;

    const { newTab = false } = options;
    const provider = await getSearchProvider();
    const url = provider.template.replace('{query}', encodeURIComponent(normalizedQuery));

    if (newTab) {
      await chrome.tabs.create({ url });
      return;
    }

    try {
      const currentTab = await chrome.tabs.getCurrent();
      if (currentTab && currentTab.id) {
        await chrome.tabs.update(currentTab.id, { url });
        return;
      }
    } catch (error) {
      console.warn('Search widget could not update current tab, opening new tab instead.', error);
    }

    await chrome.tabs.create({ url });
  }

  async function handleSaveSession() {
    try {
      const currentWindow = await chrome.windows.getCurrent({ populate: true });
      const currentUrl = chrome.runtime.getURL('core/main.html');
      const tabs = (currentWindow?.tabs || [])
        .filter((tab) => tab.url && !tab.url.includes(currentUrl))
        .map((tab) => ({
          id: tab.id,
          title: tab.title || tab.url,
          url: tab.url
        }));

      if (!tabs.length) {
        await Modal.openNotice({
          title: 'No Tabs to Save',
          message: 'No tabs to save in this window.'
        });
        return;
      }

      if (typeof SaveTabsModal === 'undefined') {
        await Modal.openError({
          title: 'Modal unavailable',
          message: 'Save journey dialog-modal is unavailable.'
        });
        return;
      }

      await SaveTabsModal.show(tabs);
    } catch (error) {
      console.error('Search widget save session failed:', error);
      await Modal.openError({
        title: 'Save Failed',
        message: 'Failed to save this journey.'
      });
    }
  }

  function getBookmarkSubtext(url) {
    try {
      if (!url) return 'No URL';
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return 'Invalid URL';
    }
  }

  async function normalizeBookmarkSlots(options = {}) {
    const { compact = false } = options;
    let slots = await SlotSystem.getSlots(BOOKMARK_WIDGETS_KEY);
    if (!Array.isArray(slots) || slots.length === 0) {
      slots = new Array(BOOKMARK_ROW_SIZE).fill(null);
      await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
      return slots;
    }

    if (slots.length < BOOKMARK_ROW_SIZE) {
      slots = slots.concat(new Array(BOOKMARK_ROW_SIZE - slots.length).fill(null));
      await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
      return slots;
    }

    const remainder = slots.length % BOOKMARK_ROW_SIZE;
    if (remainder !== 0) {
      slots = slots.concat(new Array(BOOKMARK_ROW_SIZE - remainder).fill(null));
      await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
    }

    if (compact) {
      const lastFilledIndex = slots.reduce((lastIndex, slot, index) => (slot ? index : lastIndex), -1);
      const targetLength = Math.max(
        BOOKMARK_ROW_SIZE,
        lastFilledIndex < 0 ? BOOKMARK_ROW_SIZE : Math.ceil((lastFilledIndex + 1) / BOOKMARK_ROW_SIZE) * BOOKMARK_ROW_SIZE
      );

      if (slots.length !== targetLength) {
        slots = slots.slice(0, targetLength);
        await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
      }
    }

    return slots;
  }

  async function setBookmarkSlot(index, item) {
    const slots = await normalizeBookmarkSlots();
    if (index < 0) return;
    if (index >= slots.length) {
      const needed = index - slots.length + 1;
      slots.push(...new Array(needed).fill(null));
    }
    slots[index] = item;
    await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
    await normalizeBookmarkSlots({ compact: true });
  }

  async function swapBookmarkSlots(a, b) {
    if (a === b) return;
    const slots = await normalizeBookmarkSlots();
    const max = Math.max(a, b);
    if (max >= slots.length) return;
    const tmp = slots[a];
    slots[a] = slots[b];
    slots[b] = tmp;
    await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
    await normalizeBookmarkSlots({ compact: true });
  }

  async function addBookmarkToWidgetSection(bookmark) {
    const slots = await normalizeBookmarkSlots();
    let index = slots.findIndex((slot) => !slot);

    if (index < 0) {
      const expanded = slots.concat(new Array(BOOKMARK_ROW_SIZE).fill(null));
      await SlotSystem.save(BOOKMARK_WIDGETS_KEY, expanded);
      index = slots.length;
    }

    await setBookmarkSlot(index, bookmark);
  }

  async function swapSlots(a,b){
    if (a===b) return;
    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    const max = Math.max(a,b);
    if (max >= slots.length) return;
    const tmp = slots[a];
    slots[a] = slots[b];
    slots[b] = tmp;
    await SlotSystem.save(STORAGE_KEY, slots);
  }

  async function addWidgetToFirstEmpty(pick){
    const normalizedPick = normalizeStandardWidgetRecord(pick);
    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    if (isSearchWidgetRecord(normalizedPick) && slots.some(isSearchWidgetRecord)) {
      return false;
    }
    const idx = slots.findIndex(s=>!s);
    if (idx < 0) return false;
    await SlotSystem.setSlot(STORAGE_KEY, idx, normalizedPick);
    return true;
  }

  return { render, addWidgetToFirstEmpty };
})();
