document.addEventListener('DOMContentLoaded', async () => {
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
  const quoteContainer = document.getElementById('daily-quote-container');
  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');

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
        quoteAuthor.textContent = `— ${authorName}`;
        quoteAuthor.href = wikipediaUrl;
        quoteAuthor.style.cursor = 'pointer';
        quoteAuthor.addEventListener('mouseenter', () => {
          quoteAuthor.style.textDecoration = 'underline';
        });
        quoteAuthor.addEventListener('mouseleave', () => {
          quoteAuthor.style.textDecoration = 'none';
        });
      }
      if (quoteContainer) quoteContainer.style.display = 'block';
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

  // Page navigation setup
  const pageContainer = document.getElementById('page-container');
  const pages = Array.from(document.querySelectorAll('.page'));
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
  let activePageIndex = 0;
  let lastPageIndex = 0;

  function updatePageVisibility() {
    pages.forEach((page, idx) => {
      const isActive = idx === activePageIndex;
      page.classList.toggle('active', isActive);
      page.style.display = isActive ? 'block' : 'none';
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
  let currentSort = 'none';
  const sortDropdown = document.getElementById('sort-dropdown');
  if (sortDropdown) {
    currentSort = sortDropdown.value || 'none';
    sortDropdown.addEventListener('change', () => {
      currentSort = sortDropdown.value;
      render(true);
    });
  }

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

  async function render(preserveScroll = false) {
    const savedScrollY = preserveScroll ? window.scrollY : 0;
    
    root.innerHTML = '';
    const errElId = '__bm_error';
    let errEl = document.getElementById(errElId);
    if (!errEl){ errEl = document.createElement('div'); errEl.id = errElId; errEl.style.color='crimson'; errEl.style.margin='8px 0'; root.parentNode && root.parentNode.insertBefore(errEl, root); }
    errEl.textContent = '';

    let tree;
    try{
      tree = await BookmarksService.getTree();
    }catch(e){
      console.error('Failed to load bookmarks', e);
      errEl.textContent = 'Failed to load bookmarks: ' + (e && e.message ? e.message : String(e));
      return;
    }
    // reconcile tags in background
    BookmarksService.reconcileTags().catch(()=>{});

    // Get hidden folders
    const hiddenFolders = await Storage.get('hiddenFolders') || [];
    const hiddenFolderIds = new Set(hiddenFolders);

    // Add hidden folders indicator if any
    if (hiddenFolderIds.size > 0) {
      const hiddenIndicator = document.createElement('div');
      hiddenIndicator.style.cssText = 'background:rgba(255,165,0,0.1);border:1px solid orange;padding:10px;border-radius:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;';
      hiddenIndicator.innerHTML = `<span>👁️‍🗨️ <strong>Hidden Folders (${hiddenFolderIds.size})</strong></span> <button id="unhide-all-btn" style="padding:6px 12px;border-radius:6px;border:1px solid orange;background:white;cursor:pointer;font-weight:600;">Show All</button>`;
      root.appendChild(hiddenIndicator);
      document.getElementById('unhide-all-btn').addEventListener('click', async () => {
        await Storage.set({ hiddenFolders: [] });
        await render(true);
      });
    }

    // Tag filter logic
    const tagFilterInput = document.getElementById('tag-filter');
    const tagListSpan = document.getElementById('tag-list');
    let filterTag = tagFilterInput && tagFilterInput.value.trim();
    if (tagListSpan && typeof TagsService !== 'undefined') {
      const allTags = await TagsService.getAllTags();
      tagListSpan.innerHTML = allTags.map(t=>`<button class="tag-pill" style="margin:0 2px 2px 0;padding:2px 8px;border-radius:12px;border:none;background:#eee;cursor:pointer">${t}</button>`).join('');
      tagListSpan.querySelectorAll('.tag-pill').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          if (tagFilterInput) tagFilterInput.value = btn.textContent;
          render(true);
        });
      });
    }

    // Helper function to render a folder and all its contents recursively
    async function renderFolder(folder, parentEl) {
      // Check if folder is hidden
      if (hiddenFolderIds.has(folder.id)) {
        return; // Skip rendering hidden folders
      }

      const sec = document.importNode(document.getElementById('folder-template').content, true);
      const section = sec.querySelector('.folder');
      section.dataset.folderId = folder.id;
      section.id = `folder-${folder.id}`;
      sec.querySelector('.folder-title').textContent = folder.title || folder.id;
      const slots = sec.querySelector('.slots');

      // folder-level controls
      const headerControls = document.createElement('div');
      headerControls.style.marginBottom = '8px';
      headerControls.className = 'folder-controls';
      
      // Determine which actions to show based on folder type
      const isBookmarksBar = folder.id === '1';
      const isMobileOrOther = folder.id === '2' || folder.id === '3';
      const showRename = !isBookmarksBar && !isMobileOrOther;
      const showDelete = !isBookmarksBar && !isMobileOrOther;
      const showHide = !isBookmarksBar;
      
      headerControls.innerHTML = `<button class="add-bookmark" title="Add new bookmark">📖 Add Bookmark</button> ${showRename ? '<button class="edit-folder" title="Rename folder">✏️ Rename</button>' : ''} <button class="open-all-tabs" title="Open all bookmarks in new tabs">📂 Open All</button> <button class="add-tabs" title="Add open tabs to folder">➕ Add Tabs</button> <button class="add-folder" title="Create subfolder">📁 Add Folder</button> ${showHide ? '<button class="hide-folder" title="Hide folder">👁️ Hide</button>' : ''} ${showDelete ? '<button class="del-folder" title="Delete folder">🗑️ Delete</button>' : ''}`;
      headerControls.querySelector('.add-bookmark').addEventListener('click', async ()=>{ await BookmarksService.createBookmarkPrompt(folder.id); await render(true); });
      const editBtn = headerControls.querySelector('.edit-folder');
      if (editBtn) editBtn.addEventListener('click', async ()=>{ await BookmarkModals.editFolder(folder.id); await render(true); });
      headerControls.querySelector('.add-tabs').addEventListener('click', async ()=>{ await BookmarkModals.addTabs(folder.id); await render(true); });
      headerControls.querySelector('.open-all-tabs').addEventListener('click', async ()=>{ try { if (folder.children && folder.children.length) { for (const child of folder.children) { if (child.url) await new Promise((res)=>{ chrome.tabs.create({url: child.url}, res); }); } } } catch (err) { console.error('Open all failed', err); } });
      headerControls.querySelector('.add-folder').addEventListener('click', async ()=>{ const data = await Modal.openFolderForm({ title: '' }); if (!data) return; await BookmarksService.createFolder(folder.id, data.title); await render(true); });
      const hideBtn = headerControls.querySelector('.hide-folder');
      if (hideBtn) hideBtn.addEventListener('click', async ()=>{ const hidden = await Storage.get('hiddenFolders') || []; if (!hidden.includes(folder.id)) hidden.push(folder.id); await Storage.set({ hiddenFolders: hidden }); await render(true); });
      const delBtn = headerControls.querySelector('.del-folder');
      if (delBtn) delBtn.addEventListener('click', async ()=>{ if (!confirm('Delete this folder and all its contents?')) return; await BookmarksService.removeFolder(folder.id); await render(true); });
      section.insertBefore(headerControls, slots);

      if (folder.children && folder.children.length) {
        console.log(`[Bookmarks] Folder "${folder.title}" has ${folder.children.length} children`, folder.children);
        
        // Separate folders and bookmarks
        const childFolders = folder.children.filter(c => !c.url);
        const childBookmarks = folder.children.filter(c => c.url);
        
        // Apply sorting
        const sortedFolders = sortFolders(childFolders);
        const sortedBookmarks = sortBookmarks(childBookmarks);
        
        // Render in order: folders first, then bookmarks
        const sortedChildren = [...sortedFolders, ...sortedBookmarks];
        
        await Promise.all(sortedChildren.map(async child => {
          if (filterTag) {
            const tags = await TagsService.getTags(child.id);
            if (!tags.includes(filterTag)) return;
          }
          const slot = document.createElement('div');
          slot.className = 'slot';
          slot.draggable = true;
          slot.dataset.id = child.id;
          
          if (child.url) {
            // Bookmark slot
            let tagHtml = '';
            let tagMarker = '';
            if (typeof TagsService !== 'undefined') {
              const tags = await TagsService.getTags(child.id);
              if (tags.length) { tagHtml = `<span class="bm-tag-list" style="margin-left:8px;color:#888;font-size:90%;">[${tags.join(', ')}]</span>`; tagMarker = `<span class="bm-tag-marker" title="Has tags"></span>`; }
            }
            slot.innerHTML = `${tagMarker}<a href="${child.url}" target="_blank">${child.title || child.url}</a> <button data-action="edit">Edit</button> <button data-action="del">Delete</button> ${tagHtml}`;
            slot.querySelectorAll('button').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const id = slot.dataset.id;
                if (action === 'edit') BookmarksService.editBookmarkPrompt(id).then(() => render(true));
                if (action === 'del') {
                  (async ()=>{ const info = await BookmarksService.getBookmark(id); if (!info) return; if (!info.url){ if (!confirm('Delete this folder and all its contents?')) return; await BookmarksService.deleteWithUndo(id); } else { if (!confirm('Delete this bookmark?')) return; await BookmarksService.deleteWithUndo(id); } await render(true); })();
                }
              });
            });
          } else {
            // Folder slot
            slot.classList.add('folder-slot');
            const childCount = (child.children && child.children.length) || 0;
            slot.innerHTML = `📁 <strong>${child.title || 'Folder'}</strong> <span class="folder-count">(${childCount})</span> <button data-action="jump">→</button> <button data-action="rename">✏️</button> <button data-action="del">🗑️</button>`;
            slot.style.cursor = 'pointer';
            slot.addEventListener('click', (e) => {
              if (e.target.closest('button')) return;
              const targetEl = document.getElementById(`folder-${child.id}`);
              if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            slot.querySelectorAll('button').forEach(btn => {
              btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (action === 'jump') {
                  const targetEl = document.getElementById(`folder-${child.id}`);
                  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                if (action === 'rename') {
                  await BookmarkModals.editFolder(child.id);
                  await render(true);
                }
                if (action === 'del') {
                  if (!confirm('Delete this folder and all its contents?')) return;
                  await BookmarksService.deleteWithUndo(child.id);
                  await render(true);
                }
              });
            });
          }
          addDragHandlers(slot);
          slots.appendChild(slot);
        }));
      }

      parentEl.appendChild(sec);

      // Recursively render subfolders as full sections
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
          // move to dst's parent, position after dst
          const dstInfo = await BookmarksService.getBookmark(dstId);
          if (!dstInfo) return;
          const parentId = dstInfo.parentId;
          const index = (typeof dstInfo.index === 'number') ? dstInfo.index + 1 : undefined;
          await new Promise((res,reject)=>{
            chrome.bookmarks.move(srcId, { parentId, index }, moved=>{ if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(moved); });
          });
        } else {
          // append to folder: find nearest folder container
          const folderEl = el.closest('.folder');
          const folderId = folderEl && folderEl.dataset && folderEl.dataset.folderId;
          if (!folderId) return;
          // compute new index as number of children in folder
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
  // tag filter input triggers render and autocomplete
  const tagFilterInput = document.getElementById('tag-filter');
  let tagDropdown;
  async function showTagDropdown() {
    if (!tagFilterInput) return;
    const val = tagFilterInput.value.trim().toLowerCase();
    if (!val) { if (tagDropdown) tagDropdown.style.display = 'none'; return; }
    const allTags = (typeof window.TagsService !== 'undefined' && window.TagsService.getAllTags) ? await window.TagsService.getAllTags() : [];
    const matches = allTags.filter(t => t.toLowerCase().includes(val) && t);
    if (!matches.length) { if (tagDropdown) tagDropdown.style.display = 'none'; return; }
    if (!tagDropdown) {
      tagDropdown = document.createElement('div');
      tagDropdown.className = 'bm-tag-dropdown';
      tagDropdown.style.position = 'absolute';
      tagDropdown.style.background = '#fff';
      tagDropdown.style.border = '1px solid #ccc';
      tagDropdown.style.zIndex = 100000;
      tagDropdown.style.minWidth = '120px';
      tagDropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      tagFilterInput.parentNode.appendChild(tagDropdown);
    }
    tagDropdown.innerHTML = matches.map(t => `<div class='bm-tag-suggestion' style='padding:4px 8px;cursor:pointer;'>${t}</div>`).join('');
    tagDropdown.style.display = 'block';
    tagDropdown.style.top = (tagFilterInput.offsetTop + tagFilterInput.offsetHeight) + 'px';
    tagDropdown.style.left = tagFilterInput.offsetLeft + 'px';
    tagDropdown.querySelectorAll('.bm-tag-suggestion').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        tagFilterInput.value = el.textContent;
        tagDropdown.style.display = 'none';
        render(true);
        tagFilterInput.focus();
      });
    });
  }
  if (tagFilterInput) {
    tagFilterInput.addEventListener('input', ()=>{ render(true); showTagDropdown(); });
    tagFilterInput.addEventListener('blur', () => { setTimeout(()=>{ if (tagDropdown) tagDropdown.style.display = 'none'; }, 150); });
  }
  if (openSearch) {
    openSearch.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
      }
    });
  }

  // process any pending persisted undo snapshots after DOM ready
  try{ if (typeof UndoPersist !== 'undefined' && UndoPersist.processPending) { UndoPersist.processPending(); } }catch(e){ console.warn('UndoPersist.processPending() failed', e); }

  render();

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

  // DEBUG FUNCTIONS
  window.debugCheckStorage = async function(){
    const output = document.getElementById('debug-output');
    output.innerHTML = '<span style="color:#666;">Checking storage...</span>';
    try {
      const all = await Storage.get('bookmarkTags');
      output.innerHTML = `<pre>${JSON.stringify(all, null, 2)}</pre>`;
    } catch (e) {
      output.innerHTML = `<span style="color:red;">Error: ${e.message}</span>`;
    }
  };

  window.debugViewTags = async function(){
    const output = document.getElementById('debug-output');
    output.innerHTML = '<span style="color:#666;">Loading all tags...</span>';
    try {
      const allTags = await TagsService.getAllTags();
      output.innerHTML = `<pre>All tags: ${JSON.stringify(allTags, null, 2)}</pre>`;
    } catch (e) {
      output.innerHTML = `<span style="color:red;">Error: ${e.message}</span>`;
    }
  };

  window.debugClearTags = async function(){
    const output = document.getElementById('debug-output');
    output.innerHTML = '<span style="color:#666;">Clearing all tags...</span>';
    try {
      await Storage.set({bookmarkTags: {}});
      output.innerHTML = '<span style="color:green;">✓ All tags cleared!</span>';
    } catch (e) {
      output.innerHTML = `<span style="color:red;">Error: ${e.message}</span>`;
    }
  };

  window.debugTestSave = async function(){
    const output = document.getElementById('debug-output');
    output.innerHTML = '<span style="color:#666;">Testing save...</span>';
    try {
      const testId = 'test-' + Date.now();
      const testTags = ['debug', 'test'];
      console.log('debugTestSave: calling setTags with', {testId, testTags});
      await TagsService.setTags(testId, testTags);
      
      const verify = await TagsService.getTags(testId);
      output.innerHTML = `<pre>Saved: ${JSON.stringify(testTags)}\nVerified: ${JSON.stringify(verify)}\nMatch: ${JSON.stringify(testTags) === JSON.stringify(verify)}</pre>`;
    } catch (e) {
      output.innerHTML = `<span style="color:red;">Error: ${e.message}</span>`;
    }
  };

  window.debugGetBookmarks = async function(){
    const output = document.getElementById('debug-output');
    output.innerHTML = '<span style="color:#666;">Loading bookmarks...</span>';
    try {
      const tree = await BookmarksService.getTree();
      const bookmarks = [];
      function walk(nodes) {
        if (!nodes) return;
        nodes.forEach(node => {
          if (node.url) bookmarks.push({id: node.id, title: node.title});
          if (node.children) walk(node.children);
        });
      }
      walk(tree);
      output.innerHTML = `<pre>Bookmarks found:\n${JSON.stringify(bookmarks, null, 2)}</pre>`;
    } catch (e) {
      output.innerHTML = `<span style="color:red;">Error: ${e.message}</span>`;
    }
  };

  // Attach debug button listeners
  const debugCheckBtn = document.getElementById('debug-check-storage');
  const debugViewBtn = document.getElementById('debug-view-tags');
  const debugClearBtn = document.getElementById('debug-clear-tags');
  const debugTestBtn = document.getElementById('debug-test-save');
  const debugBookmarksBtn = document.getElementById('debug-get-bookmarks');
  
  if (debugCheckBtn) debugCheckBtn.addEventListener('click', window.debugCheckStorage);
  if (debugViewBtn) debugViewBtn.addEventListener('click', window.debugViewTags);
  if (debugClearBtn) debugClearBtn.addEventListener('click', window.debugClearTags);
  if (debugTestBtn) debugTestBtn.addEventListener('click', window.debugTestSave);
  if (debugBookmarksBtn) debugBookmarksBtn.addEventListener('click', window.debugGetBookmarks);
});
