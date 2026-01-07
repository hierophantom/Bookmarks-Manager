const TagsService = (()=>{
  const STORAGE_KEY = 'bookmarkTags';
  
  async function getAll(){
    const data = await Storage.get(STORAGE_KEY) || {};
    console.log('TagsService.getAll: retrieved', data);
    return data;
  }
  
  async function setAll(map){
    console.log('TagsService.setAll: writing to storage', {STORAGE_KEY, data: map});
    const writeObj = {[STORAGE_KEY]: map};
    console.log('TagsService.setAll: writeObj =', writeObj);
    await Storage.set(writeObj);
    console.log('TagsService.setAll: Storage.set completed');
    
    // Verify write
    const verification = await Storage.get(STORAGE_KEY);
    console.log('TagsService.setAll: verification read =', verification);
  }
  
  async function getTags(bookmarkId){
    try {
      console.log('TagsService.getTags: fetching for', bookmarkId);
      const all = await getAll();
      const result = all[bookmarkId] || [];
      console.log('TagsService.getTags: result =', result);
      return result;
    } catch (e) {
      console.error('getTags error', e);
      return [];
    }
  }
  
  async function setTags(bookmarkId, tags){
    try {
      console.log('=== TagsService.setTags START ===', {bookmarkId, tagsInput: tags});
      const all = await getAll();
      console.log('TagsService.setTags: current storage all =', all);
      
      const cleanTags = Array.isArray(tags) ? tags.filter(t => t && typeof t === 'string').map(t => String(t).trim()) : [];
      console.log('TagsService.setTags: cleanTags =', cleanTags);
      
      all[bookmarkId] = cleanTags;
      console.log('TagsService.setTags: updated all =', all);
      
      await setAll(all);
      console.log('=== TagsService.setTags END ===');
      return true;
    } catch (e) {
      console.error('=== TagsService.setTags ERROR ===', e);
      throw e;
    }
  }
  
  async function addTag(bookmarkId, tag){
    try {
      tag = String(tag).trim();
      if (!tag) return;
      const tags = await getTags(bookmarkId);
      if (!tags.includes(tag)) {
        tags.push(tag);
        await setTags(bookmarkId, tags);
      }
    } catch (e) {
      console.error('addTag error', e);
    }
  }
  
  async function removeTag(bookmarkId, tag){
    try {
      const tags = await getTags(bookmarkId);
      const filtered = tags.filter(t => t !== tag);
      await setTags(bookmarkId, filtered);
    } catch (e) {
      console.error('removeTag error', e);
    }
  }
  
  async function getAllTags(){
    try {
      const all = await getAll();
      const set = new Set();
      Object.values(all).forEach(tags => {
        if (Array.isArray(tags)) tags.forEach(t => set.add(t));
      });
      return Array.from(set).sort();
    } catch (e) {
      console.error('getAllTags error', e);
      return [];
    }
  }
  
  async function cleanupOrphans(validIds){
    try {
      const all = await getAll();
      Object.keys(all).forEach(id=>{ if (!validIds.includes(id)) delete all[id]; });
      await setAll(all);
    } catch (e) {
      console.error('cleanupOrphans error', e);
    }
  }
  
  const api = { getAll, addTag, removeTag, setTags, getTags, getAllTags, cleanupOrphans };
  if (typeof window !== 'undefined') window.TagsService = api;
  return api;
})();
