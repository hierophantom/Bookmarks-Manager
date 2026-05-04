const BookmarkModals = (()=>{
  async function addBookmark(folderId){
    console.log('[BookmarkModals] addBookmark - opening form for folderId:', folderId);
    const data = await Modal.openBookmarkForm({}, { showTabsSuggestions: true });
    console.log('[BookmarkModals] addBookmark - form returned:', data);
    if (!data) {
      console.log('[BookmarkModals] addBookmark - cancelled');
      return null;
    }
    
    const createObj = { parentId: folderId, title: data.title };
    if (data.url) createObj.url = data.url;
    
    console.log('[BookmarkModals] addBookmark - creating bookmark:', createObj);
    return new Promise((res, reject) => {
      chrome.bookmarks.create(createObj, async (node) => {
        if (chrome.runtime.lastError) {
          console.error('[BookmarkModals] addBookmark - create failed:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        console.log('[BookmarkModals] addBookmark - bookmark created with id:', node.id);
        try {
          if (node && node.id && Array.isArray(data.tags) && data.tags.length > 0) {
            console.log('[BookmarkModals] addBookmark - saving tags:', data.tags);
            await TagsService.setTags(node.id, data.tags);
            console.log('[BookmarkModals] addBookmark - tags saved successfully');
          } else {
            console.log('[BookmarkModals] addBookmark - no tags to save', {
              hasNode: !!node,
              hasNodeId: !!(node && node.id),
              tagsArray: Array.isArray(data.tags),
              tagsLength: data.tags ? data.tags.length : 0,
              tags: data.tags
            });
          }
          UndoService.show('Bookmark added', async () => {
            await BookmarksService.removeBookmark(node.id);
            window.dispatchEvent(new CustomEvent('bookmark-manager:bookmarks-changed'));
          });
          res(node);
        } catch (e) {
          console.error('[BookmarkModals] addBookmark - error saving tags:', e);
          reject(e);
        }
      });
    });
  }

  async function editBookmark(id){
    console.log('[BookmarkModals] editBookmark - loading bookmark:', id);
    const info = await BookmarksService.getBookmark(id);
    const tags = await TagsService.getTags(id);
    console.log('[BookmarkModals] editBookmark - bookmark info:', info);
    console.log('[BookmarkModals] editBookmark - current tags:', tags);
    
    const data = await Modal.openBookmarkForm({ id, title: info.title, url: info.url, tags }, { showTabsSuggestions: false });
    console.log('[BookmarkModals] editBookmark - form returned:', data);
    if (!data) {
      console.log('[BookmarkModals] editBookmark - cancelled');
      return null;
    }
    
    // Save tags
    console.log('[BookmarkModals] editBookmark - saving tags:', data.tags);
    await TagsService.setTags(id, data.tags || []);
    console.log('[BookmarkModals] editBookmark - tags saved');
    
    return new Promise((res, reject) => {
      const updateObj = { title: data.title };
      if (info.url) updateObj.url = data.url || '';
      console.log('[BookmarkModals] editBookmark - updating bookmark:', updateObj);
      const oldTitle = info.title;
      const oldUrl = info.url || '';
      const oldTags = tags || [];
      chrome.bookmarks.update(id, updateObj, updated => {
        if (chrome.runtime.lastError) {
          console.error('[BookmarkModals] editBookmark - update failed:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('[BookmarkModals] editBookmark - bookmark updated');
          UndoService.show('Bookmark updated', async () => {
            await TagsService.setTags(id, oldTags);
            await new Promise((r, rej) => {
              chrome.bookmarks.update(id, { title: oldTitle, url: oldUrl }, n => {
                if (chrome.runtime.lastError) rej(chrome.runtime.lastError); else r(n);
              });
            });
            window.dispatchEvent(new CustomEvent('bookmark-manager:bookmarks-changed'));
          });
          res(updated);
        }
      });
    });
  }

  async function addTabs(folderId){
    const tabs = await new Promise(res=>chrome.tabs.query({currentWindow:true}, t=>res(t)));
    if (!tabs || !tabs.length) return [];
    const selected = await Modal.openTabsPicker(tabs);
    if (!selected || !selected.length) return [];
    const creates = selected.map(t=>new Promise((res,reject)=>{
      chrome.bookmarks.create({ parentId: folderId, title: t.title||t.url, url: t.url }, node=>{
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(node);
      });
    }));
    const nodes = await Promise.all(creates);
    if (nodes.length > 0) {
      const label = nodes.length === 1 ? '1 tab added' : `${nodes.length} tabs added`;
      UndoService.show(label, async () => {
        await Promise.all(nodes.map(n => BookmarksService.removeBookmark(n.id)));
        window.dispatchEvent(new CustomEvent('bookmark-manager:bookmarks-changed'));
      });
    }
    return nodes;
  }

  async function editFolder(folderId){
    const info = await BookmarksService.getBookmark(folderId);
    const oldTitle = info.title;
    // Capture old customization for undo
    let oldCustomization = null;
    if (typeof FolderCustomizationService !== 'undefined') {
      try { oldCustomization = await FolderCustomizationService.get(folderId) || null; } catch(e) {}
    }

    const data = await Modal.openFolderForm({ title: info.title, folderId: folderId });
    if (!data) return null;
    
    // Save customization if provided
    if (data.customization && typeof FolderCustomizationService !== 'undefined') {
      await FolderCustomizationService.set(folderId, data.customization);
    } else if (data.customization === null && typeof FolderCustomizationService !== 'undefined') {
      // Remove customization if cleared
      await FolderCustomizationService.remove(folderId);
    }
    
    const updated = await new Promise((res,reject)=>{
      chrome.bookmarks.update(folderId, { title: data.title }, updated=>{
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(updated);
      });
    });

    UndoService.show('Folder updated', async () => {
      await new Promise((r, rej) => {
        chrome.bookmarks.update(folderId, { title: oldTitle }, n => {
          if (chrome.runtime.lastError) rej(chrome.runtime.lastError); else r(n);
        });
      });
      if (typeof FolderCustomizationService !== 'undefined') {
        if (oldCustomization) {
          await FolderCustomizationService.set(folderId, oldCustomization);
        } else {
          await FolderCustomizationService.remove(folderId);
        }
      }
      window.dispatchEvent(new CustomEvent('bookmark-manager:bookmarks-changed'));
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bookmark-manager:folder-updated', {
        detail: {
          folderId,
          title: data.title,
          customization: data.customization || null
        }
      }));
    }

    return updated;
  }

  async function addBookmarkGlobal(){
    console.log('[BookmarkModals] addBookmarkGlobal - opening form with folder selector');
    const data = await Modal.openBookmarkForm({}, { showFolderSelector: true, showTabsSuggestions: true });
    console.log('[BookmarkModals] addBookmarkGlobal - form returned:', data);
    if (!data) {
      console.log('[BookmarkModals] addBookmarkGlobal - cancelled');
      return null;
    }
    
    const createObj = { parentId: data.folderId || '1', title: data.title };
    if (data.url) createObj.url = data.url;
    
    console.log('[BookmarkModals] addBookmarkGlobal - creating bookmark:', createObj);
    return new Promise((res, reject) => {
      chrome.bookmarks.create(createObj, async (node) => {
        if (chrome.runtime.lastError) {
          console.error('[BookmarkModals] addBookmarkGlobal - create failed:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        
        console.log('[BookmarkModals] addBookmarkGlobal - bookmark created with id:', node.id);
        try {
          if (node && node.id && Array.isArray(data.tags) && data.tags.length > 0) {
            console.log('[BookmarkModals] addBookmarkGlobal - saving tags:', data.tags);
            await TagsService.setTags(node.id, data.tags);
            console.log('[BookmarkModals] addBookmarkGlobal - tags saved successfully');
          }
          UndoService.show('Bookmark added', async () => {
            await BookmarksService.removeBookmark(node.id);
            window.dispatchEvent(new CustomEvent('bookmark-manager:bookmarks-changed'));
          });
          res(node);
        } catch (e) {
          console.error('[BookmarkModals] addBookmarkGlobal - error saving tags:', e);
          reject(e);
        }
      });
    });
  }

  return { addBookmark, editBookmark, addTabs, editFolder, addBookmarkGlobal };
})();
