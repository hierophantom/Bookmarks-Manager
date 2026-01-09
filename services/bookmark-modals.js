const BookmarkModals = (()=>{
  async function addBookmark(folderId){
    console.log('[BookmarkModals] addBookmark - opening form for folderId:', folderId);
    const data = await Modal.openBookmarkForm({});
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
    
    const data = await Modal.openBookmarkForm({ id, title: info.title, url: info.url, tags });
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
      chrome.bookmarks.update(id, updateObj, updated => {
        if (chrome.runtime.lastError) {
          console.error('[BookmarkModals] editBookmark - update failed:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('[BookmarkModals] editBookmark - bookmark updated');
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
    return Promise.all(creates);
  }

  async function editFolder(folderId){
    const info = await BookmarksService.getBookmark(folderId);
    const data = await Modal.openFolderForm({ title: info.title });
    if (!data) return null;
    return new Promise((res,reject)=>{
      chrome.bookmarks.update(folderId, { title: data.title }, updated=>{
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(updated);
      });
    });
  }

  return { addBookmark, editBookmark, addTabs, editFolder };
})();
