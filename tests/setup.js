/**
 * Jest setup file
 * Configures Chrome API mocks and test environment
 */

// Mock Chrome Storage API
const mockStorage = {
  data: {},
  get: jest.fn((keys) => {
    return new Promise((resolve) => {
      if (typeof keys === 'string') {
        resolve({ [keys]: mockStorage.data[keys] });
      } else if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(k => {
          result[k] = mockStorage.data[k];
        });
        resolve(result);
      } else {
        resolve(mockStorage.data);
      }
    });
  }),
  set: jest.fn((obj) => {
    return new Promise((resolve) => {
      Object.assign(mockStorage.data, obj);
      resolve();
    });
  }),
  remove: jest.fn((keys) => {
    return new Promise((resolve) => {
      if (typeof keys === 'string') {
        delete mockStorage.data[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach(k => delete mockStorage.data[k]);
      }
      resolve();
    });
  }),
  clear: jest.fn(() => {
    return new Promise((resolve) => {
      mockStorage.data = {};
      resolve();
    });
  }),
};

// Mock Chrome Bookmarks API
const mockBookmarks = {
  getTree: jest.fn((callback) => {
    callback([{
      id: '0',
      title: 'Bookmarks Bar',
      children: []
    }]);
  }),
  get: jest.fn((id, callback) => {
    callback([{
      id,
      title: 'Test Bookmark',
      url: 'https://example.com'
    }]);
  }),
  create: jest.fn((obj, callback) => {
    callback({
      id: 'mock-id-' + Date.now(),
      ...obj
    });
  }),
  move: jest.fn((id, obj, callback) => {
    callback({
      id,
      ...obj
    });
  }),
  remove: jest.fn((id, callback) => {
    callback();
  }),
  removeTree: jest.fn((id, callback) => {
    callback();
  }),
  getSubTree: jest.fn((id, callback) => {
    callback([{
      id,
      children: []
    }]);
  }),
  update: jest.fn((id, obj, callback) => {
    callback({
      id,
      ...obj
    });
  }),
};

// Mock Chrome Tabs API
const mockTabs = {
  create: jest.fn((obj, callback) => {
    callback({
      id: Math.floor(Math.random() * 10000),
      ...obj
    });
  }),
  query: jest.fn((obj, callback) => {
    callback([]);
  }),
};

// Mock Chrome TabGroups API
const mockTabGroups = {
  query: jest.fn((obj, callback) => {
    if (typeof obj === 'function') {
      obj([]);
    } else {
      callback([]);
    }
  }),
};

// Mock Chrome Runtime API
const mockRuntime = {
  sendMessage: jest.fn((msg, callback) => {
    if (callback) callback();
  }),
  lastError: null,
};

// Setup global chrome object
global.chrome = {
  storage: {
    sync: mockStorage,
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  bookmarks: mockBookmarks,
  tabs: mockTabs,
  tabGroups: mockTabGroups,
  runtime: mockRuntime,
};

// Clear storage before each test
beforeEach(() => {
  mockStorage.data = {};
  jest.clearAllMocks();
});

// Export mocks for use in tests
module.exports = {
  mockStorage,
  mockBookmarks,
  mockTabs,
  mockTabGroups,
  mockRuntime,
};
