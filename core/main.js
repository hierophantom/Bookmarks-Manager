document.addEventListener('DOMContentLoaded', async () => {
  // Ensure page itself is focused so keyboard shortcuts work immediately on new tab
  if (document.body) {
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
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
      if (quoteText) quoteText.textContent = `"${quote.text}"`;
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

  function createMaterialIcon(name) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = name;
    return icon;
  }

  function createFaviconIcon(url) {
    const img = document.createElement('img');
    img.className = 'bookmark-favicon bookmarks-gallery-view__favicon';
    img.src = FaviconService.getFaviconUrl(url, 24);
    img.alt = '';
    return img;
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
    }

    function openMenu() {
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

  function initBookmarksActions() {
    if (!bookmarksActionsLeft || !bookmarksActionsRight || !bookmarksActionsSettings) return;

    const searchComp = createSearchComp({
      placeholder: 'Search bookmarks...',
      contrast: 'low',
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
      state: 'idle'
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

    function getSortIndex() {
      const index = sortValues.findIndex(option => option.value === currentSort);
      return index === -1 ? 0 : index;
    }

    function updateSortFieldLabel() {
      const selected = sortValues.find(option => option.value === currentSort) || sortValues[0];
      updateSelectionFieldLabel(sortField, `Sort by: ${selected.label}`);
    }

    const sortField = createSelectionField({
      label: 'Sort by: Default',
      contrast: 'low',
      state: 'idle'
    });
    updateSortFieldLabel();

    const viewField = createSelectionField({
      label: 'View as: Gallery',
      contrast: 'low',
      state: 'idle'
    });
    viewField.style.width = '136px';

    bookmarksActionsLeft.appendChild(tagField);
    bookmarksActionsLeft.appendChild(sortField);
    bookmarksActionsLeft.appendChild(viewField);

    function updateTagFieldLabel() {
      if (!tagField) return;
      const label = currentFilterTags.length > 0
        ? `${currentFilterTags.length} tags selected`
        : 'Filter by tag';
      updateSelectionFieldLabel(tagField, label);
      applySelectionFieldState(tagField, currentFilterTags.length > 0 ? 'selection' : 'idle');
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
        onSelect: (index) => {
          const selection = sortValues[index];
          currentSort = selection ? selection.value : 'none';
          updateSortFieldLabel();
          render(true);
        }
      });
    }, () => {
      updateSortFieldLabel();
      applySelectionFieldState(sortField, 'idle');
    });

    const settingsButton = createActionButton({
      icon: createMaterialIcon('settings'),
      label: 'Settings',
      tooltip: 'Settings'
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
          if (typeof LeftPanelUI !== 'undefined') {
            LeftPanelUI.handlePanelToggle();
          }
        }
      });
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
          if (typeof RightPanelUI !== 'undefined') {
            RightPanelUI.handlePanelToggle();
          }
        }
      });
      bookmarksFloatingRight.appendChild(floatingRight);

      // Add tooltip
      if (typeof createTooltip !== 'undefined') {
        createTooltip({
          text: `Active Tabs\n${modifierKey}+Shift+S`,
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

  initBookmarksActions();

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

  // Arrow keys navigate pages
  window.addEventListener('keydown', (e) => {
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

  // Tag filtering state handled by selection field menu

  // Render version to avoid stale async writes
  let renderVersion = 0;

  // Text search is handled by search component listeners

  async function render(preserveScroll = false) {
    const thisRender = ++renderVersion;
    const savedScrollY = preserveScroll ? window.scrollY : 0;
    const renderedFolderIds = new Set();
    
    root.innerHTML = '';

    let tree;
    try{
      tree = await BookmarksService.getTree();
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

    // Add hidden folders indicator if any
    if (hiddenFolderIds.size > 0) {
      const hiddenIndicator = document.createElement('div');
      hiddenIndicator.className = 'bookmarks-hidden-indicator';

      const indicatorText = document.createElement('div');
      indicatorText.className = 'bookmarks-hidden-indicator__text';
      indicatorText.textContent = `Hidden Folders (${hiddenFolderIds.size})`;

      const showAllBtn = createCommonButton({
        label: 'Show All',
        contrast: 'low',
        onClick: async () => {
          await Storage.set({ hiddenFolders: [] });
          await render(true);
        }
      });

      hiddenIndicator.appendChild(indicatorText);
      hiddenIndicator.appendChild(showAllBtn);
      root.appendChild(hiddenIndicator);
    }

    // Get filter values
    let filterText = (textSearchInput && textSearchInput.value.trim().toLowerCase()) || '';
    const filterActive = (currentFilterTags && currentFilterTags.length > 0) || !!filterText;

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
        if (!parent.url) {
          parts.push(parent.title || parent.id);
        }
        parentId = parent.parentId;
      }
      return parts.reverse().join(' / ');
    }

    // Flat search results mode: when filtering, render only matching bookmarks without folder sections
    if (filterActive) {
      const matches = [];
      const seen = new Set();
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
          if (currentFilterTags && currentFilterTags.length > 0) {
            const tags = await TagsService.getTags(node.id);
            const anyMatch = currentFilterTags.some(t => tags.includes(t));
            if (!anyMatch) return;
          }
          if (!seen.has(node.id)) { seen.add(node.id); matches.push(node); }
        }
        if (node.children && node.children.length) {
          for (const c of node.children) await collectMatches(c);
        }
      }
      await collectMatches(tree && tree[0] ? tree[0] : null);
      if (thisRender !== renderVersion) return;

      const results = currentSort.startsWith('bookmarks-') ? sortBookmarks(matches) : matches;
      const items = [];

      for (const child of results) {
        if (thisRender !== renderVersion) return;
        const labelAction = createCubeActionButton({
          icon: 'label',
          label: 'Tags',
          tooltip: 'Tags',
          onClick: (event) => {
            event.stopPropagation();
            BookmarksService.editBookmarkPrompt(child.id).then(() => render(true));
          }
        });
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
          icon: 'close',
          label: 'Remove',
          tooltip: 'Remove',
          colorScheme: 'destructive',
          onClick: (event) => {
            event.stopPropagation();
            (async () => {
              const info = await BookmarksService.getBookmark(child.id);
              if (!info) return;
              if (!confirm('Delete this bookmark?')) return;
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
          subtext: urlHost,
          icon: createFaviconIcon(child.url),
          actions: [labelAction, editAction, deleteAction],
          idleActions: [labelAction]
        });
        tile.dataset.id = child.id;
        tile.draggable = true;
        tile.addEventListener('click', () => {
          chrome.tabs.create({ url: child.url });
        });
        addDragHandlers(tile);
        items.push(tile);
      }

      const section = createFolderSection({
        state: 'idle',
        items,
        breadcrumbItems: [{ label: `Results (${results.length})`, type: 'current' }],
        actions: []
      });
      section.dataset.folderId = 'results';
      root.appendChild(section);

      const content = section.querySelector('.folder-section__content');
      if (content) {
        addFolderDropHandlers(content, 'results');
      }
      FaviconService.attachErrorHandlers(section);
      setupKeyboardNavigation();

      if (preserveScroll) {
        requestAnimationFrame(() => { window.scrollTo(0, savedScrollY); });
      }
      return;
    }

    function buildBreadcrumbItems(folderId) {
      const items = [];
      let node = idToNode.get(folderId);
      while (node) {
        if (!node.url) {
          items.unshift(node);
        }
        if (!node.parentId) break;
        node = idToNode.get(node.parentId);
      }
      if (!items.length && idToNode.get(folderId)) {
        items.push(idToNode.get(folderId));
      }
      return items.map((entry, index) => ({
        label: entry.title || entry.id,
        type: index === items.length - 1 ? 'current' : 'root'
      }));
    }

    function createBookmarkTile(child) {
      const labelAction = createCubeActionButton({
        icon: 'label',
        label: 'Tags',
        tooltip: 'Tags',
        onClick: (event) => {
          event.stopPropagation();
          BookmarksService.editBookmarkPrompt(child.id).then(() => render(true));
        }
      });
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
        icon: 'close',
        label: 'Remove',
        tooltip: 'Remove',
        colorScheme: 'destructive',
        onClick: (event) => {
          event.stopPropagation();
          (async () => {
            if (!confirm('Delete this bookmark?')) return;
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
        subtext: urlHost,
        icon: createFaviconIcon(child.url),
        idleActions: [labelAction],
        showIdleActions: true
      });

      const actionsContainer = tile.querySelector('.bookmarks-gallery-view__actions');
      if (actionsContainer) {
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
      tile.addEventListener('click', () => {
        chrome.tabs.create({ url: child.url });
      });
      addDragHandlers(tile);
      return tile;
    }

    function createFolderTile(child) {
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
        icon: 'close',
        label: 'Remove',
        tooltip: 'Remove',
        colorScheme: 'destructive',
        onClick: (event) => {
          event.stopPropagation();
          (async () => {
            if (!confirm('Delete this folder and all its contents?')) return;
            await BookmarksService.deleteWithUndo(child.id);
            await render(true);
          })();
        }
      });

      const childCount = (child.children && child.children.length) || 0;
      const tile = createBookmarksGalleryView({
        type: 'folder',
        state: 'idle',
        label: child.title || 'Folder',
        count: `${childCount} items`,
        icon: 'folder',
        idleActions: [editAction, deleteAction],
        showIdleActions: false
      });

      tile.dataset.id = child.id;
      tile.draggable = true;
      tile.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        const targetEl = document.getElementById(`folder-${child.id}`);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
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

      if (folder.children && folder.children.length) {
        const childFolders = folder.children.filter(c => !c.url);
        const childBookmarks = folder.children.filter(c => c.url);

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
                if (currentFilterTags && currentFilterTags.length > 0) {
                  const tags = await TagsService.getTags(child.id);
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

        const sortedFolders = sortFolders(childFolders);
        const sortedBookmarks = sortBookmarks(childBookmarks);
        const sortedChildren = [...sortedFolders, ...sortedBookmarks];
        const seenChildFolderIds = new Set();

        for (const child of sortedChildren) {
          if (currentFilterTags && currentFilterTags.length > 0 && child.url) {
            const tags = await TagsService.getTags(child.id);
            const anyMatch = currentFilterTags.some(t => tags.includes(t));
            if (!anyMatch) continue;
          }
          if (filterText && child.url) {
            const title = (child.title || '').toLowerCase();
            const url = (child.url || '').toLowerCase();
            if (!title.includes(filterText) && !url.includes(filterText)) continue;
          }

          if (child.url) {
            items.push(createBookmarkTile(child));
          } else {
            if (seenChildFolderIds.has(child.id)) continue;
            seenChildFolderIds.add(child.id);
            items.push(createFolderTile(child));
          }
        }
      }

      // Check if this is a root-level folder (direct child of Bookmarks Bar or Other Bookmarks)
      const isRootFolder = folder.parentId === '1' || folder.parentId === '2';

      // Create folder section actions
      const folderActions = [];
      const tooltipData = []; // Store tooltip info separately

      // Hide (only for root folders)
      if (isRootFolder) {
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
            if (bookmarksToOpen.length > 10 && !confirm(`Open ${bookmarksToOpen.length} bookmarks?`)) {
              return;
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
          const data = await Modal.openBookmarkForm({ folderId: folder.id });
          if (data) {
            await BookmarksService.create(data.title, data.url, folder.id);
            if (data.tags && data.tags.length) {
              const newBookmarks = await chrome.bookmarks.getChildren(folder.id);
              const lastBookmark = newBookmarks[newBookmarks.length - 1];
              if (lastBookmark) {
                await TagsService.setTags(lastBookmark.id, data.tags);
              }
            }
            await render(true);
          }
        }
      });
      folderActions.push(addBookmarkBtn);
      tooltipData.push('Add bookmark to folder');

      // Delete (only for root folders)
      if (isRootFolder) {
        const deleteBtn = createCubeActionButton({
          icon: 'close',
          label: 'Remove',
          colorScheme: 'destructive',
          onClick: async (event) => {
            event.stopPropagation();
            if (!confirm(`Delete folder "${folder.title}" and all its contents?`)) return;
            await BookmarksService.deleteWithUndo(folder.id);
            await render(true);
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
      section.dataset.folderId = folder.id;
      section.id = `folder-${folder.id}`;
      parentEl.appendChild(section);

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
        addFolderDropHandlers(content, folder.id);
      }
      FaviconService.attachErrorHandlers(section);

      if (folder.children && folder.children.length) {
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

    if (preserveScroll) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY);
      });
    }
  }

  function addDragHandlers(el) {
    // Improved handlers: support cross-folder moves and append-to-folder
    el.addEventListener('dragstart', (e) => {
      if (!el.dataset.id) return; // only draggable for real items
      e.dataTransfer.setData('text/bookmark-id', el.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('dragover'); });
    el.addEventListener('dragleave', () => { el.classList.remove('dragover'); });

    el.addEventListener('drop', async (e) => {
      e.preventDefault(); el.classList.remove('dragover');
      const srcId = e.dataTransfer.getData('text/bookmark-id');
      if (!srcId) return;
      // If dropping on an item, insert after that item; if dropping on add-button (no data-id), append to folder
      const dstId = el.dataset.id;
      try {
        if (dstId) {
          const dstInfo = await BookmarksService.getBookmark(dstId);
          if (!dstInfo) return;
          const parentId = dstInfo.parentId;
          const index = (typeof dstInfo.index === 'number') ? dstInfo.index + 1 : undefined;
          await new Promise((res,reject)=>{
            chrome.bookmarks.move(srcId, { parentId, index }, moved=>{ if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(moved); });
          });
        } else {
          const folderEl = el.closest('.folder-section');
          const folderId = folderEl && folderEl.dataset && folderEl.dataset.folderId;
          if (!folderId || folderId === 'results') return;
          const subtree = await BookmarksService.getSubTree(folderId);
          const count = (subtree.children && subtree.children.length) || 0;
          await new Promise((res,reject)=>{
            chrome.bookmarks.move(srcId, { parentId: folderId, index: count }, moved=>{ if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(moved); });
          });
        }
        await render(true);
      } catch (err) { console.error('drop move failed', err); }
    });
  }

  function addFolderDropHandlers(container, folderId) {
    if (!container) return;
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('dragover');
    });
    container.addEventListener('dragleave', () => {
      container.classList.remove('dragover');
    });
    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      container.classList.remove('dragover');
      const srcId = e.dataTransfer.getData('text/bookmark-id');
      if (!srcId || folderId === 'results') return;
      try {
        const subtree = await BookmarksService.getSubTree(folderId);
        const count = (subtree.children && subtree.children.length) || 0;
        await new Promise((res,reject)=>{
          chrome.bookmarks.move(srcId, { parentId: folderId, index: count }, moved=>{ if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(moved); });
        });
        await render(true);
      } catch (err) { console.error('drop append failed', err); }
    });
  }
  
  if (openSearch) {
    openSearch.addEventListener('click', () => {
      // If overlay is loaded on this page (chrome-extension://main.html), toggle directly
      if (window.__bmMainOverlay && typeof window.__bmMainOverlay.toggle === 'function') {
        window.__bmMainOverlay.toggle();
        return;
      }
      // Otherwise delegate to background to use last eligible http/https tab
      chrome.runtime.sendMessage({ type: 'TOGGLE_OVERLAY_FROM_UI' }, () => {});
    });
  }

  // process any pending persisted undo snapshots after DOM ready
  try{ if (typeof UndoPersist !== 'undefined' && UndoPersist.processPending) { UndoPersist.processPending(); } }catch(e){ console.warn('UndoPersist.processPending() failed', e); }

  render();

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
          tabGroupsSection.style.display = '';
          await TabGroupsService.render('tab-groups-container');
        } else {
          tabGroupsSection.style.display = 'none';
        }
      }
    }
  }catch(e){ console.warn('TabGroups render failed', e); }

  // Initialize theming and backgrounds
  try{ if (typeof ThemesService !== 'undefined') await ThemesService.init(); }catch(e){ console.warn('Themes init failed', e); }
  try{ if (typeof BackgroundsService !== 'undefined') await BackgroundsService.init(); }catch(e){ console.warn('Backgrounds init failed', e); }

  // Personalize button handler
  const personalizeBtn = document.getElementById('personalize-btn');
  if (personalizeBtn && typeof ThemeSettingsModal !== 'undefined') {
    personalizeBtn.addEventListener('click', () => {
      ThemeSettingsModal.show();
    });
  }

  // Global Add Bookmark handled by bookmarks action bar

  // Initialize Left Panel
  try {
    if (typeof LeftPanelUI !== 'undefined' && typeof LeftPanelService !== 'undefined') {
      await LeftPanelUI.init({
        onPanelToggle: (isOpen) => {
          console.log('Left panel toggled:', isOpen);
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
        SaveTabsModal.show(request.tabs);
        sendResponse({ success: true });
      } else {
        console.error('[Main] SaveTabsModal not available');
        sendResponse({ success: false, error: 'SaveTabsModal not available' });
      }
    }
  });});