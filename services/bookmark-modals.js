const BookmarkModals = (()=>{
  async function addBookmark(folderId){
    const data = await Modal.openBookmarkForm({});
    if (!data) return null;
    
    const createObj = { parentId: folderId, title: data.title };
    if (data.url) createObj.url = data.url;
    
    return new Promise((res, reject) => {
      chrome.bookmarks.create(createObj, async (node) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        try {
          if (node && node.id && Array.isArray(data.tags) && data.tags.length > 0) {
            await TagsService.setTags(node.id, data.tags);
          }
          res(node);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async function editBookmark(id){
    const info = await BookmarksService.getBookmark(id);
    const tags = await TagsService.getTags(id);
    const data = await Modal.openBookmarkForm({ id, title: info.title, url: info.url, tags });
    if (!data) return null;
    
    // Save tags
    await TagsService.setTags(id, data.tags || []);
    
    return new Promise((res, reject) => {
      const updateObj = { title: data.title };
      if (info.url) updateObj.url = data.url || '';
      chrome.bookmarks.update(id, updateObj, updated => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
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
