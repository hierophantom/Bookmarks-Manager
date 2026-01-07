// Persist undo snapshots so Undo can survive reloads
const UndoPersist = (()=>{
  const KEY = 'bm_undo_queue';
  const DEFAULT_TTL = 1000 * 60 * 60 * 24; // 24h

  async function _getAll(){
    const raw = await Storage.get(KEY) || [];
    return raw;
  }

  async function _setAll(list){
    return Storage.set({[KEY]: list});
  }

  async function saveSnapshot(snapshot, ttl = DEFAULT_TTL){
    const list = await _getAll();
    const id = 'undo_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    const entry = { id, snapshot, expires: Date.now() + ttl };
    list.push(entry);
    await _setAll(list);
    return id;
  }

  async function remove(id){
    const list = await _getAll();
    const next = list.filter(e=>e.id !== id);
    await _setAll(next);
  }

  async function getPending(){
    const list = await _getAll();
    const now = Date.now();
    const pending = list.filter(e=>e.expires > now);
    // cleanup expired
    const expired = list.filter(e=>e.expires <= now);
    if (expired.length) await _setAll(list.filter(e=>e.expires > now));
    return pending;
  }

  // show pending undos using UndoService; caller should call this after DOM ready
  async function processPending(){
    if (typeof UndoService === 'undefined' || typeof BookmarksService === 'undefined') return;
    const pending = await getPending();
    
    // Clear all pending entries on load (undo should only be available within same session)
    if (pending.length) {
      await _setAll([]);
    }
    
    // Don't show snackbars on page reload - they were already shown before
    // The snapshots are only useful if user can click undo before page reload
    // Once page reloads, the undo moment has passed
  }

  return { saveSnapshot, remove, getPending, processPending };
})();
