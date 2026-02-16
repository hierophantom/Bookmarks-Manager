/**
 * TagsService - Manages bookmark tags using chrome.storage
 * Tags are stored as: { bookmarkId: ['tag1', 'tag2', ...] }
 */
const TagsService = (()=>{
  const STORAGE_KEY = 'bookmarkTags';
  let cachedAll = null;
  let cachePromise = null;
  
  /**
   * Get all tags from storage
   * @returns {Promise<Object>} Map of bookmarkId -> tag array
   */
  async function getAll(){
    if (cachedAll) return cachedAll;
    if (!cachePromise) {
      cachePromise = Storage.get(STORAGE_KEY)
        .then((data) => {
          cachedAll = data || {};
          return cachedAll;
        })
        .finally(() => {
          cachePromise = null;
        });
    }
    return cachePromise;
  }
  
  /**
   * Save all tags to storage
   * @param {Object} map - Map of bookmarkId -> tag array
   */
  async function setAll(map){
    await Storage.set({[STORAGE_KEY]: map});
    cachedAll = map || {};
  }
  
  /**
   * Get tags for a specific bookmark
   * @param {string} bookmarkId - Bookmark ID
   * @returns {Promise<string[]>} Array of tags
   */
  async function getTags(bookmarkId){
    const all = await getAll();
    return all[bookmarkId] || [];
  }
  
  /**
   * Set tags for a specific bookmark
   * @param {string} bookmarkId - Bookmark ID
   * @param {string[]} tags - Array of tag strings
   */
  async function setTags(bookmarkId, tags){
    const all = await getAll();
    const cleanTags = Array.isArray(tags) 
      ? tags.filter(t => t && typeof t === 'string').map(t => t.trim()).filter(t => t.length > 0)
      : [];
    
    if (cleanTags.length > 0) {
      all[bookmarkId] = cleanTags;
    } else {
      delete all[bookmarkId];
    }
    cachedAll = all;
    await setAll(all);
  }
  
  /**
   * Get all unique tags across all bookmarks
   * @returns {Promise<string[]>} Sorted array of unique tags
   */
  async function getAllTags(){
    const all = await getAll();
    const tags = new Set();
    Object.values(all).forEach(tagArray => {
      if (Array.isArray(tagArray)) {
        tagArray.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }
  
  /**
   * Remove tags for deleted bookmarks
   * @param {string[]} validBookmarkIds - Array of valid bookmark IDs
   */
  async function cleanupOrphans(validBookmarkIds){
    const validSet = new Set(validBookmarkIds);
    const all = await getAll();
    let changed = false;
    
    Object.keys(all).forEach(id => {
      if (!validSet.has(id)) {
        delete all[id];
        changed = true;
      }
    });
    
    if (changed) {
      cachedAll = all;
      await setAll(all);
    }
  }
  
  /**
   * Search bookmarks by tag
   * @param {string} tag - Tag to search for
   * @returns {Promise<string[]>} Array of bookmark IDs with this tag
   */
  async function findBookmarksByTag(tag){
    const all = await getAll();
    return Object.keys(all).filter(id => {
      return Array.isArray(all[id]) && all[id].includes(tag);
    });
  }
  
  const api = { 
    getAll, 
    setAll, 
    getTags, 
    setTags, 
    getAllTags, 
    cleanupOrphans, 
    findBookmarksByTag 
  };
  
  if (typeof window !== 'undefined') window.TagsService = api;
  return api;
})();

