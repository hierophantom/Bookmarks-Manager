// Global lazyObserver for folder lazy loading
let lazyObserver = null;

function setupLazyObserver(root) {
  if (typeof IntersectionObserver === 'undefined') {
    lazyObserver = null;
    return;
  }
  lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const section = entry.target;
      const renderItems = section && section._renderFolderItems;
      if (typeof renderItems === 'function') {
        renderItems();
      }
      if (lazyObserver) {
        lazyObserver.unobserve(section);
      }
    });
  }, { root: document.querySelector('.bookmarks-sections'), rootMargin: '600px 0px', threshold: 0.01 });
  if (root) {
    root._lazyObserver = lazyObserver;
  }
}
document.addEventListener('DOMContentLoaded', async () => {
  // Ensure main content is focused so keyboard shortcuts work immediately on new tab
  // Try to focus a hidden input to force focus out of the URL bar
  const focusHack = document.getElementById('bmg-focus-hack');
  if (focusHack) {
    focusHack.focus();
    // Remove focus from the hack input after a short delay
    setTimeout(() => {
      focusHack.blur();
      // Optionally focus main content for keyboard shortcuts
      const mainContent = document.getElementById('bmg-main-content');
      if (mainContent) {
        mainContent.setAttribute('tabindex', '-1');
        mainContent.focus();
      }
    }, 100);
  } else {
    // fallback for legacy: focus body
    if (document.body) {
      document.body.setAttribute('tabindex', '-1');
      document.body.focus();
    }
  }

  // Check new tab override setting
  const newTabEnabled = await Storage.get('newTabOverrideEnabled');
  
  // Show "Make Default" banner if user has disabled new tab override
  const makeDefaultBanner = document.getElementById('make-default-banner');
  const makeDefaultBtn = document.getElementById('make-default-btn');
  
  if (newTabEnabled === false) {
    // Show the banner to prompt re-enabling
    if (makeDefaultBanner) {
      makeDefaultBanner.style.display = 'block';
    }
  }
  
  // Handle "Make Default" button click
  if (makeDefaultBtn) {
    makeDefaultBtn.addEventListener('click', async () => {
      await Storage.set({ newTabOverrideEnabled: true });
      
      // Hide banner and show success message
      if (makeDefaultBanner) {
        makeDefaultBanner.innerHTML = `
          <div style="font-size: 18px; font-weight: bold; color: white;">✓ Success! This is now your default new tab page</div>
          <div style="font-size: 14px; margin-top: 8px; opacity: 0.95;">Open a new tab to see it in action</div>
        `;
        setTimeout(() => {
          makeDefaultBanner.style.display = 'none';
        }, 3000);
      }
    });
  }

  // Apply topbar backdrop setting
  const topbarBackdropEnabled = await Storage.get('topbarBackdropEnabled');
  const topbar = document.querySelector('.topbar');
  if (topbar && topbarBackdropEnabled === false) {
    topbar.classList.add('topbar--no-backdrop');
  }

  // Daily Quote initialization
  const quoteContainer = document.getElementById('header-inspiration');
  const quoteText = document.getElementById('header-quote-text');
  const quoteAuthor = document.getElementById('header-quote-author');

  async function loadQuote() {
    const enabled = await DailyQuoteService.isEnabled();
    if (!enabled) {
      if (quoteContainer) quoteContainer.style.display = 'none';
      return;
    }

    try {
      const quote = await DailyQuoteService.getQuote();
      if (quoteText) {
        const fullQuote = `"${quote.text}"`;
        quoteText.textContent = fullQuote;
        if (typeof createTooltip === 'function') {
          const quoteTooltip = createTooltip({
            text: fullQuote,
            target: quoteText,
            position: 'bottom',
            delay: 'fast'
          });
          if (quoteTooltip && quoteTooltip.element) {
            quoteTooltip.element.classList.add('tooltip--quote');
          }
        } else {
          quoteText.setAttribute('title', fullQuote);
        }
      }
      if (quoteAuthor) {
        const authorName = quote.author;
        const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(authorName.replace(/ /g, '_'))}`;
        quoteAuthor.textContent = authorName;
        quoteAuthor.href = wikipediaUrl;
        quoteAuthor.style.cursor = 'pointer';
        quoteAuthor.addEventListener('mouseenter', () => {
          quoteAuthor.style.textDecoration = 'underline';
        });
        quoteAuthor.addEventListener('mouseleave', () => {
          quoteAuthor.style.textDecoration = 'none';
        });
      }
      if (quoteContainer) quoteContainer.style.display = 'flex';
    } catch (error) {
      console.error('Failed to load quote:', error);
      if (quoteContainer) quoteContainer.style.display = 'none';
    }
  }

  // Load quote on page load
  loadQuote();

  const root = document.getElementById('bookmarks-root');
  const openSearch = document.getElementById('open-search');
  const addWidgetBtn = document.getElementById('add-widget-btn');
  const bookmarksActionsLeft = document.getElementById('bookmarks-actions-left');
  const bookmarksActionsRight = document.getElementById('bookmarks-actions-right');
  const bookmarksActionsSettings = document.getElementById('bookmarks-actions-settings');
  const bookmarksFloatingLeft = document.getElementById('bookmarks-floating-left');
  const bookmarksFloatingRight = document.getElementById('bookmarks-floating-right');

  let textSearchInput = null;
  let currentFilterTags = [];
  let currentSort = 'none';
  let availableTags = [];
  let currentFolderFilter = null; // Track which folder is being viewed
  const BOOKMARKS_SORT_STORAGE_KEY = 'bookmarksSortChoice';

  function createMaterialIcon(name) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = name;
    return icon;
  }

  function createFaviconIcon(url) {
    return FaviconService.createFaviconElement(url, {
      size: 24,
      className: 'bookmark-favicon bookmarks-gallery-view__favicon',
      alt: ''
    });
  }

  function setupSelectionFieldMenu(field, buildMenu, onClose) {
    if (!field) return;
    let open = false;
    let menuWrapper = null;

    function closeMenu() {
      open = false;
      if (menuWrapper) {
        menuWrapper.remove();
        menuWrapper = null;
      }
      if (typeof onClose === 'function') {
        onClose();
      }
      applySelectionFieldState(field, currentFilterTags && currentFilterTags.length > 0 ? 'selection' : 'idle');
    }

    function openMenu() {
      // Close any other open selection field menus
      document.querySelectorAll('.selection-field--active').forEach(otherField => {
        if (otherField !== field) {
          // Trigger click on other field to close it
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
          });
          otherField.dispatchEvent(clickEvent);
        }
      });

      // Close View Settings menu if open
      const openSettingsMenu = document.querySelector('[data-menu-type="view-settings"]');
      if (openSettingsMenu) {
        openSettingsMenu.remove();
      }

      if (menuWrapper) {
        menuWrapper.remove();
      }
      const menu = buildMenu();
      menuWrapper = document.createElement('div');
      menuWrapper.className = 'selection-field__menu';
      menuWrapper.appendChild(menu);
      field.appendChild(menuWrapper);
      applySelectionFieldState(field, 'active');
      open = true;
    }

    field.addEventListener('click', (event) => {
      event.stopPropagation();
      if (open) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener('click', () => {
      if (open) closeMenu();
    });
  }

  async function initBookmarksActions() {
    if (!bookmarksActionsLeft || !bookmarksActionsRight || !bookmarksActionsSettings) return;

    const searchComp = createSearchComp({
      placeholder: 'Search bookmarks...',
      contrast: 'low',
      shortcutKeys: ['⌘', 'F'],
      onInput: () => {
        render(true);
      }
    });
    searchComp.style.width = '200px';
    textSearchInput = searchComp.querySelector('.search-comp__input');
    bookmarksActionsLeft.appendChild(searchComp);

    const tagField = createSelectionField({
      label: 'Filter by tag',
      contrast: 'low',
      state: 'idle',
      onClear: () => {
        currentFilterTags = [];
        updateTagFieldLabel();
        render(true);
      }
    });

    const sortSections = [
      { title: 'Sort view', items: ['Default'] },
      { title: 'Sort Folders', items: ['Folders: A-Z', 'Folders: Z-A', 'Folders: Last Added', 'Folders: First Added'] },
      { title: 'Sort Bookmarks', items: ['Bookmarks: A-Z', 'Bookmarks: Z-A', 'Bookmarks: Last Added', 'Bookmarks: First Added'] }
    ];
    const sortValues = [
      { label: 'Default', value: 'none' },
      { label: 'Folders: A-Z', value: 'folders-az' },
      { label: 'Folders: Z-A', value: 'folders-za' },
      { label: 'Folders: Last Added', value: 'folders-newest' },
      { label: 'Folders: First Added', value: 'folders-oldest' },
      { label: 'Bookmarks: A-Z', value: 'bookmarks-az' },
      { label: 'Bookmarks: Z-A', value: 'bookmarks-za' },
      { label: 'Bookmarks: Last Added', value: 'bookmarks-newest' },
      { label: 'Bookmarks: First Added', value: 'bookmarks-oldest' }
    ];

    function normalizeSortChoice(value) {
      return sortValues.some((option) => option.value === value) ? value : 'none';
    }

    async function persistSortChoice(value) {
      await Storage.set({ [BOOKMARKS_SORT_STORAGE_KEY]: normalizeSortChoice(value) });
    }

    try {
      currentSort = normalizeSortChoice(await Storage.get(BOOKMARKS_SORT_STORAGE_KEY));
    } catch (e) {
      console.warn('Failed to restore bookmarks sort choice, defaulting to none', e);
      currentSort = 'none';
    }

    function getSortIndex() {
      const index = sortValues.findIndex(option => option.value === currentSort);
      return index === -1 ? 0 : index;
    }

    function updateSortFieldLabel() {
      const selected = sortValues.find(option => option.value === currentSort) || sortValues[0];
      updateSelectionFieldLabel(sortField, `Sort by: ${selected.label}`);
      const hasSelection = currentSort !== 'none';
      updateSelectionFieldSelectionState(sortField, hasSelection);
      applySelectionFieldState(sortField, hasSelection ? 'selection' : 'idle');
    }

    const sortField = createSelectionField({
      label: 'Sort by: Default',
      contrast: 'low',
      state: 'idle',
      onClear: async () => {
        currentSort = 'none';
        await persistSortChoice(currentSort);
        updateSortFieldLabel();
        render(true);
      }
    });
    updateSortFieldLabel();

    const viewField = createSelectionField({
      label: 'View as: Gallery',
      contrast: 'low',
      state: 'idle'
    });
    viewField.style.width = '136px';
    viewField.style.display = 'none';

    bookmarksActionsLeft.appendChild(tagField);
    bookmarksActionsLeft.appendChild(sortField);
    bookmarksActionsLeft.appendChild(viewField);

    function updateTagFieldLabel() {
      if (!tagField) return;
      const label = currentFilterTags.length > 0
        ? `${currentFilterTags.length} tags selected`
        : 'Filter by tag';
      updateSelectionFieldLabel(tagField, label);
      const hasSelection = currentFilterTags.length > 0;
      updateSelectionFieldSelectionState(tagField, hasSelection);
      applySelectionFieldState(tagField, hasSelection ? 'selection' : 'idle');
    }

    updateTagFieldLabel();

    setupSelectionFieldMenu(tagField, () => {
      const items = availableTags.map(tag => `#${tag}`);
      const selectedIndices = availableTags
        .map((tag, index) => (currentFilterTags.includes(tag) ? index : -1))
        .filter(index => index !== -1);

      return createSelectionMenu({
        type: 'tag',
        contrast: 'low',
        items,
        selectedIndices,
        onSelect: (index) => {
          const tag = availableTags[index];
          if (!tag) return;
          if (currentFilterTags.includes(tag)) {
            currentFilterTags = currentFilterTags.filter(item => item !== tag);
          } else {
            currentFilterTags = [...currentFilterTags, tag];
          }
          updateTagFieldLabel();
          render(true);
        },
        onClear: () => {
          currentFilterTags = [];
          updateTagFieldLabel();
          render(true);
        },
        onSelectAll: () => {
          currentFilterTags = [...availableTags];
          updateTagFieldLabel();
          render(true);
        }
      });
    }, () => {
      updateTagFieldLabel();
    });

    setupSelectionFieldMenu(sortField, () => {
      return createSelectionMenu({
        type: 'sort',
        contrast: 'low',
        sections: sortSections,
        selectedIndex: getSortIndex(),
        onSelect: async (index) => {
          const selection = sortValues[index];
          currentSort = normalizeSortChoice(selection ? selection.value : 'none');
          await persistSortChoice(currentSort);
          updateSortFieldLabel();
          render(true);
        }
      });
    }, () => {
      updateSortFieldLabel();
    });

    const settingsButton = createActionButton({
      icon: createMaterialIcon('brightness_5'),
      label: 'Settings',
      tooltip: 'View Settings',
      onClick: async () => {
        // Create settings menu
        const hideNestedFolders = await Storage.get('hideNestedFolders') || false;
        
        const menu = createSelectionMenu({
          type: 'simple',
          contrast: 'low',
          title: 'View Settings',
          items: ['Hide nested folders'],
          selectedIndices: hideNestedFolders ? [0] : [],
          showClear: false,
          showSelectAll: false,
          onSelect: async (index) => {
            if (index === 0) {
              // Toggle the setting
              const currentValue = await Storage.get('hideNestedFolders') || false;
              await Storage.set({ hideNestedFolders: !currentValue });
              menu.remove();
              document.removeEventListener('click', closeMenu);
              await render(true);
            }
          }
        });

        // Mark this as view settings menu
        menu.setAttribute('data-menu-type', 'view-settings');

        // Close any open selection fields
        document.querySelectorAll('.selection-field--active').forEach(field => {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
          });
          field.dispatchEvent(clickEvent);
        });

        // Position menu relative to button
        menu.style.position = 'absolute';
        menu.style.zIndex = '1000';
        const rect = settingsButton.getBoundingClientRect();
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = rect.left + 'px';

        document.body.appendChild(menu);

        // Close on outside click
        const closeMenu = (e) => {
          if (!menu.contains(e.target) && e.target !== settingsButton) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
          }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
      }
    });
    bookmarksActionsSettings.appendChild(settingsButton);

    const addFolderButton = createCommonButton({
      label: 'Add folder',
      icon: createMaterialIcon('folder'),
      contrast: 'low',
      onClick: async () => {
        const data = await Modal.openFolderForm({ title: '' });
        if (!data) return;
        const newFolder = await BookmarksService.createFolder('1', data.title);
        if (data.customization && typeof FolderCustomizationService !== 'undefined') {
          await FolderCustomizationService.set(newFolder.id, data.customization);
        }
        await render(true);
      }
    });

    const addBookmarkButton = createPrimaryButton({
      label: 'Add bookmark',
      icon: createMaterialIcon('bookmark'),
      contrast: 'low',
      onClick: async () => {
        await BookmarkModals.addBookmarkGlobal();
        await render(true);
      }
    });

    bookmarksActionsRight.appendChild(addFolderButton);
    bookmarksActionsRight.appendChild(addBookmarkButton);

    // Detect platform for keyboard shortcuts
    const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
    const modifierKey = isMac ? 'Cmd' : 'Ctrl';

    if (bookmarksFloatingLeft) {
      const floatingLeft = createActionButton({
        icon: createMaterialIcon('folder'),
        label: 'Folders',
        onClick: () => {
          // Use new panel component if available, fallback to old UI
          if (window.folderTreeViewPanel) {
            if (window.folderTreeViewPanel.isVisible()) {
              // Clear folder filter when closing panel
              if (typeof window.clearFolderFilter === 'function') {
                window.clearFolderFilter();
              }
              window.folderTreeViewPanel.hide();
              floatingLeft.style.display = '';
            } else {
              window.folderTreeViewPanel.show();
              floatingLeft.style.display = 'none';
            }
          } else if (typeof LeftPanelUI !== 'undefined') {
            LeftPanelUI.handlePanelToggle();
          }
        }
      });
      window.folderTreeViewTriggerButton = floatingLeft;
      bookmarksFloatingLeft.appendChild(floatingLeft);

      // Add tooltip
      if (typeof createTooltip !== 'undefined') {
        createTooltip({
          text: `Folders\n${modifierKey}+Shift+F`,
          target: floatingLeft,
          position: 'bottom',
          delay: 'fast'
        });
      }
    }

    if (bookmarksFloatingRight) {
      const floatingRight = createActionButton({
        icon: createMaterialIcon('tab'),
        label: 'Tabs',
        onClick: () => {
          // Use new panel component if available, fallback to old UI
          if (window.activeSessionsPanel) {
            if (window.activeSessionsPanel.isVisible()) {
              window.activeSessionsPanel.hide();
              floatingRight.style.display = '';
            } else {
              window.activeSessionsPanel.show();
              floatingRight.style.display = 'none';
            }
          } else if (typeof RightPanelUI !== 'undefined') {
            RightPanelUI.handlePanelToggle();
          }
        }
      });
      window.activeSessionsTriggerButton = floatingRight;
      bookmarksFloatingRight.appendChild(floatingRight);

      // Add tooltip
      if (typeof createTooltip !== 'undefined') {
        createTooltip({
          text: `Active Tabs\n${modifierKey}+Shift+V`,
          target: floatingRight,
          position: 'bottom',
          delay: 'fast'
        });
      }
    }

    if (typeof TagsService !== 'undefined') {
      TagsService.getAllTags().then((tags) => {
        availableTags = tags;
        updateTagFieldLabel();
      }).catch(() => {});
    }
  }

  // Page navigation setup
  const pageContainer = document.getElementById('page-container');
  const pages = Array.from(document.querySelectorAll('.page'));
  const navButtons = Array.from(document.querySelectorAll('.c-nav__btn'));
  let activePageIndex = 0;
  let lastPageIndex = 0;

  function isBookmarksPageActive() {
    return activePageIndex === 1;
  }

  function syncBookmarksSidePanelScope() {
    const inBookmarksPage = isBookmarksPageActive();

    const leftPanel = window.folderTreeViewPanel;
    if (leftPanel?.element) {
      leftPanel.element.style.display = inBookmarksPage ? '' : 'none';
    }

    const rightPanel = window.activeSessionsPanel;
    if (rightPanel?.element) {
      rightPanel.element.style.display = inBookmarksPage ? '' : 'none';
    }

    if (window.folderTreeViewTriggerButton) {
      window.folderTreeViewTriggerButton.style.display = inBookmarksPage && !leftPanel?.isVisible()
        ? ''
        : 'none';
    }

    if (window.activeSessionsTriggerButton) {
      window.activeSessionsTriggerButton.style.display = inBookmarksPage && !rightPanel?.isVisible()
        ? ''
        : 'none';
    }
  }

  window.isBookmarksPageActive = isBookmarksPageActive;
  window.syncBookmarksSidePanelScope = syncBookmarksSidePanelScope;

  function updatePageVisibility() {
    pages.forEach((page, idx) => {
      const isActive = idx === activePageIndex;
      page.classList.toggle('active', isActive);
      if (isActive) {
        page.style.display = 'block';
        if (pageContainer && page.parentNode !== pageContainer) {
          pageContainer.appendChild(page);
        }
      } else {
        page.style.display = 'none';
        if (page.parentNode === pageContainer) {
          pageContainer.removeChild(page);
        }
      }
    });
    navButtons.forEach(btn => {
      const target = Number(btn.dataset.target);
      if (Number.isInteger(target)) {
        btn.classList.toggle('active', target === activePageIndex);
      }
    });
    syncBookmarksSidePanelScope();
  }

  async function setActivePage(index, { persist = true } = {}) {
    if (!pages.length) return;
    const normalized = (index + pages.length) % pages.length;
    const direction = normalized === activePageIndex ? null : (normalized > activePageIndex ? 'right' : 'left');
    lastPageIndex = activePageIndex;
    activePageIndex = normalized;
    updatePageVisibility();
    if (activePageIndex === 0 && typeof WidgetsService !== 'undefined') {
      try {
        await WidgetsService.render('widgets-container');
      } catch (e) {
        console.warn('Widgets render failed', e);
      }
    }
    if (activePageIndex === 2 && window.JourneyPage && typeof window.JourneyPage.activate === 'function') {
      try {
        await window.JourneyPage.activate();
      } catch (e) {
        console.warn('Journey page activate failed', e);
      }
    }
    if (pageContainer && direction) {
      pageContainer.classList.remove('slide-left', 'slide-right');
      void pageContainer.offsetWidth; // reflow to restart animation
      pageContainer.classList.add(direction === 'right' ? 'slide-right' : 'slide-left');
    }
    if (persist) {
      await Storage.set({ activePageIndex: normalized });
    }
  }

  // Init page from storage
  try {
    const savedPage = await Storage.get('activePageIndex');
    await setActivePage(Number.isInteger(savedPage) ? savedPage : 0, { persist: false });
  } catch (e) {
    console.warn('Failed to restore page, defaulting to 0', e);
    await setActivePage(0, { persist: false });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = Number(btn.dataset.target);
      if (Number.isInteger(target)) setActivePage(target);
    });
  });

  await initBookmarksActions();

  // Add keyboard shortcut tooltips to navigation buttons
  const shortcuts = ['H', 'B', 'J'];
  if (typeof createTooltip === 'function') {
    navButtons.forEach((btn, index) => {
      if (index < shortcuts.length) {
        const shortcut = shortcuts[index];
        createTooltip({
          text: `Keyboard shortcut: ${shortcut}`,
          target: btn,
          position: 'top',
          delay: 'fast'
        });
      }
    });
  }

  // Keyboard shortcuts and navigation
  window.addEventListener('keydown', (e) => {
    // Folder panel toggle: Cmd+Shift+F (Mac) or Ctrl+Shift+F (Windows/Linux)
    const isLeftPanelShortcut = (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey
      && (e.key === 'f' || e.key === 'F');
    if (isLeftPanelShortcut) {
      e.preventDefault();
      if (!isBookmarksPageActive()) return;
      if (window.folderTreeViewPanel) {
        if (window.folderTreeViewPanel.isVisible()) {
          // Clear folder filter when closing panel
          if (typeof window.clearFolderFilter === 'function') {
            window.clearFolderFilter();
          }
          window.folderTreeViewPanel.hide();
          if (window.folderTreeViewTriggerButton) window.folderTreeViewTriggerButton.style.display = '';
        } else {
          window.folderTreeViewPanel.show();
          if (window.folderTreeViewTriggerButton) window.folderTreeViewTriggerButton.style.display = 'none';
        }
      }
      return;
    }

    // Active sessions panel toggle: Cmd+Shift+V (Mac) or Ctrl+Shift+V (Windows/Linux)
    const isRightPanelShortcut = (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey
      && (e.key === 'v' || e.key === 'V');
    if (isRightPanelShortcut) {
      e.preventDefault();
      if (!isBookmarksPageActive()) return;
      if (window.activeSessionsPanel) {
        if (window.activeSessionsPanel.isVisible()) {
          window.activeSessionsPanel.hide();
          if (window.activeSessionsTriggerButton) window.activeSessionsTriggerButton.style.display = '';
        } else {
          window.activeSessionsPanel.show();
          if (window.activeSessionsTriggerButton) window.activeSessionsTriggerButton.style.display = 'none';
        }
      }
      return;
    }

    // Find shortcut: Cmd+F (Mac) or Ctrl+F (Windows/Linux)
    const isFindShortcut = (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey
      && (e.key === 'f' || e.key === 'F');
    if (isFindShortcut) {
      e.preventDefault();
      const searchInput = document.querySelector('.search-comp__input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    const target = e.target;
    const tag = target && target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable)) return;

    if (e.key === 'ArrowLeft') setActivePage(activePageIndex - 1);
    if (e.key === 'ArrowRight') setActivePage(activePageIndex + 1);
    if (e.key === 'h' || e.key === 'H') setActivePage(0);
    if (e.key === 'b' || e.key === 'B') setActivePage(1);
    if (e.key === 'j' || e.key === 'J') setActivePage(2);
  });

  // Magic mouse horizontal swipe navigation (fast, single-step lock)
  let wheelLockedUntil = 0;
  const WHEEL_THRESHOLD = 50;
  const WHEEL_LOCK_MS = 520;
  window.addEventListener('wheel', (e) => {
    const now = Date.now();
    if (now < wheelLockedUntil) return;
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > WHEEL_THRESHOLD;
    if (!horizontal) return;

    const dir = e.deltaX > 0 ? 1 : -1;
    wheelLockedUntil = now + WHEEL_LOCK_MS;
    setActivePage(activePageIndex + dir);
  }, { passive: true });

  // Sorting state
  currentSort = currentSort || 'none';

  // Sorting helper functions
  function sortFolders(folders) {
    if (!currentSort.startsWith('folders-')) return folders;
    
    const sorted = [...folders];
    const bookmarksBarIndex = sorted.findIndex(f => f.id === '1');
    let bookmarksBar = null;
    if (bookmarksBarIndex !== -1) {
      bookmarksBar = sorted.splice(bookmarksBarIndex, 1)[0];
    }

    if (currentSort === 'folders-az') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (currentSort === 'folders-za') {
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    } else if (currentSort === 'folders-newest') {
      sorted.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    } else if (currentSort === 'folders-oldest') {
      sorted.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
    }

    if (bookmarksBar) {
      sorted.unshift(bookmarksBar);
    }
    return sorted;
  }

  function sortBookmarks(bookmarks) {
    if (!currentSort.startsWith('bookmarks-')) return bookmarks;
    
    const sorted = [...bookmarks];
    if (currentSort === 'bookmarks-az') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (currentSort === 'bookmarks-za') {
      sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    } else if (currentSort === 'bookmarks-newest') {
      sorted.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    } else if (currentSort === 'bookmarks-oldest') {
      sorted.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
    }
    return sorted;
  }

  function sortFolderSectionChildren(children) {
    if (!Array.isArray(children)) return [];
    if (currentSort === 'none') return [...children];

    const sorted = [...children];
    const sortByTitleAsc = (a, b) => (a.title || '').localeCompare(b.title || '');
    const sortByTitleDesc = (a, b) => (b.title || '').localeCompare(a.title || '');
    const sortByNewest = (a, b) => (b.dateAdded || 0) - (a.dateAdded || 0);
    const sortByOldest = (a, b) => (a.dateAdded || 0) - (b.dateAdded || 0);

    if (currentSort.endsWith('-az')) {
      sorted.sort(sortByTitleAsc);
    } else if (currentSort.endsWith('-za')) {
      sorted.sort(sortByTitleDesc);
    } else if (currentSort.endsWith('-newest')) {
      sorted.sort(sortByNewest);
    } else if (currentSort.endsWith('-oldest')) {
      sorted.sort(sortByOldest);
    }

    return sorted;
  }

  // Tag filtering state handled by selection field menu

  // Render version to avoid stale async writes
  let renderVersion = 0;

  // Perf instrumentation (opt-in via window.__bmgPerf)
  let renderCallCount = 0;

  // Text search is handled by search component listeners

  async function render(preserveScroll = false) {
    const thisRender = ++renderVersion;
    renderCallCount += 1;
    const perfEnabled = typeof window !== 'undefined' && window.__bmgPerf;
    const perfStart = perfEnabled ? performance.now() : 0;
    const perf = {
      treeFetchMs: 0,
      tilesRendered: 0,
      sectionsRendered: 0
    };
    const sectionsContainer = document.querySelector('.bookmarks-sections');
    let scrollAnchor = null;

    if (preserveScroll && sectionsContainer) {
      const containerRect = sectionsContainer.getBoundingClientRect();
      const candidates = sectionsContainer.querySelectorAll('.bookmarks-gallery-view[data-id], .folder-section[data-folder-id]');
      for (const candidate of candidates) {
        const rect = candidate.getBoundingClientRect();
        if (rect.bottom <= containerRect.top || rect.top >= containerRect.bottom) {
          continue;
        }

        if (candidate.classList.contains('bookmarks-gallery-view')) {
          scrollAnchor = {
            kind: 'tile',
            id: candidate.dataset.id,
            offset: rect.top - containerRect.top
          };
        } else if (candidate.classList.contains('folder-section')) {
          scrollAnchor = {
            kind: 'section',
            id: candidate.dataset.folderId,
            offset: rect.top - containerRect.top
          };
        }
        break;
      }
    }

    const savedScroll = preserveScroll
      ? {
        sectionsTop: sectionsContainer ? sectionsContainer.scrollTop : 0
      }
      : null;

    function restoreScrollPosition() {
      if (!savedScroll) return;
      const maxAttempts = 10;
      let attempts = 0;

      const apply = () => {
        attempts += 1;
        const liveSections = document.querySelector('.bookmarks-sections');
        if (!liveSections) {
          if (attempts < maxAttempts) {
            requestAnimationFrame(apply);
          }
          return;
        }

        const maxTop = Math.max(0, liveSections.scrollHeight - liveSections.clientHeight);

        if (scrollAnchor && scrollAnchor.id) {
          const selector = scrollAnchor.kind === 'tile'
            ? `.bookmarks-gallery-view[data-id="${scrollAnchor.id}"]`
            : `.folder-section[data-folder-id="${scrollAnchor.id}"]`;
          const anchorEl = liveSections.querySelector(selector);
          if (anchorEl) {
            const containerRect = liveSections.getBoundingClientRect();
            const anchorRect = anchorEl.getBoundingClientRect();
            const delta = (anchorRect.top - containerRect.top) - scrollAnchor.offset;
            liveSections.scrollTop = Math.min(maxTop, Math.max(0, liveSections.scrollTop + delta));
          } else {
            liveSections.scrollTop = Math.min(savedScroll.sectionsTop, maxTop);
          }
        } else {
          liveSections.scrollTop = Math.min(savedScroll.sectionsTop, maxTop);
        }

        // Content can continue to change for a few frames while sections/lazy items settle.
        if (attempts < maxAttempts) {
          requestAnimationFrame(apply);
        }
      };

      requestAnimationFrame(apply);
    }
    const renderedFolderIds = new Set();

    if (root && root._lazyObserver) {
      root._lazyObserver.disconnect();
      root._lazyObserver = null;
    }
    // Always re-setup lazyObserver for new root
    setupLazyObserver(root);
    root.innerHTML = '';

    let tree;
    try{
      const treeStart = perfEnabled ? performance.now() : 0;
      tree = await BookmarksService.getTree();
      if (perfEnabled) {
        perf.treeFetchMs = performance.now() - treeStart;
      }
    }catch(e){
      console.error('Failed to load bookmarks', e);
      if (typeof Modal !== 'undefined' && Modal.openError) {
        Modal.openError({
          title: 'Failed to Load Bookmarks',
          message: e && e.message ? e.message : String(e)
        });
      }
      return;
    }
    // reconcile tags in background
    BookmarksService.reconcileTags().catch(()=>{});

    if (typeof TagsService !== 'undefined') {
      try {
        availableTags = await TagsService.getAllTags();
      } catch (e) {
        console.warn('Failed to load tags', e);
      }
    }

    // Get hidden folders
    const hiddenFolders = await Storage.get('hiddenFolders') || [];
    const hiddenFolderIds = new Set(hiddenFolders);
    const hideNestedFolders = await Storage.get('hideNestedFolders') || false;

    // Add or update hidden folders button in bookmarks actions
    const existingHiddenBtn = bookmarksActionsSettings.querySelector('[data-hidden-folders-btn]');
    if (existingHiddenBtn) {
      existingHiddenBtn.remove();
    }
    
    if (hiddenFolderIds.size > 0) {
      const folderWord = hiddenFolderIds.size === 1 ? 'folder' : 'folders';
      const showHiddenBtn = createCommonButton({
        label: `${hiddenFolderIds.size} hidden ${folderWord}`,
        icon: createMaterialIcon('visibility'),
        contrast: 'low',
        onClick: async () => {
          await Storage.set({ hiddenFolders: [] });
          await render(true);
        }
      });
      showHiddenBtn.setAttribute('data-hidden-folders-btn', 'true');
      showHiddenBtn.style.marginRight = '8px';
      const settingsButtonEl = bookmarksActionsSettings.querySelector('.action-button');
      if (settingsButtonEl) {
        bookmarksActionsSettings.insertBefore(showHiddenBtn, settingsButtonEl);
      } else {
        bookmarksActionsSettings.appendChild(showHiddenBtn);
      }
    }

    // Get filter values
    let filterText = (textSearchInput && textSearchInput.value.trim().toLowerCase()) || '';
    const filterActive = (currentFilterTags && currentFilterTags.length > 0) || !!filterText;
    const useTagFilter = currentFilterTags && currentFilterTags.length > 0;
    // Always fetch tagsMap
    const tagsMap = typeof TagsService !== 'undefined'
      ? await TagsService.getAll()
      : null;
    const getTagsForId = (id) => (tagsMap && tagsMap[id]) ? tagsMap[id] : [];

    // Build id -> node map for folder path resolution
    const idToNode = new Map();
    (function buildMap(nodes){
      if (!nodes) return;
      const arr = Array.isArray(nodes) ? nodes : [nodes];
      for (const n of arr) {
        if (!n || !n.id) continue;
        idToNode.set(n.id, n);
        if (n.children && n.children.length) buildMap(n.children);
      }
    })(tree && tree[0] ? tree[0] : null);

    function getFolderPath(id) {
      const parts = [];
      let node = idToNode.get(id);
      let parentId = node && node.parentId;
      while (parentId) {
        const parent = idToNode.get(parentId);
        if (!parent) break;
        if (!parent.url && parent.id !== '0' && parent.title !== '0') {
          parts.push(parent.title || parent.id);
        }
        parentId = parent.parentId;
      }
      return parts.reverse().join(' / ');
    }

    async function clearSearchForFolderNavigation() {
      if (!textSearchInput) return;
      if (!textSearchInput.value) return;

      textSearchInput.value = '';
      textSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await render(false);
    }

    async function openSearchResultFolder(folderId) {
      if (!folderId) return;
      await clearSearchForFolderNavigation();
      if (typeof window.openFolderTreeToFolder === 'function') {
        await window.openFolderTreeToFolder(folderId);
        return;
      }
      currentFolderFilter = folderId;
      if (textSearchInput) {
        textSearchInput.value = '';
        textSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      await render(false);
    }

    async function revealSearchResultFolder(folderId) {
      if (!folderId) return;
      await clearSearchForFolderNavigation();

      let didRevealInTree = false;
      if (typeof window.revealFolderInTree === 'function') {
        await window.revealFolderInTree(folderId);
        didRevealInTree = true;
      } else if (typeof window.openFolderTreeToFolder === 'function') {
        await window.openFolderTreeToFolder(folderId);
        return;
      }

      if (typeof window.showBookmarksInFolder === 'function') {
        await window.showBookmarksInFolder(folderId);
        return;
      }

      if (!didRevealInTree) {
        currentFolderFilter = folderId;
        await render(false);
      }
    }

    // Flat search results mode: when filtering, render only matching bookmarks without folder sections
    if (filterActive) {
      const bookmarkMatches = [];
      const folderMatches = [];
      const seenBookmarks = new Set();
      const seenFolders = new Set();
      async function collectMatches(node) {
        if (!node) return;
        if (Array.isArray(node)) {
          for (const n of node) await collectMatches(n);
          return;
        }
        if (node.url) {
          if (filterText) {
            const title = (node.title || '').toLowerCase();
            const url = (node.url || '').toLowerCase();
            if (!title.includes(filterText) && !url.includes(filterText)) {
              return;
            }
          }
          if (useTagFilter) {
            const tags = getTagsForId(node.id);
            const anyMatch = currentFilterTags.some(t => tags.includes(t));
            if (!anyMatch) return;
          }
          if (!seenBookmarks.has(node.id)) {
            seenBookmarks.add(node.id);
            bookmarkMatches.push(node);
          }
        } else if (filterText) {
          const title = (node.title || '').toLowerCase();
          if (title && title.includes(filterText)) {
            if (!hiddenFolderIds.has(node.id) && !seenFolders.has(node.id)) {
              seenFolders.add(node.id);
              folderMatches.push(node);
            }
          }
        }
        if (node.children && node.children.length) {
          for (const c of node.children) await collectMatches(c);
        }
      }
      await collectMatches(tree && tree[0] ? tree[0] : null);
      if (thisRender !== renderVersion) return;

      const folderResults = currentSort.startsWith('folders-') ? sortFolders(folderMatches) : folderMatches;
      const bookmarkResults = currentSort.startsWith('bookmarks-') ? sortBookmarks(bookmarkMatches) : bookmarkMatches;
      const items = [];

      for (const folder of folderResults) {
        if (thisRender !== renderVersion) return;
        const folderPath = getFolderPath(folder.id);
        const folderTreeAction = createCubeActionButton({
          icon: 'folder_open',
          label: 'Show in folder tree',
          tooltip: folderPath ? `Show in folder tree: ${folderPath}` : 'Show in folder tree',
          onClick: (event) => {
            event.stopPropagation();
            revealSearchResultFolder(folder.id).catch((error) => {
              console.error('Failed to reveal folder search result', error);
            });
          }
        });
        const folderTile = createFolderTile(folder, {
          searchIdleActions: folderTreeAction ? [folderTreeAction] : [],
          showSearchIdleActions: Boolean(folderTreeAction)
        });
        if (folderPath) {
          folderTile.setAttribute('title', `Location: ${folderPath}`);
        }
        folderTile.addEventListener('click', () => {
          openSearchResultFolder(folder.id).catch((error) => {
            console.error('Failed to open folder search result', error);
          });
        });
        items.push(folderTile);
      }

      for (const child of bookmarkResults) {
        if (thisRender !== renderVersion) return;
        const containingFolder = child.parentId ? idToNode.get(child.parentId) : null;
        const containingFolderTitle = containingFolder && !containingFolder.url
          ? (containingFolder.title || 'Folder')
          : '';
        const locationPath = getFolderPath(child.id);
        const bookmarkTags = getTagsForId(child.id);
        const tagAction = bookmarkTags.length > 0 ? createCubeActionButton({
          icon: 'label',
          label: 'Tags',
          onClick: (event) => {
            event.stopPropagation();
            BookmarkModals.tags(child.id).then(() => render(true));
          }
        }) : null;
        if (tagAction && bookmarkTags.length > 0) {
          tagAction.setAttribute('title', bookmarkTags.join(', '));
        }
        const folderAction = child.parentId ? createCubeActionButton({
          icon: 'folder_open',
          label: 'Show in folder tree',
          tooltip: locationPath ? `Show in folder tree: ${locationPath}` : 'Show in folder tree',
          onClick: (event) => {
            event.stopPropagation();
            revealSearchResultFolder(child.parentId).catch((error) => {
              console.error('Failed to reveal bookmark result folder', error);
            });
          }
        }) : null;
        const editAction = createCubeActionButton({
          icon: 'edit',
          label: 'Edit',
          tooltip: 'Edit',
          onClick: (event) => {
            event.stopPropagation();
            BookmarksService.editBookmarkPrompt(child.id).then(() => render(true));
          }
        });
        const deleteAction = createCubeActionButton({
          icon: 'delete',
          label: 'Remove',
          tooltip: 'Remove',
          colorScheme: 'destructive',
          onClick: (event) => {
            event.stopPropagation();
            (async () => {
              const info = await BookmarksService.getBookmark(child.id);
              if (!info) return;
              const confirmed = await Modal.openConfirmation({
                title: 'Delete bookmark',
                message: 'Are you sure you want to delete this bookmark?',
                confirmText: 'Delete',
                destructive: true
              });
              if (!confirmed) return;
              await BookmarksService.deleteWithUndo(child.id);
              await render(true);
            })();
          }
        });

        const urlHost = (() => {
          try { return new URL(child.url).hostname.replace(/^www\./, ''); } catch (e) { return 'Website'; }
        })();

        const tile = createBookmarksGalleryView({
          type: 'bookmark',
          state: 'idle',
          label: child.title || child.url,
          subtext: containingFolderTitle ? `${urlHost} • ${containingFolderTitle}` : urlHost,
          icon: createFaviconIcon(child.url),
          actions: [tagAction, folderAction, editAction, deleteAction].filter(Boolean),
          idleActions: [tagAction, folderAction].filter(Boolean)
        });
        if (locationPath) {
          tile.setAttribute('title', `Location: ${locationPath}`);
        }
        tile.dataset.id = child.id;
        tile.draggable = true;
        tile.addEventListener('click', () => {
          chrome.tabs.create({ url: child.url });
        });
        addDragHandlers(tile);
        items.push(tile);
      }

      const totalResults = folderResults.length + bookmarkResults.length;
      const section = createFolderSection({
        state: 'idle',
        items,
        breadcrumbItems: [{ label: `Results (${totalResults})`, type: 'current' }],
        actions: []
      });
      perf.sectionsRendered += 1;
      section.dataset.folderId = 'results';
      root.appendChild(section);

      const content = section.querySelector('.folder-section__content');
      if (content) {
        addFolderDropHandlers(content, 'results');
      }
      FaviconService.attachErrorHandlers(section);
      setupKeyboardNavigation();

      if (perfEnabled && thisRender === renderVersion) {
        const totalMs = performance.now() - perfStart;
        console.log('[BMG PERF] render (filter)', {
          renderCall: renderCallCount,
          treeFetchMs: Math.round(perf.treeFetchMs),
          renderMs: Math.round(totalMs),
          tilesRendered: perf.tilesRendered,
          sectionsRendered: perf.sectionsRendered
        });
      }
      restoreScrollPosition();
      return;
    }

    // If filtering by folder, show only that folder's contents
    if (currentFolderFilter) {
      const focusedFolder = idToNode.get(currentFolderFilter);
      if (focusedFolder && !focusedFolder.url) {
        // Render just this folder and its contents
        await renderFolder(focusedFolder, root);
        FaviconService.attachErrorHandlers(root);
        setupKeyboardNavigation();
      } else {
        // Folder not found or is invalid, clear filter and show normal view
        currentFolderFilter = null;
        // Fall through to normal rendering
      }
      
      if (currentFolderFilter) {
        // Early return if folder filtering was successful
        if (perfEnabled && thisRender === renderVersion) {
          const totalMs = performance.now() - perfStart;
          console.log('[BMG PERF] render (folder filter)', {
            renderCall: renderCallCount,
            treeFetchMs: Math.round(perf.treeFetchMs),
            renderMs: Math.round(totalMs),
            tilesRendered: perf.tilesRendered,
            sectionsRendered: perf.sectionsRendered
          });
        }
        restoreScrollPosition();
        return;
      }
    }

    // ...existing code...

    function focusFolderSection(folderId) {
      if (!folderId) return;
      const targetEl = document.getElementById(`folder-${folderId}`);
      if (!targetEl) return;
      const scrollContainer = document.querySelector('.bookmarks-sections')
        || targetEl.closest('.bookmarks-sections');
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const nextTop = targetRect.top - containerRect.top + scrollContainer.scrollTop - 12;
        scrollContainer.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
      }
      if (targetEl._highlightTimeoutId) {
        window.clearTimeout(targetEl._highlightTimeoutId);
      }
      targetEl.classList.add('folder-section--highlight');
      targetEl._highlightTimeoutId = window.setTimeout(() => {
        targetEl.classList.remove('folder-section--highlight');
        targetEl._highlightTimeoutId = null;
      }, 1400);
    }

    function buildBreadcrumbItems(folderId) {
      const items = [];
      let node = idToNode.get(folderId);
      while (node) {
        if (!node.url && node.id !== '0' && node.title !== '0') {
          items.unshift(node);
        }
        if (!node.parentId) break;
        node = idToNode.get(node.parentId);
      }
      if (!items.length && idToNode.get(folderId)) {
        const fallback = idToNode.get(folderId);
        if (fallback && fallback.id !== '0' && fallback.title !== '0') {
          items.push(fallback);
        }
      }
      return items.map((entry, index) => {
        const isCurrent = index === items.length - 1;
        return {
          label: entry.title || entry.id,
          type: isCurrent ? 'current' : 'root',
          onClick: isCurrent ? null : () => focusFolderSection(entry.id)
        };
      });
    }

    function collectDescendantFolderIds(node, set) {
      if (!node || !node.children || !node.children.length) return;
      for (const child of node.children) {
        if (child && !child.url) {
          set.add(child.id);
          collectDescendantFolderIds(child, set);
        }
      }
    }

    function buildMoveDestinationOptions(excludedIds) {
      const options = [];

      function visit(node, depth = 0) {
        if (!node || node.url) return;
        if (node.id !== '0' && !excludedIds.has(node.id)) {
          options.push({
            value: node.id,
            label: `${'  '.repeat(depth)}${node.title || '(Untitled)'}`
          });
        }
        if (node.children && node.children.length) {
          node.children.forEach((child) => visit(child, depth + 1));
        }
      }

      const rootNode = tree && tree[0] ? tree[0] : null;
      if (rootNode && rootNode.children) {
        rootNode.children.forEach((child) => visit(child, 0));
      }

      return options;
    }

    function countFolderContents(node) {
      const counts = { bookmarks: 0, folders: 0 };

      function walk(current) {
        if (!current || !current.children || !current.children.length) return;
        for (const child of current.children) {
          if (child.url) {
            counts.bookmarks += 1;
          } else {
            counts.folders += 1;
            walk(child);
          }
        }
      }

      walk(node);
      return counts;
    }

    function buildDeleteFolderSummary(counts) {
      const parts = [];
      if (counts.bookmarks > 0) {
        parts.push(`<strong>${counts.bookmarks}</strong> ${counts.bookmarks === 1 ? 'bookmark' : 'bookmarks'}`);
      }
      if (counts.folders > 0) {
        parts.push(`<strong>${counts.folders}</strong> ${counts.folders === 1 ? 'subfolder' : 'subfolders'}`);
      }
      if (!parts.length) {
        return 'Are you sure you want to delete this folder?';
      }
      return `Are you sure you want to delete this folder?<br><br>This folder contains ${parts.join(' and ')}.`;
    }

    async function selectDeleteDestination(folderNode) {
      const counts = countFolderContents(folderNode);
      const isEmptyFolder = counts.bookmarks === 0 && counts.folders === 0;

      if (isEmptyFolder) {
        const confirmed = await Modal.openConfirmation({
          title: 'Delete folder',
          message: 'Are you sure you want to delete this folder?',
          confirmText: 'Delete',
          destructive: true
        });

        return confirmed
          ? { delete_action: 'delete', move_destination: '' }
          : null;
      }

      const excludedIds = new Set([folderNode.id]);
      collectDescendantFolderIds(folderNode, excludedIds);

      const destinationOptions = buildMoveDestinationOptions(excludedIds);
      const parentId = folderNode.parentId;
      const defaultDestination = destinationOptions.some((opt) => opt.value === parentId)
        ? parentId
        : (destinationOptions[0] ? destinationOptions[0].value : '');
      const canMoveContents = destinationOptions.length > 0;
      const defaultAction = 'delete';
      const deleteFolderSummary = buildDeleteFolderSummary(counts);

      if (typeof createModal === 'function' && typeof showModal === 'function') {
        return new Promise((resolve) => {
          const content = document.createElement('div');
          content.className = 'delete-folder-modal';

          const summary = document.createElement('p');
          summary.className = 'delete-folder-modal__summary';
          summary.innerHTML = deleteFolderSummary;

          const choices = document.createElement('div');
          choices.className = 'delete-folder-modal__choices';

          const hiddenActionInput = document.createElement('input');
          hiddenActionInput.id = 'delete_action';
          hiddenActionInput.type = 'hidden';
          hiddenActionInput.value = defaultAction;

          const deleteChoice = document.createElement('label');
          deleteChoice.className = 'delete-folder-modal__choice delete-folder-modal__choice--delete';
          deleteChoice.dataset.action = 'delete';
          deleteChoice.innerHTML = `
            <input id="delete-action-delete" type="radio" name="delete-action-choice" value="delete" ${defaultAction === 'delete' ? 'checked' : ''}>
            <span class="delete-folder-modal__choice-copy">
              <span class="delete-folder-modal__choice-title">Do not keep items</span>
              <span class="delete-folder-modal__choice-text">Delete everything inside this folder.</span>
            </span>
          `;

          const moveChoice = document.createElement('label');
          moveChoice.className = 'delete-folder-modal__choice delete-folder-modal__choice--move';
          moveChoice.dataset.action = 'move';
          if (!canMoveContents) {
            moveChoice.classList.add('delete-folder-modal__choice--disabled');
          }
          moveChoice.innerHTML = `
            <input id="delete-action-move" type="radio" name="delete-action-choice" value="move" ${defaultAction === 'move' ? 'checked' : ''} ${canMoveContents ? '' : 'disabled'}>
            <span class="delete-folder-modal__choice-copy">
              <span class="delete-folder-modal__choice-title">Keep items</span>
              <span class="delete-folder-modal__choice-text">Move bookmarks and subfolders into another folder before deleting this one.</span>
            </span>
          `;

          choices.appendChild(deleteChoice);
          choices.appendChild(moveChoice);
          choices.appendChild(hiddenActionInput);
          content.appendChild(summary);
          content.appendChild(choices);

          let modal = null;
          let submitResult = null;

          const updateChoiceState = () => {
            const deleteActionRadio = content.querySelector('#delete-action-delete');
            hiddenActionInput.value = deleteActionRadio && deleteActionRadio.checked ? 'delete' : 'move';

            [deleteChoice, moveChoice].forEach((choice) => {
              const action = choice.dataset.action;
              choice.classList.toggle('delete-folder-modal__choice--selected', hiddenActionInput.value === action);
            });

            if (!modal) return;
            const destinationField = modal.querySelector('[data-modal-select="move_destination"]')?.closest('.modal__field');
            if (destinationField) {
              destinationField.style.display = hiddenActionInput.value === 'move' ? '' : 'none';
            }
          };

          content.querySelector('#delete-action-delete').addEventListener('change', updateChoiceState);
          content.querySelector('#delete-action-move').addEventListener('change', updateChoiceState);

          modal = createModal({
            type: 'form',
            title: 'Delete folder',
            content,
            fields: [
              {
                id: 'move_destination',
                label: 'Move items to',
                type: 'select',
                value: defaultDestination,
                required: false,
                options: destinationOptions.length ? destinationOptions : [{ value: '', label: 'No destination available' }]
              }
            ],
            buttons: [
              { label: 'Cancel', type: 'common', role: 'cancel', shortcut: 'ESC' },
              { label: 'Delete', type: 'destructive', role: 'confirm', shortcut: '↵' }
            ],
            onSubmit: () => {
              const action = hiddenActionInput.value;
              const destinationInput = document.getElementById('move_destination');

              if (action === 'move' && !destinationInput?.value) {
                Modal.openError({
                  title: 'Missing destination',
                  message: 'Choose a destination folder before moving items.'
                });
                return false;
              }

              submitResult = {
                delete_action: action,
                move_destination: destinationInput?.value || ''
              };

              return true;
            },
            onClose: (confirmed) => {
              resolve(confirmed ? submitResult : null);
            }
          });

          modal.querySelector('.modal')?.classList.add('delete-folder-modal-shell');

          showModal(modal);
          setTimeout(updateChoiceState, 0);
        });
      }

      const picker = new BaseModal({
        title: 'Delete folder',
        customContent: `
          <p style="margin-bottom: 0.75rem; line-height: 1.5;">${deleteFolderSummary}</p>
          <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:0.75rem;">
            <label style="display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer;line-height:1.4;">
              <input id="delete-action-delete" type="radio" name="delete-action-choice" value="delete" ${defaultAction === 'delete' ? 'checked' : ''}>
              <span>Do not keep items (delete everything)</span>
            </label>
            <label style="display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer;line-height:1.4;">
              <input id="delete-action-move" type="radio" name="delete-action-choice" value="move" ${defaultAction === 'move' ? 'checked' : ''} ${canMoveContents ? '' : 'disabled'}>
              <span>Keep items (move them to another folder)</span>
            </label>
            <input id="delete_action" type="hidden" value="${defaultAction}">
          </div>
        `,
        fields: [
          {
            id: 'move_destination',
            label: 'Move items to',
            type: 'select',
            value: defaultDestination,
            required: false,
            options: destinationOptions.length ? destinationOptions : [{ value: '', label: 'No destination available' }]
          }
        ],
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmVariant: 'destructive'
      });

      const pickerPromise = picker.show();

      setTimeout(() => {
        const hiddenActionInput = document.getElementById('delete_action');
        const moveActionRadio = document.getElementById('delete-action-move');
        const deleteActionRadio = document.getElementById('delete-action-delete');
        const destinationSelect = document.getElementById('move_destination');
        const destinationField = destinationSelect ? destinationSelect.closest('.bm-field') : null;
        const submitBtn = document.getElementById('bm-modal-submit');

        if (!hiddenActionInput || !moveActionRadio || !deleteActionRadio) return;

        if (submitBtn) {
          submitBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true" style="font-size:16px;line-height:1;">delete</span><span>Delete</span>';
          submitBtn.style.display = 'inline-flex';
          submitBtn.style.alignItems = 'center';
          submitBtn.style.justifyContent = 'center';
          submitBtn.style.gap = '6px';
        }

        const syncActionState = () => {
          const action = deleteActionRadio.checked ? 'delete' : 'move';
          hiddenActionInput.value = action;
          if (destinationField) {
            destinationField.style.display = action === 'move' ? '' : 'none';
          }
        };

        moveActionRadio.addEventListener('change', syncActionState);
        deleteActionRadio.addEventListener('change', syncActionState);
        syncActionState();
      }, 0);

      const data = await pickerPromise;
      return data || null;
    }

    async function deleteFolderWithDestination(folderNode) {
      const selection = await selectDeleteDestination(folderNode);
      if (!selection) return;

      if (selection.delete_action === 'delete') {
        await BookmarksService.deleteWithUndo(folderNode.id);
        await render(true);
        return;
      }

      const destinationFolderId = selection.move_destination;
      if (!destinationFolderId) {
        await Modal.openError({
          title: 'Destination required',
          message: 'Please choose a destination folder to keep the contents.'
        });
        return;
      }

      await BookmarksService.moveFolderContentsAndDelete(folderNode.id, destinationFolderId);
      await render(true);
    }

    function createBookmarkTile(child) {
      perf.tilesRendered += 1;
      const editAction = createCubeActionButton({
        icon: 'edit',
        label: 'Edit',
        tooltip: 'Edit',
        onClick: (event) => {
          event.stopPropagation();
          BookmarksService.editBookmarkPrompt(child.id).then(() => render(true));
        }
      });
      const deleteAction = createCubeActionButton({
        icon: 'delete',
        label: 'Remove',
        tooltip: 'Remove',
        colorScheme: 'destructive',
        onClick: (event) => {
          event.stopPropagation();
          (async () => {
            const confirmed = await Modal.openConfirmation({
              title: 'Delete bookmark',
              message: 'Are you sure you want to delete this bookmark?',
              confirmText: 'Delete',
              destructive: true
            });
            if (!confirmed) return;
            await BookmarksService.deleteWithUndo(child.id);
            await render(true);
          })();
        }
      });

      const bookmarkTags = getTagsForId(child.id);
      const tagAction = bookmarkTags.length > 0 ? createCubeActionButton({
        icon: 'label',
        label: 'Tags',
        onClick: (event) => {
          event.stopPropagation();
          BookmarkModals.tags(child.id).then(() => render(true));
        }
      }) : null;
      
      // Add native tooltip with all tags
      if (tagAction && bookmarkTags.length > 0) {
        tagAction.setAttribute('title', bookmarkTags.join(', '));
      }

      const urlHost = (() => {
        try { return new URL(child.url).hostname.replace(/^www\./, ''); } catch (e) { return 'Website'; }
      })();

      const tile = createBookmarksGalleryView({
        type: 'bookmark',
        state: 'idle',
        label: child.title || child.url,
        subtext: urlHost,
        icon: createFaviconIcon(child.url),
        idleActions: tagAction ? [tagAction] : [],
        showIdleActions: true
      });

      const actionsContainer = tile.querySelector('.bookmarks-gallery-view__actions');
      if (!actionsContainer) {
        // Create actions container if it doesn't exist (when no idle actions)
        const newContainer = document.createElement('div');
        newContainer.className = 'bookmarks-gallery-view__actions';
        tile.appendChild(newContainer);
      }

      const container = tile.querySelector('.bookmarks-gallery-view__actions');
      if (container) {
        tile.addEventListener('mouseenter', () => {
          if (editAction && !container.contains(editAction)) {
            container.insertBefore(editAction, tagAction);
          }
          if (deleteAction && !container.contains(deleteAction)) {
            container.insertBefore(deleteAction, tagAction);
          }
        });
        tile.addEventListener('mouseleave', () => {
          if (editAction && editAction.parentNode === container) {
            container.removeChild(editAction);
          }
          if (deleteAction && deleteAction.parentNode === container) {
            container.removeChild(deleteAction);
          }
        });
      }

      tile.dataset.id = child.id;
      tile.draggable = true;
      tile.addEventListener('click', () => {
        chrome.tabs.create({ url: child.url });
      });
      addDragHandlers(tile);
      return tile;
    }

    function createFolderTile(child, options = {}) {
      const {
        searchIdleActions = null,
        showSearchIdleActions = false
      } = options;
      perf.tilesRendered += 1;
      const editAction = createCubeActionButton({
        icon: 'edit',
        label: 'Rename',
        tooltip: 'Rename',
        onClick: (event) => {
          event.stopPropagation();
          BookmarkModals.editFolder(child.id).then(() => render(true));
        }
      });
      const deleteAction = createCubeActionButton({
        icon: 'delete',
        label: 'Remove',
        tooltip: 'Remove',
        colorScheme: 'destructive',
        onClick: (event) => {
          event.stopPropagation();
          deleteFolderWithDestination(child).catch((error) => {
            console.error('Delete folder with destination failed', error);
          });
        }
      });

      const childCount = (child.children && child.children.length) || 0;
      const tile = createBookmarksGalleryView({
        type: 'folder',
        state: 'idle',
        label: child.title || 'Folder',
        count: `${childCount} items`,
        icon: 'folder',
        idleActions: Array.isArray(searchIdleActions) && searchIdleActions.length > 0
          ? searchIdleActions
          : [editAction, deleteAction],
        showIdleActions: Array.isArray(searchIdleActions) && searchIdleActions.length > 0
          ? showSearchIdleActions
          : false
      });

      const actionsContainer = tile.querySelector('.bookmarks-gallery-view__actions');
      if (actionsContainer && Array.isArray(searchIdleActions) && searchIdleActions.length > 0) {
        tile.addEventListener('mouseenter', () => {
          if (editAction && !actionsContainer.contains(editAction)) {
            actionsContainer.appendChild(editAction);
          }
          if (deleteAction && !actionsContainer.contains(deleteAction)) {
            actionsContainer.appendChild(deleteAction);
          }
        });

        tile.addEventListener('mouseleave', () => {
          if (editAction && editAction.parentNode === actionsContainer) {
            actionsContainer.removeChild(editAction);
          }
          if (deleteAction && deleteAction.parentNode === actionsContainer) {
            actionsContainer.removeChild(deleteAction);
          }
        });
      }

      tile.dataset.id = child.id;
      tile.draggable = true;
      addDragHandlers(tile);
      return tile;
    }

    // Helper function to render a folder and all its contents recursively
    async function renderFolder(folder, parentEl) {
      if (renderedFolderIds.has(folder.id)) return;
      renderedFolderIds.add(folder.id);
      if (hiddenFolderIds.has(folder.id)) return;

      const breadcrumbItems = buildBreadcrumbItems(folder.id);
      const items = [];

      // Root-level folders are direct children of Bookmarks Bar or Other Bookmarks
      const isRootFolder = folder.parentId === '1' || folder.parentId === '2';
      // Allow hiding top-level system sections as well (Other Bookmarks and Mobile Bookmarks)
      const isHideableTopLevelSection = folder.parentId === '0' && (folder.id === '2' || folder.id === '3');
      const canHideFolderSection = isRootFolder || isHideableTopLevelSection;
      const canDeleteFolderSection = folder.parentId !== '0';

      // Create folder section actions
      const folderActions = [];
      const tooltipData = []; // Store tooltip info separately

      // Hide (root folders + top-level Other/Mobile sections)
      if (canHideFolderSection) {
        const hideBtn = createCubeActionButton({
          icon: 'visibility_off',
          label: 'Hide',
          onClick: async (event) => {
            event.stopPropagation();
            const hiddenFolders = await Storage.get('hiddenFolders') || [];
            hiddenFolders.push(folder.id);
            await Storage.set({ hiddenFolders });
            await render(true);
          }
        });
        folderActions.push(hideBtn);
        tooltipData.push('Hide folder');
      }

      // Edit (only for root folders)
      if (isRootFolder) {
        const editBtn = createCubeActionButton({
          icon: 'edit',
          label: 'Edit',
          onClick: async (event) => {
            event.stopPropagation();
            await BookmarkModals.editFolder(folder.id);
            await render(true);
          }
        });
        folderActions.push(editBtn);
        tooltipData.push('Rename folder');
      }

      // Add folder
      const addFolderBtn = createCubeActionButton({
        icon: 'folder',
        label: 'Insert',
        onClick: async (event) => {
          event.stopPropagation();
          const data = await Modal.openFolderForm({ title: '' });
          if (data && data.title) {
            await chrome.bookmarks.create({
              parentId: folder.id,
              title: data.title
            });
            await render(true);
          }
        }
      });
      folderActions.push(addFolderBtn);
      tooltipData.push('Add subfolder');

      // Import (Move to folder)
      const importBtn = createCubeActionButton({
        icon: 'south_west',
        label: 'Import',
        onClick: async (event) => {
          event.stopPropagation();
          if (typeof BookmarkModals !== 'undefined' && BookmarkModals.addTabs) {
            await BookmarkModals.addTabs(folder.id);
            await render(true);
          }
        }
      });
      folderActions.push(importBtn);
      tooltipData.push('Import active tabs');

      // Open all
      const openAllBtn = createCubeActionButton({
        icon: 'arrow_outward',
        label: 'Open',
        onClick: async (event) => {
          event.stopPropagation();
          const bookmarksToOpen = [];
          function collectBookmarks(node) {
            if (node.url) {
              bookmarksToOpen.push(node.url);
            }
            if (node.children) {
              node.children.forEach(collectBookmarks);
            }
          }
          collectBookmarks(folder);
          if (bookmarksToOpen.length > 0) {
            if (bookmarksToOpen.length > 10) {
              const confirmed = await Modal.openConfirmation({
                title: 'Open all bookmarks?',
                message: `Open ${bookmarksToOpen.length} bookmarks?`,
                confirmText: 'Open'
              });
              if (!confirmed) return;
            }
            bookmarksToOpen.forEach(url => chrome.tabs.create({ url, active: false }));
          }
        }
      });
      folderActions.push(openAllBtn);
      tooltipData.push('Open all bookmarks');

      // Add bookmark
      const addBookmarkBtn = createCubeActionButtonWithLabel({
        icon: 'add',
        label: 'Add bookmark',
        colorScheme: 'primary',
        onClick: async (event) => {
          event.stopPropagation();
          const data = await Modal.openBookmarkForm({ folderId: folder.id }, { showTabsSuggestions: true });
          if (data) {
            const newNode = await new Promise((res, reject) => {
              chrome.bookmarks.create({ parentId: folder.id, title: data.title, url: data.url }, node => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else res(node);
              });
            });
            if (data.tags && data.tags.length && newNode) {
              await TagsService.setTags(newNode.id, data.tags);
            }
            await render(true);
          }
        }
      });
      folderActions.push(addBookmarkBtn);
      tooltipData.push('Add bookmark to folder');

      // Delete for user folders, but never for top-level system sections
      if (canDeleteFolderSection) {
        const deleteBtn = createCubeActionButton({
          icon: 'delete',
          label: 'Remove',
          colorScheme: 'destructive',
          onClick: async (event) => {
            event.stopPropagation();
            try {
              await deleteFolderWithDestination(folder);
            } catch (error) {
              console.error('Delete folder with destination failed', error);
            }
          }
        });
        folderActions.push(deleteBtn);
        tooltipData.push('Delete folder');
      }

      const section = createFolderSection({
        state: 'idle',
        items,
        breadcrumbItems,
        actions: folderActions.filter(Boolean)
      });
      perf.sectionsRendered += 1;
      section.dataset.folderId = folder.id;
      section.id = `folder-${folder.id}`;
      parentEl.appendChild(section);

      const renderItemsOnce = async () => {
        if (section.dataset.itemsRendered === 'true') return;
        section.dataset.itemsRendered = 'true';

        const sectionItems = [];

        if (folder.children && folder.children.length) {
          if ((currentFilterTags && currentFilterTags.length > 0) || filterText) {
            async function folderHasMatch(node) {
              if (!node || !node.children) return false;
              for (const child of node.children) {
                if (child.url) {
                  if (filterText) {
                    const title = (child.title || '').toLowerCase();
                    const url = (child.url || '').toLowerCase();
                    if (!title.includes(filterText) && !url.includes(filterText)) {
                      continue;
                    }
                  }
                  if (useTagFilter) {
                    const tags = getTagsForId(child.id);
                    const anyMatch = currentFilterTags.some(t => tags.includes(t));
                    if (!anyMatch) continue;
                  }
                  return true;
                } else if (child.children && child.children.length) {
                  const has = await folderHasMatch(child);
                  if (has) return true;
                }
              }
              return false;
            }

            const hasMatchingBookmarks = await folderHasMatch(folder);
            if (!hasMatchingBookmarks) return;
          }

          const sortedChildren = sortFolderSectionChildren(folder.children);
          const seenChildFolderIds = new Set();

          for (const child of sortedChildren) {
            if (useTagFilter && child.url) {
              const tags = getTagsForId(child.id);
              const anyMatch = currentFilterTags.some(t => tags.includes(t));
              if (!anyMatch) continue;
            }
            if (filterText && child.url) {
              const title = (child.title || '').toLowerCase();
              const url = (child.url || '').toLowerCase();
              if (!title.includes(filterText) && !url.includes(filterText)) continue;
            }

            if (child.url) {
              sectionItems.push(createBookmarkTile(child));
            } else {
              if (hideNestedFolders) continue;
              if (seenChildFolderIds.has(child.id)) continue;
              seenChildFolderIds.add(child.id);
              sectionItems.push(createFolderTile(child));
            }
          }
        }

        updateFolderSectionItems(section, sectionItems);
        FaviconService.attachErrorHandlers(section);
      };

      section._renderFolderItems = renderItemsOnce;

      // Add tooltips after section is in DOM
      const actionsContainer = section.querySelector('.folder-section__actions');
      if (actionsContainer && typeof createTooltip === 'function') {
        const buttons = actionsContainer.querySelectorAll('button');
        buttons.forEach((button, index) => {
          if (tooltipData[index]) {
            createTooltip({
              text: tooltipData[index],
              target: button,
              position: 'bottom',
              delay: 'fast'
            });
          }
        });
      }

      const content = section.querySelector('.folder-section__content');
      if (content) {
        if (!content.getAttribute('data-folder-nav')) {
          content.addEventListener('click', (event) => {
            if (event.target.closest('button')) return;
            const tile = event.target.closest('.bookmarks-gallery-view--folder');
            if (!tile || !content.contains(tile)) return;
            const targetId = tile.dataset.id;
            if (!targetId) return;
            focusFolderSection(targetId);
          });
          content.setAttribute('data-folder-nav', 'true');
        }
        addFolderDropHandlers(content, folder.id);
      }

      if (lazyObserver && !currentFolderFilter) {
        lazyObserver.observe(section);
      } else {
        renderItemsOnce();
      }

      // Only render nested folders if not filtering by a specific folder
      if (!currentFolderFilter && folder.children && folder.children.length) {
        const childFolders = folder.children.filter(c => !c.url);
        const sortedChildFolders = sortFolders(childFolders);
        for (const child of sortedChildFolders) {
          await renderFolder(child, parentEl);
        }
      }
    }

    let folders = (tree && tree[0] && tree[0].children) ? tree[0].children : [];
    folders = sortFolders(folders);

    for (const folder of folders) {
      await renderFolder(folder, root);
    }

    setupKeyboardNavigation();

    if (perfEnabled && thisRender === renderVersion) {
      const totalMs = performance.now() - perfStart;
      console.log('[BMG PERF] render', {
        renderCall: renderCallCount,
        treeFetchMs: Math.round(perf.treeFetchMs),
        renderMs: Math.round(totalMs),
        tilesRendered: perf.tilesRendered,
        sectionsRendered: perf.sectionsRendered
      });
    }

    restoreScrollPosition();
  }

  const dragState = {
    srcId: null,
    srcEl: null,
    intent: null,
    caretEl: null,
    ghostEl: null,
    insideTargetEl: null,
    autoScrollRAF: null,
    activeScrollDirection: null
  };

  function stopAutoScroll() {
    if (dragState.autoScrollRAF) {
      cancelAnimationFrame(dragState.autoScrollRAF);
      dragState.autoScrollRAF = null;
    }
  }

  function getAutoScrollSpeed(distanceFromEdge, edgeThreshold = 40) {
    // Closer to edge = faster scroll
    const ratio = 1 - (distanceFromEdge / edgeThreshold);
    const minSpeed = 5;
    const maxSpeed = 20;
    return Math.round(minSpeed + (maxSpeed - minSpeed) * ratio * ratio);
  }

  function startAutoScroll(scrollUp) {
    if (dragState.activeScrollDirection === (scrollUp ? 'up' : 'down') && dragState.autoScrollRAF) {
      return; // already scrolling this direction
    }

    stopAutoScroll();
    dragState.activeScrollDirection = scrollUp ? 'up' : 'down';

    const doScroll = () => {
      const container = document.querySelector('.bookmarks-sections');
      if (!container) {
        dragState.autoScrollRAF = null;
        return;
      }

      const speed = 12;
      const dir = dragState.activeScrollDirection === 'up' ? -1 : 1;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const newTop = container.scrollTop + (speed * dir);
      const clamped = Math.max(0, Math.min(newTop, maxScroll));

      container.scrollTop = clamped;

      const canScroll = (dir === -1 && clamped > 0) || (dir === 1 && clamped < maxScroll);
      if (canScroll) {
        dragState.autoScrollRAF = requestAnimationFrame(doScroll);
      } else {
        dragState.autoScrollRAF = null;
      }
    };

    dragState.autoScrollRAF = requestAnimationFrame(doScroll);
  }

  function handleAutoScroll(clientY) {
    const scrollContainer = document.querySelector('.bookmarks-sections');
    if (!scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const edgeThreshold = 40;
    const distFromTop = clientY - containerRect.top;
    const distFromBottom = containerRect.bottom - clientY;

    const isNearTop = distFromTop >= 0 && distFromTop < edgeThreshold;
    const isNearBottom = distFromBottom >= 0 && distFromBottom < edgeThreshold;

    if (!isNearTop && !isNearBottom) {
      stopAutoScroll();
      dragState.activeScrollDirection = null;
      return;
    }

    startAutoScroll(isNearTop);
  }

  function ensureDragCaret() {
    if (dragState.caretEl) return dragState.caretEl;
    const caret = document.createElement('div');
    caret.className = 'bookmark-drag-caret';
    caret.style.display = 'none';
    document.body.appendChild(caret);
    dragState.caretEl = caret;
    return caret;
  }

  function hideDragCaret() {
    if (dragState.caretEl) {
      dragState.caretEl.style.display = 'none';
    }
  }

  function clearInsideTarget() {
    if (dragState.insideTargetEl) {
      dragState.insideTargetEl.classList.remove('bookmarks-gallery-view--drop-inside');
      dragState.insideTargetEl = null;
    }
  }

  function setDragIntent(intent) {
    dragState.intent = intent;
    clearInsideTarget();

    if (!intent) {
      hideDragCaret();
      return;
    }

    if (intent.mode === 'inside' && intent.targetEl) {
      hideDragCaret();
      intent.targetEl.classList.add('bookmarks-gallery-view--drop-inside');
      dragState.insideTargetEl = intent.targetEl;
      return;
    }

    const caret = ensureDragCaret();
    if (intent.mode === 'append' && intent.containerEl) {
      const contentRect = intent.containerEl.getBoundingClientRect();
      const tiles = intent.containerEl.querySelectorAll('.bookmarks-gallery-view');
      const lastTile = tiles.length ? tiles[tiles.length - 1] : null;
      const top = lastTile ? lastTile.getBoundingClientRect().top + 6 : contentRect.top + 6;
      const left = lastTile ? lastTile.getBoundingClientRect().right - 2 : contentRect.left + 8;
      caret.style.left = `${Math.round(left)}px`;
      caret.style.top = `${Math.round(top)}px`;
      caret.style.height = `${Math.max(22, Math.round((lastTile ? lastTile.getBoundingClientRect().height : 50) - 12))}px`;
      caret.style.display = 'block';
      return;
    }

    if (!intent.targetEl) {
      hideDragCaret();
      return;
    }

    const rect = intent.targetEl.getBoundingClientRect();
    const left = intent.mode === 'before' ? rect.left - 2 : rect.right - 2;
    caret.style.left = `${Math.round(left)}px`;
    caret.style.top = `${Math.round(rect.top + 6)}px`;
    caret.style.height = `${Math.max(22, Math.round(rect.height - 12))}px`;
    caret.style.display = 'block';
  }

  function cleanupDragState() {
    stopAutoScroll();
    hideDragCaret();
    clearInsideTarget();
    if (dragState.srcEl) {
      dragState.srcEl.classList.remove('bookmarks-gallery-view--drag-source');
    }
    if (dragState.ghostEl && dragState.ghostEl.parentNode) {
      dragState.ghostEl.parentNode.removeChild(dragState.ghostEl);
    }
    dragState.srcId = null;
    dragState.srcEl = null;
    dragState.intent = null;
    dragState.ghostEl = null;
    dragState.activeScrollDirection = null;
  }

  function createDragGhost(sourceEl) {
    const ghost = sourceEl.cloneNode(true);
    ghost.classList.add('bookmarks-gallery-view--drag-ghost');
    ghost.classList.remove('bookmarks-gallery-view--drag-source', 'bookmarks-gallery-view--drop-inside');
    document.body.appendChild(ghost);
    return ghost;
  }

  function getTileDropMode(tile, event) {
    const tileType = tile.classList.contains('bookmarks-gallery-view--folder') ? 'folder' : 'bookmark';
    const rect = tile.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const beforeZone = rect.width * 0.33;
    const afterZone = rect.width * 0.67;

    if (tileType === 'folder' && x > beforeZone && x < afterZone) {
      return 'inside';
    }
    return x <= beforeZone ? 'before' : 'after';
  }

  async function canMoveFolderInto(folderId, destinationFolderId) {
    if (!folderId || !destinationFolderId) return false;
    if (folderId === destinationFolderId) return false;
    const subtree = await BookmarksService.getSubTree(folderId);
    let blocked = false;

    (function walk(node) {
      if (!node || blocked) return;
      if (node.id === destinationFolderId) {
        blocked = true;
        return;
      }
      if (node.children && node.children.length) {
        node.children.forEach(walk);
      }
    })(subtree);

    return !blocked;
  }

  async function moveBookmarkNode(srcId, parentId, index) {
    return new Promise((res, reject) => {
      chrome.bookmarks.move(srcId, { parentId, index }, (moved) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else res(moved);
      });
    });
  }

  async function applyDropIntent() {
    const intent = dragState.intent;
    const srcId = dragState.srcId;
    if (!intent || !srcId) return { moved: false, refreshContents: false };

    const srcInfo = await BookmarksService.getBookmark(srcId);
    if (!srcInfo) return { moved: false, refreshContents: false };

    const undoPayload = {
      id: srcInfo.id,
      title: srcInfo.title,
      parentId: srcInfo.parentId,
      index: srcInfo.index
    };

    let destinationParentId = null;
    let destinationIndex = null;

    if (intent.mode === 'inside') {
      const folderId = intent.targetId;
      if (!folderId || folderId === 'results') return { moved: false, refreshContents: false };
      if (!srcInfo.url) {
        const allowed = await canMoveFolderInto(srcInfo.id, folderId);
        if (!allowed) return { moved: false, refreshContents: false };
      }
      const subtree = await BookmarksService.getSubTree(folderId);
      const children = subtree && subtree.children ? subtree.children : [];
      destinationParentId = folderId;
      destinationIndex = children.length;
      if (srcInfo.parentId === destinationParentId) {
        destinationIndex = Math.max(0, destinationIndex - 1);
      }
    } else if (intent.mode === 'append') {
      if (!intent.folderId || intent.folderId === 'results') return { moved: false, refreshContents: false };
      if (!srcInfo.url) {
        const allowed = await canMoveFolderInto(srcInfo.id, intent.folderId);
        if (!allowed) return { moved: false, refreshContents: false };
      }
      const subtree = await BookmarksService.getSubTree(intent.folderId);
      const children = subtree && subtree.children ? subtree.children : [];
      destinationParentId = intent.folderId;
      destinationIndex = children.length;
      if (srcInfo.parentId === destinationParentId) {
        destinationIndex = Math.max(0, destinationIndex - 1);
      }
    } else if (intent.mode === 'before' || intent.mode === 'after') {
      const targetId = intent.targetId;
      if (!targetId || targetId === srcId) return { moved: false, refreshContents: false };
      const dstInfo = await BookmarksService.getBookmark(targetId);
      if (!dstInfo) return { moved: false, refreshContents: false };
      destinationParentId = dstInfo.parentId;
      destinationIndex = intent.mode === 'before' ? dstInfo.index : dstInfo.index + 1;
      if (srcInfo.parentId === destinationParentId && typeof srcInfo.index === 'number' && srcInfo.index < destinationIndex) {
        destinationIndex -= 1;
      }
    }

    if (!destinationParentId || typeof destinationIndex !== 'number') return { moved: false, refreshContents: false };

    await moveBookmarkNode(srcId, destinationParentId, destinationIndex);

    UndoService.show(
      `Moved "${undoPayload.title || 'item'}"`,
      async () => {
        try {
          await moveBookmarkNode(undoPayload.id, undoPayload.parentId, undoPayload.index);
          await render(true);
        } catch (err) {
          console.error('Undo move failed', err);
        }
      },
      6000
    );

    return {
      moved: true,
      refreshContents: !srcInfo.url
    };
  }

  function applyDropIntentToDom(intent, sourceEl) {
    if (!intent || !sourceEl || !sourceEl.parentNode) return;

    if ((intent.mode === 'before' || intent.mode === 'after') && intent.targetEl && intent.targetEl.parentNode) {
      const parent = intent.targetEl.parentNode;
      if (intent.mode === 'before') {
        parent.insertBefore(sourceEl, intent.targetEl);
      } else if (intent.targetEl.nextSibling) {
        parent.insertBefore(sourceEl, intent.targetEl.nextSibling);
      } else {
        parent.appendChild(sourceEl);
      }
      return;
    }

    if (intent.mode === 'append' && intent.containerEl) {
      intent.containerEl.appendChild(sourceEl);
      return;
    }

    if (intent.mode === 'inside') {
      sourceEl.remove();
    }
  }

  function addDragHandlers(el) {
    el.addEventListener('dragstart', (e) => {
      if (!el.dataset.id) return;
      dragState.srcId = el.dataset.id;
      dragState.srcEl = el;
      el.classList.add('bookmarks-gallery-view--drag-source');

      e.dataTransfer.setData('text/bookmark-id', el.dataset.id);
      e.dataTransfer.effectAllowed = 'move';

      const ghost = createDragGhost(el);
      dragState.ghostEl = ghost;
      e.dataTransfer.setDragImage(ghost, 55, 55);
    });

    el.addEventListener('dragover', (e) => {
      if (!dragState.srcId) return;
      if (!el.dataset.id) return;
      if (el.dataset.id === dragState.srcId) return;

      e.preventDefault();
      const mode = getTileDropMode(el, e);
      setDragIntent({
        mode,
        targetId: el.dataset.id,
        targetEl: el
      });
      
      // Handle auto-scroll at edges
      handleAutoScroll(e.clientY);
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dragState.srcId) return;
      try {
        const intentSnapshot = dragState.intent;
        const sourceSnapshot = dragState.srcEl;
        const dropResult = await applyDropIntent();
        if (dropResult.moved) {
          if (dropResult.refreshContents) {
            await render(true);
          } else {
          applyDropIntentToDom(intentSnapshot, sourceSnapshot);
          }
        }
        cleanupDragState();
      } catch (err) {
        console.error('drop move failed', err);
        cleanupDragState();
      }
    });

    el.addEventListener('dragend', () => {
      cleanupDragState();
    });
  }

  function addFolderDropHandlers(container, folderId) {
    if (!container) return;

    container.addEventListener('dragover', (e) => {
      if (!dragState.srcId) return;
      e.preventDefault();

      const tile = e.target.closest('.bookmarks-gallery-view');
      if (tile && container.contains(tile)) {
        return;
      }

      setDragIntent({
        mode: 'append',
        folderId,
        containerEl: container
      });
      
      // Handle auto-scroll at edges
      handleAutoScroll(e.clientY);
    });

    container.addEventListener('dragleave', (e) => {
      if (e.relatedTarget && container.contains(e.relatedTarget)) return;
      if (dragState.intent && dragState.intent.mode === 'append' && dragState.intent.containerEl === container) {
        setDragIntent(null);
      }
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dragState.srcId || folderId === 'results') return;
      try {
        const intentSnapshot = dragState.intent;
        const sourceSnapshot = dragState.srcEl;
        const dropResult = await applyDropIntent();
        if (dropResult.moved) {
          if (dropResult.refreshContents) {
            await render(true);
          } else {
          applyDropIntentToDom(intentSnapshot, sourceSnapshot);
          }
        }
        cleanupDragState();
      } catch (err) {
        console.error('drop append failed', err);
        cleanupDragState();
      }
    });
  }

  function setupScrollZoneHandlers() {
    // Create fixed overlay zones that are only visible/active during drag
    const topZone = document.createElement('div');
    topZone.className = 'bookmarks-drag-scroll-zone bookmarks-drag-scroll-zone--top';
    document.body.appendChild(topZone);

    const bottomZone = document.createElement('div');
    bottomZone.className = 'bookmarks-drag-scroll-zone bookmarks-drag-scroll-zone--bottom';
    document.body.appendChild(bottomZone);

    const attach = (zone, scrollUp) => {
      zone.addEventListener('dragover', (e) => {
        if (!dragState.srcId) return;
        e.preventDefault();
        startAutoScroll(scrollUp);
      });

      zone.addEventListener('dragleave', () => {
        stopAutoScroll();
        dragState.activeScrollDirection = null;
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // dropping on zone does nothing, just let them release here
      });
    };

    attach(topZone, true);
    attach(bottomZone, false);

    // Show zones during drag, hide when done
    document.addEventListener('dragstart', () => {
      topZone.classList.add('drag-active');
      bottomZone.classList.add('drag-active');
    });
    document.addEventListener('dragend', () => {
      topZone.classList.remove('drag-active');
      bottomZone.classList.remove('drag-active');
      stopAutoScroll();
      dragState.activeScrollDirection = null;
    });
  }
  
  if (openSearch) {
    openSearch.addEventListener('click', () => {
      // If overlay is loaded on this page (chrome-extension://main.html), toggle directly
      if (window.__bmMainOverlay && typeof window.__bmMainOverlay.toggle === 'function') {
        window.__bmMainOverlay.toggle();
      } else {
        console.warn('[Main] Search overlay is unavailable on this page');
      }
    });
  }

  // Cmd/Ctrl+Shift+E to toggle overlay on Journey page only
  document.addEventListener('keydown', (e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd || !e.shiftKey || e.code !== 'KeyE') return;
    e.preventDefault();
    e.stopPropagation();
    if (window.__bmMainOverlay && typeof window.__bmMainOverlay.toggle === 'function') {
      window.__bmMainOverlay.toggle();
    }
  }, true);

  // process any pending persisted undo snapshots after DOM ready
  try{ if (typeof UndoPersist !== 'undefined' && UndoPersist.processPending) { UndoPersist.processPending(); } }catch(e){ console.warn('UndoPersist.processPending() failed', e); }

  render();

  // Setup scroll zone handlers for auto-scroll regions
  setupScrollZoneHandlers();

  // Setup keyboard navigation for bookmark lists
  function setupKeyboardNavigation() {
    // Check if KeyboardNavigation utility is available
    if (typeof KeyboardNavigation === 'undefined') {
      console.warn('KeyboardNavigation utility not loaded');
      return;
    }
    
    // For each folder section content, set up arrow key navigation
    document.querySelectorAll('.folder-section__content').forEach(contentContainer => {
      if (!contentContainer.getAttribute('data-kbd-nav-initialized')) {
        KeyboardNavigation.setupListNavigation(contentContainer, '.bookmarks-gallery-view', {
          focusClass: 'bm-focused',
          onItemFocus: (item) => {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
        contentContainer.setAttribute('data-kbd-nav-initialized', 'true');
      }
    });
  }

  // Setup keyboard navigation after rendering
  setupKeyboardNavigation();

  // render widgets area
  try{ if (typeof WidgetsService !== 'undefined') await WidgetsService.render('widgets-container'); }catch(e){ console.warn('Widgets render failed', e); }

  // render tab groups area
  try{ 
    if (typeof TabGroupsService !== 'undefined') {
      const tabGroups = await chrome.tabGroups.query({});
      const tabGroupsSection = document.getElementById('tab-groups-section');
      if (tabGroupsSection) {
        if (tabGroups && tabGroups.length > 0) {
          tabGroupsSection.style.display = 'none';
        } else {
          tabGroupsSection.style.display = 'none';
        }
      }
    }
  }catch(e){ console.warn('TabGroups render failed', e); }

  // Initialize theming and backgrounds
  try{ if (typeof ThemesService !== 'undefined') await ThemesService.init(); }catch(e){ console.warn('Themes init failed', e); }
  try{ if (typeof BackgroundsService !== 'undefined') await BackgroundsService.init(); }catch(e){ console.warn('Backgrounds init failed', e); }
  try{ if (typeof ShaderService !== 'undefined') await ShaderService.init(); }catch(e){ console.warn('Shader init failed', e); }

  // Personalize button handler
  const personalizeBtn = document.getElementById('personalize-btn');
  if (personalizeBtn && typeof ThemeSettingsModal !== 'undefined') {
    personalizeBtn.addEventListener('click', () => {
      ThemeSettingsModal.show();
    });
  }

  // App menu handler
  const appMenuBtn = document.getElementById('app-menu-btn');
  const appMenuShell = appMenuBtn ? appMenuBtn.closest('.topbar__menu-shell') : null;

  if (appMenuBtn && appMenuShell) {
    let appMenu = null;

    const closeAppMenu = () => {
      if (appMenu) {
        appMenu.remove();
        appMenu = null;
      }
      appMenuBtn.setAttribute('aria-expanded', 'false');
    };

    const openAppMenu = () => {
      if (typeof createSelectionMenu !== 'function') {
        return;
      }

      appMenu = createSelectionMenu({
        type: 'sort',
        contrast: 'low',
        selectedIndex: -1,
        showHeader: false,
        showSelectionIndicator: false,
        items: [
          {
            label: 'Changelog',
            description: 'See what changed in the latest versions'
          },
          {
            label: 'About',
            description: 'Product credits and project info'
          }
        ],
        onSelect: (index) => {
          closeAppMenu();
          if (index === 0 && typeof ChangelogModal !== 'undefined') {
            ChangelogModal.show();
            return;
          }
          if (index === 1 && typeof AboutModal !== 'undefined') {
            AboutModal.show();
          }
        }
      });

      appMenu.classList.add('topbar__app-menu');
      appMenu.setAttribute('role', 'menu');
      appMenu.querySelectorAll('.selection-menu__item').forEach((item) => {
        item.setAttribute('role', 'menuitem');
      });
      appMenuShell.appendChild(appMenu);
      appMenuBtn.setAttribute('aria-expanded', 'true');
      setTimeout(() => {
        appMenu?.querySelector('.selection-menu__item')?.focus();
      }, 0);
    };

    appMenuBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!appMenu) {
        openAppMenu();
      } else {
        closeAppMenu();
      }
    });

    document.addEventListener('click', (event) => {
      if (!appMenu) return;
      if (!appMenu.contains(event.target) && event.target !== appMenuBtn && !appMenuBtn.contains(event.target)) {
        closeAppMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && appMenu) {
        closeAppMenu();
        appMenuBtn.focus();
      }
    });
  }

  // Unsplash Attribution Modal - Initialize button and handler
  try {
    if (typeof UnsplashAttributionModal !== 'undefined') {
      // Set initial button visibility
      await UnsplashAttributionModal.updateButtonVisibility();

      // Wire up click handler
      const attributionBtn = document.getElementById('unsplash-attribution-btn');
      if (attributionBtn) {
        attributionBtn.addEventListener('click', () => {
          UnsplashAttributionModal.show();
        });
      }

      // Watch for background changes and update button visibility
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes.backgroundSettings) {
          UnsplashAttributionModal.updateButtonVisibility();
        }
      });
    }
  } catch (e) {
    console.warn('Unsplash attribution modal initialization failed:', e);
  }

  // Global Add Bookmark handled by bookmarks action bar

  // Initialize Left Panel
  try {
    if (typeof LeftPanelUI !== 'undefined' && typeof LeftPanelService !== 'undefined') {
      await LeftPanelUI.init({
        onPanelToggle: (isOpen) => {
          console.log('Left panel toggled:', isOpen);
        },
        onFolderSelected: (folderId) => {
          if (folderId) {
            window.showBookmarksInFolder(folderId);
          } else {
            window.clearFolderFilter();
          }
        }
      });

      // Keyboard shortcut: Ctrl+Shift+F (Cmd+Shift+F on Mac) to toggle left panel
      window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          LeftPanelUI.handlePanelToggle();
        }
      });
    }
  } catch (e) {
    console.warn('Left panel initialization failed:', e);
  }

  // ============================================
  // RIGHT PANEL - ACTIVE TABS
  // ============================================
  try {
    if (typeof RightPanelUI !== 'undefined' && typeof RightPanelService !== 'undefined') {
      // Initialize right panel
      await RightPanelUI.init();

      // Keyboard shortcut: Ctrl+Shift+S (Cmd+Shift+S on Mac) to toggle right panel
      window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          RightPanelUI.handlePanelToggle();
        }
      });
    }
  } catch (e) {
    console.warn('Right panel initialization failed:', e);
  }

  // Helper: Jump to folder by ID
  window.jumpToFolder = function(folderId) {
    const targetEl = document.getElementById(`folder-${folderId}`);
    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Filter main view to show only a specific folder
  window.showBookmarksInFolder = async function(folderId) {
    currentFolderFilter = folderId;
    await render(false);
  };

  // Clear folder filter and show normal view
  window.clearFolderFilter = async function() {
    currentFolderFilter = null;
    await render(false);
  };

  window.addEventListener('bmg:bookmarks-mutated', async (event) => {
    if (!event || !event.detail) return;
    if (event.detail.source === 'save-session') {
      await render(true);
    }
  });

  if (addWidgetBtn){ addWidgetBtn.addEventListener('click', async ()=>{
    const pick = await Modal.openWidgetPicker();
    if (!pick) return;
    await WidgetsService.addWidgetToFirstEmpty(pick);
    await WidgetsService.render('widgets-container');
  }); }

  // Listen for save session modal request from content overlay
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'OPEN_SAVE_SESSION_MODAL' && request.tabs) {
      console.log('[Main] Opening save session modal with', request.tabs.length, 'tabs');
      if (typeof SaveTabsModal !== 'undefined') {
        (async () => {
          try {
            const result = await SaveTabsModal.show(request.tabs);
            sendResponse({ success: true, saved: Boolean(result) });
          } catch (error) {
            console.error('[Main] SaveTabsModal failed', error);
            sendResponse({ success: false, error: error && error.message ? error.message : 'Save failed' });
          }
        })();
        return true;
      } else {
        console.error('[Main] SaveTabsModal not available');
        sendResponse({ success: false, error: 'SaveTabsModal not available' });
      }
    } else if (request.type === 'TOGGLE_MAIN_OVERLAY') {
      if (window.__bmMainOverlay && typeof window.__bmMainOverlay.toggle === 'function') {
        window.__bmMainOverlay.toggle();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Main overlay not available' });
      }
    }
  });});