/**
 * Test utilities for Bookmark Manager
 * Provides helper functions for setting up test scenarios
 */

/**
 * Create a mock bookmark object
 */
function createMockBookmark(overrides = {}) {
  return {
    id: 'bookmark-' + Date.now(),
    title: 'Test Bookmark',
    url: 'https://example.com',
    parentId: '1',
    index: 0,
    dateAdded: Date.now(),
    ...overrides,
  };
}

/**
 * Create a mock folder object
 */
function createMockFolder(overrides = {}) {
  return {
    id: 'folder-' + Date.now(),
    title: 'Test Folder',
    parentId: '0',
    index: 0,
    dateAdded: Date.now(),
    children: [],
    ...overrides,
  };
}

/**
 * Create a mock tag object
 */
function createMockTag(tagName = 'test-tag', bookmarkIds = []) {
  return {
    name: tagName,
    bookmarks: bookmarkIds,
  };
}

/**
 * Wait for a promise to resolve or reject
 */
function waitFor(callback, options = {}) {
  const { timeout = 1000, interval = 50 } = options;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      try {
        const result = callback();
        if (result) {
          resolve(result);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, interval);
        }
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error);
        } else {
          setTimeout(check, interval);
        }
      }
    };
    check();
  });
}

/**
 * Create a sample bookmark tree for testing
 */
function createMockBookmarkTree() {
  const bookmarksBar = {
    id: '1',
    title: 'Bookmarks Bar',
    dateAdded: 0,
    children: [
      {
        id: 'bm-1',
        title: 'Google',
        url: 'https://google.com',
        parentId: '1',
        index: 0,
        dateAdded: Date.now(),
      },
      {
        id: 'bm-2',
        title: 'GitHub',
        url: 'https://github.com',
        parentId: '1',
        index: 1,
        dateAdded: Date.now(),
      },
    ],
  };

  const other = {
    id: '2',
    title: 'Other Bookmarks',
    dateAdded: 0,
    children: [
      {
        id: 'folder-1',
        title: 'Work',
        parentId: '2',
        index: 0,
        dateAdded: Date.now(),
        children: [
          {
            id: 'bm-3',
            title: 'Linear',
            url: 'https://linear.app',
            parentId: 'folder-1',
            index: 0,
            dateAdded: Date.now(),
          },
        ],
      },
    ],
  };

  const root = {
    id: '0',
    title: 'Root',
    dateAdded: 0,
    children: [bookmarksBar, other],
  };

  return [root];
}

/**
 * Mock localStorage for testing
 */
function setupLocalStorageMock() {
  const store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
}

module.exports = {
  createMockBookmark,
  createMockFolder,
  createMockTag,
  waitFor,
  createMockBookmarkTree,
  setupLocalStorageMock,
};
