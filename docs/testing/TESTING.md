# Testing Guide - Bookmark Manager

## Overview

Bookmark Manager includes comprehensive unit and integration tests covering core functionality. Tests are built with Jest and provide automated validation of features.

## Test Structure

```
__tests__/
├── setup.js                 # Jest setup and Chrome API mocks
├── utils.js                 # Testing utilities and helpers
├── services/
│   ├── storage.test.js      # Storage persistence tests
│   ├── tags.test.js         # Tag filtering and management tests
│   ├── undo.test.js         # Undo/Redo system tests
│   └── themes.test.js       # Theme switching tests
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Run Tests in CI Mode
```bash
npm run test:ci
```

## Test Coverage

### Storage Persistence Tests (`storage.test.js`)
**Purpose**: Verify data persistence and retrieval

**Tests**:
- ✅ Get single and multiple values
- ✅ Set and overwrite data
- ✅ Remove specific or multiple keys
- ✅ Complex object storage
- ✅ User settings persistence
- ✅ Bookmark state persistence
- ✅ Storage clearing

**Example**:
```javascript
test('should persist user settings across operations', async () => {
  const userSettings = {
    theme: 'electric-blue',
    activePageIndex: 1,
  };
  await Storage.set({ userSettings });
  const result = await Storage.get('userSettings');
  expect(result.userSettings).toEqual(userSettings);
});
```

### Tag Filtering Tests (`tags.test.js`)
**Purpose**: Verify tag CRUD operations and filtering

**Tests**:
- ✅ Add, retrieve, update, and remove tags
- ✅ Filter bookmarks by single tag
- ✅ Filter bookmarks by multiple tags (OR)
- ✅ Filter bookmarks by multiple tags (AND)
- ✅ Get all unique tags
- ✅ Count tag frequency
- ✅ Rename tags
- ✅ Delete tags
- ✅ Cleanup orphaned tags
- ✅ Tag validation and deduplication

**Example**:
```javascript
test('should filter bookmarks by multiple tags (AND)', () => {
  const filterTags = ['work', 'important'];
  const filtered = Object.entries(tagsData)
    .filter(([_, tags]) => filterTags.every(t => tags.includes(t)))
    .map(([id, _]) => id);
  
  expect(filtered).toEqual(['bm-1', 'bm-4']);
});
```

### Undo/Redo System Tests (`undo.test.js`)
**Purpose**: Verify undo/redo state management and history

**Tests**:
- ✅ Push state to undo stack
- ✅ Undo and redo operations
- ✅ Handle different action types (add, edit, delete, move)
- ✅ Batch operations undo
- ✅ History size limits
- ✅ Clear redo on new action
- ✅ Edge cases (empty stacks)
- ✅ Undo history persistence

**Example**:
```javascript
test('should handle bookmark deletion undo', () => {
  const deleteState = {
    action: 'deleteBookmark',
    bookmark: { id: 'bm-1', title: 'Test' },
    previousParentId: 'folder-1',
  };
  undoStack.push(deleteState);
  const undone = undoStack.pop();
  expect(undone.previousParentId).toBe('folder-1');
});
```

### Theme Switching Tests (`themes.test.js`)
**Purpose**: Verify theme retrieval, switching, and persistence

**Tests**:
- ✅ Get available themes
- ✅ Switch between themes
- ✅ Persist theme selection
- ✅ Theme properties validation
- ✅ CSS variable application
- ✅ Accessibility compliance
- ✅ High contrast theme
- ✅ Storage restoration

**Example**:
```javascript
test('should apply theme CSS variables to DOM', () => {
  const theme = mockThemes['electric-blue'];
  const root = document.documentElement;
  
  Object.entries(theme).forEach(([key, value]) => {
    if (key === 'name') return;
    const cssVarName = `--theme-${key}`;
    root.style.setProperty(cssVarName, value);
  });
  
  expect(root.style.getPropertyValue('--theme-primary'))
    .toBe(theme.primary);
});
```

## Test Utilities

### Helper Functions (`__tests__/utils.js`)

**Bookmark Creation**:
```javascript
const bookmark = createMockBookmark({
  title: 'Custom Title',
  url: 'https://custom.com'
});
```

**Folder Creation**:
```javascript
const folder = createMockFolder({
  title: 'Work',
  children: [...]
});
```

**Wait For Condition**:
```javascript
await waitFor(() => {
  return someCondition === true;
}, { timeout: 5000 });
```

**Mock Bookmark Tree**:
```javascript
const tree = createMockBookmarkTree();
// Creates realistic bookmark hierarchy for testing
```

## Chrome API Mocking

Jest setup automatically mocks Chrome APIs:

### Storage API
```javascript
global.chrome.storage.sync.get('key');
global.chrome.storage.sync.set({ key: 'value' });
```

### Bookmarks API
```javascript
global.chrome.bookmarks.getTree(callback);
global.chrome.bookmarks.create(obj, callback);
global.chrome.bookmarks.remove(id, callback);
```

### Tabs API
```javascript
global.chrome.tabs.create({ url: 'https://example.com' });
global.chrome.tabs.query(obj, callback);
```

## Adding New Tests

### Test Template
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  test('should do something', () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = ...;
    
    // Assert
    expect(result).toBe(...);
  });
});
```

### Best Practices
1. **One assertion per test** (or related assertions)
2. **Clear test names** describing what is tested
3. **Meaningful test data** with realistic values
4. **Setup and teardown** for test isolation
5. **Test edge cases** (empty, null, invalid)

## Coverage Goals

- **Storage**: 100% coverage
- **Tags**: 100% coverage
- **Undo/Redo**: 100% coverage
- **Themes**: 100% coverage
- **Overall**: 80%+ coverage

Current coverage can be viewed by running:
```bash
npm run test:coverage
```

## Planned Tests (Phase 2)

- [ ] Bookmark CRUD operations integration
- [ ] Drag & drop reordering logic
- [ ] Search functionality
- [ ] Modal component tests
- [ ] Keyboard navigation tests
- [ ] API integration tests

## Continuous Integration

Tests run automatically on:
- Push to main branch
- Pull requests
- Scheduled daily runs

See `.github/workflows/test.yml` for CI configuration.

## Troubleshooting

### Mock Not Working
Ensure setup.js is listed in `setupFilesAfterEnv` in package.json

### Async Test Timeout
Increase timeout in test or increase Jest timeout:
```javascript
jest.setTimeout(10000);
```

### Storage Mock Not Persisting
Clear mock data between tests with `beforeEach()`:
```javascript
beforeEach(() => {
  mockStorage.data = {};
});
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Chrome Extension Testing](https://developer.chrome.com/docs/extensions/mv3/)

---

**Test Suite Version**: 1.0.0  
**Last Updated**: January 2026  
**Issue**: BMG-62
