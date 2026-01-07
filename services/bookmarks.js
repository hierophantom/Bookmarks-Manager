const BookmarksService = (()=>{
  async function getTree(){
    return new Promise((res,reject)=>{
      chrome.bookmarks.getTree(tree=>{
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        res(tree);
      });
    });
  }
  async function getAllBookmarkIds(){
    const tree = await getTree();
    const ids = [];
    function walk(node){
      if (node.url) ids.push(node.id);
      if (node.children) node.children.forEach(walk);
    }
    walk(tree[0]);
    return ids;
  }
  async function reconcileTags(){
    if (typeof TagsService === 'undefined' || !TagsService.cleanupOrphans) return;
    try{
      const ids = await getAllBookmarkIds();
      await TagsService.cleanupOrphans(ids);
    }catch(e){ console.warn('reconcileTags failed', e); }
  }
  async function editBookmarkPrompt(id){
    return BookmarkModals.editBookmark(id);
  }
  async function createBookmarkPrompt(folderId){
    return BookmarkModals.addBookmark(folderId);
  }
  function getBookmark(id){
    return new Promise((res,reject)=>chrome.bookmarks.get(id, items=>{
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      res(items[0]);
    }));
  }
  function removeBookmark(id){
    return new Promise((res,reject)=>{
      chrome.bookmarks.remove(id, async ()=>{
        if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
        // reconcile tags after removal
        try{ await reconcileTags(); }catch(e){}
        res();
      });
    });
  }

  function createFolder(parentId, title){
    const obj = { title: title || 'New Folder' };
    if (parentId) obj.parentId = parentId;
    return new Promise((res,reject)=>{
      chrome.bookmarks.create(obj, node=>{ if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(node); });
    });
  }

  function removeFolder(folderId){
    return new Promise((res,reject)=>{
      chrome.bookmarks.removeTree(folderId, async ()=>{
        if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
        try{ await reconcileTags(); }catch(e){}
        res();
      });
    });
  }
  async function moveBookmark(srcId, dstId){
    // move src to be after dst in same parent
    const dst = await getBookmark(dstId);
    const dstParentId = dst.parentId;
    const dstIndex = dst.index;
    return new Promise((res,reject)=>{
      chrome.bookmarks.move(srcId, {parentId: dstParentId, index: dstIndex + 1}, moved=>{
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(moved);
      });
    });
  }

  // get subtree for a node (folder or bookmark)
  function getSubTree(id){
    return new Promise((res,reject)=>{
      chrome.bookmarks.getSubTree(id, tree=>{
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        res(tree[0]);
      });
    });
  }

  // restore a snapshot (subtree) captured via getSubTree
  async function restoreSnapshot(snapshot){
    // mapping from oldId -> newId
    const idMap = {};

    async function ensureParent(originalParentId){
      if (!originalParentId) return null;
      try{ const parent = await getBookmark(originalParentId); if (parent) return parent.id; }catch(e){}
      // fallback to root
      const tree = await getTree();
      return tree[0].id;
    }

    async function recreateNode(node, targetParentId){
      const createObj = { parentId: targetParentId, title: node.title };
      if (node.url) createObj.url = node.url;
      // try to preserve index when possible (append otherwise)
      if (typeof node.index === 'number') createObj.index = node.index;
      const created = await new Promise((res,reject)=>{
        chrome.bookmarks.create(createObj, n=>{ if (chrome.runtime.lastError) reject(chrome.runtime.lastError); else res(n); });
      });
      idMap[node.id] = created.id;
      if (node.children && node.children.length){
        for (const child of node.children){
          await recreateNode(child, created.id);
        }
      }
      return created;
    }

    const targetParent = await ensureParent(snapshot.parentId);
    const root = await recreateNode(snapshot, targetParent);
    return { root, idMap };
  }

  // delete with undo: snapshot nodes, remove, show undo toast
  async function deleteWithUndo(id){
    const snapshot = await getSubTree(id);
    // persist snapshot so undo survives reloads
    try{
      await UndoPersist.saveSnapshot(snapshot);
    }catch(e){ console.warn('Failed to persist undo snapshot', e); }
    // perform removal
    if (snapshot.url){
      await removeBookmark(id);
    } else {
      await removeFolder(id);
    }
    // show undo prompt (also remove persisted entry if undone)
    try{
      const message = snapshot.url ? `Bookmark "${snapshot.title || snapshot.url}" deleted` : `Folder "${snapshot.title || ''}" deleted`;
      const idPromise = (async ()=>{
        // find the persisted id for this snapshot (best-effort match)
        try{ const list = await UndoPersist.getPending();
          const found = list.find(e=>e.snapshot && e.snapshot.id === snapshot.id && e.snapshot.title === snapshot.title);
          return found ? found.id : null;
        }catch(e){ return null; }
      })();
      UndoService.show(message, async ()=>{
        try{ await restoreSnapshot(snapshot); }catch(e){ console.error('Undo restore failed', e); }
        try{ const pid = await idPromise; if (pid) await UndoPersist.remove(pid); }catch(e){}
      }, 5000);
    }catch(e){ console.warn('Undo UI failed', e); }
  }
  const api = { getTree, getAllBookmarkIds, reconcileTags, editBookmarkPrompt, createBookmarkPrompt, removeBookmark, createFolder, removeFolder, moveBookmark, getBookmark, getSubTree, restoreSnapshot, deleteWithUndo };
  if (typeof window !== 'undefined') window.BookmarksService = api;
  return api;
})();
