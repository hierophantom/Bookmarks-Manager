const LeftPanelService = (() => {
  const STORAGE_KEY_OPEN = 'leftPanel_isOpen';
  const STORAGE_KEY_MODE = 'leftPanel_mode'; // 'floating' or 'docked'
  const STORAGE_KEY_SELECTED = 'leftPanel_selectedFolderId';
  const STORAGE_KEY_EXPANDED = 'leftPanel_expandedFolders'; // array of folder IDs

  /**
   * Get left panel state from storage
   */
  async function getState() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEY_OPEN, STORAGE_KEY_MODE, STORAGE_KEY_SELECTED, STORAGE_KEY_EXPANDED], (result) => {
        resolve({
          isOpen: result[STORAGE_KEY_OPEN] ?? false,
          mode: result[STORAGE_KEY_MODE] ?? 'floating',
          selectedFolderId: result[STORAGE_KEY_SELECTED] ?? null,
          expandedFolders: result[STORAGE_KEY_EXPANDED] ?? []
        });
      });
    });
  }

  /**
   * Save left panel state to storage
   */
  async function setState(state) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({
        [STORAGE_KEY_OPEN]: state.isOpen,
        [STORAGE_KEY_MODE]: state.mode,
        [STORAGE_KEY_SELECTED]: state.selectedFolderId,
        [STORAGE_KEY_EXPANDED]: state.expandedFolders
      }, resolve);
    });
  }

  /**
   * Build folder tree with bookmark counts
   * Returns array of folder nodes with structure: { id, title, bookmarkCount, children: [], bookmarks: [] }
   */
  async function buildFolderTree() {
    const tree = await BookmarksService.getTree();
    const folderTree = [];

    function countBookmarks(node) {
      let count = 0;
      if (node.url) count = 1; // it's a bookmark
      if (node.children) {
        node.children.forEach(child => {
          count += countBookmarks(child);
        });
      }
      return count;
    }

    function buildTree(node, parentIsRoot = false) {
      // Skip if it's a bookmark at this level
      if (node.url) return null;

      const bookmarkCount = countBookmarks(node);
      const directBookmarks = [];
      const subfolders = [];

      const folder = {
        id: node.id,
        title: node.title || '(Untitled)',
        bookmarkCount: bookmarkCount,
        children: [],
        bookmarks: []
      };

      if (node.children) {
        node.children.forEach(child => {
          if (child.url) {
            // It's a bookmark, add to bookmarks array
            directBookmarks.push({
              id: child.id,
              title: child.title || child.url,
              url: child.url
            });
          } else {
            // It's a folder, recurse
            const childFolder = buildTree(child);
            if (childFolder) {
              subfolders.push(childFolder);
            }
          }
        });

        folder.children = subfolders;
        folder.bookmarks = directBookmarks;
      }

      return folder;
    }

    // Process root's children (skip the root node itself)
    if (tree[0] && tree[0].children) {
      tree[0].children.forEach(child => {
        const folderNode = buildTree(child);
        if (folderNode) {
          folderTree.push(folderNode);
        }
      });
    }

    return folderTree;
  }

  /**
   * Get all bookmarks in a folder and its subfolders
   */
  async function getBookmarksByFolder(folderId) {
    const subtree = await BookmarksService.getSubTree(folderId);
    const bookmarks = [];

    function walk(node) {
      if (node.url) {
        bookmarks.push(node);
      }
      if (node.children) {
        node.children.forEach(walk);
      }
    }

    walk(subtree);
    return bookmarks;
  }

  /**
   * Get subfolders of a folder
   */
  async function getSubfolders(folderId) {
    const subtree = await BookmarksService.getSubTree(folderId);
    const folders = [];

    function walk(node) {
      // Add all non-root folders
      if (node.id !== folderId && !node.url) {
        folders.push(node);
      }
      if (node.children) {
        node.children.forEach(walk);
      }
    }

    if (subtree.children) {
      subtree.children.forEach(walk);
    }

    return folders;
  }

  /**
   * Toggle folder expansion
   */
  async function toggleFolderExpansion(folderId) {
    const state = await getState();
    const index = state.expandedFolders.indexOf(folderId);

    if (index > -1) {
      state.expandedFolders.splice(index, 1);
    } else {
      state.expandedFolders.push(folderId);
    }

    await setState(state);
    return state.expandedFolders;
  }

  /**
   * Select a folder (for filtering)
   */
  async function selectFolder(folderId) {
    const state = await getState();
    state.selectedFolderId = folderId;
    await setState(state);
    return state;
  }

  /**
   * Clear folder selection
   */
  async function clearSelection() {
    const state = await getState();
    state.selectedFolderId = null;
    await setState(state);
    return state;
  }

  /**
   * Toggle panel open/closed
   */
  async function togglePanel() {
    const state = await getState();
    state.isOpen = !state.isOpen;
    await setState(state);
    return state;
  }

  /**
   * Open panel
   */
  async function openPanel() {
    const state = await getState();
    state.isOpen = true;
    await setState(state);
    return state;
  }

  /**
   * Close panel
   */
  async function closePanel() {
    const state = await getState();
    state.isOpen = false;
    await setState(state);
    return state;
  }

  /**
   * Toggle between floating and docked mode
   */
  async function toggleMode() {
    const state = await getState();
    state.mode = state.mode === 'floating' ? 'docked' : 'floating';
    await setState(state);
    return state;
  }

  return {
    getState,
    setState,
    buildFolderTree,
    getBookmarksByFolder,
    getSubfolders,
    toggleFolderExpansion,
    selectFolder,
    clearSelection,
    togglePanel,
    openPanel,
    closePanel,
    toggleMode
  };
})();
