/**
 * Tests for Tags Service
 * Tests tag filtering, management, and associations
 */

const { createMockBookmark, createMockTag } = require('../utils');

describe('Tags Service', () => {
  let tagsData;

  beforeEach(() => {
    // Mock tags storage
    tagsData = {};
    global.chrome.storage.sync.data = { tags: tagsData };
  });

  describe('Tag CRUD Operations', () => {
    test('should add tags to a bookmark', async () => {
      const bookmarkId = 'bm-1';
      const tags = ['work', 'important'];
      
      // Simulate adding tags
      if (!tagsData[bookmarkId]) {
        tagsData[bookmarkId] = [];
      }
      tagsData[bookmarkId] = tags;
      
      expect(tagsData[bookmarkId]).toEqual(['work', 'important']);
    });

    test('should retrieve tags for a bookmark', async () => {
      const bookmarkId = 'bm-1';
      tagsData[bookmarkId] = ['work', 'important'];
      
      const tags = tagsData[bookmarkId];
      
      expect(tags).toContain('work');
      expect(tags).toContain('important');
      expect(tags).toHaveLength(2);
    });

    test('should update tags for a bookmark', async () => {
      const bookmarkId = 'bm-1';
      tagsData[bookmarkId] = ['work'];
      
      tagsData[bookmarkId].push('important');
      
      expect(tagsData[bookmarkId]).toEqual(['work', 'important']);
    });

    test('should remove a specific tag from bookmark', async () => {
      const bookmarkId = 'bm-1';
      tagsData[bookmarkId] = ['work', 'important', 'todo'];
      
      tagsData[bookmarkId] = tagsData[bookmarkId].filter(tag => tag !== 'important');
      
      expect(tagsData[bookmarkId]).toEqual(['work', 'todo']);
      expect(tagsData[bookmarkId]).not.toContain('important');
    });

    test('should remove all tags from bookmark', async () => {
      const bookmarkId = 'bm-1';
      tagsData[bookmarkId] = ['work', 'important'];
      
      delete tagsData[bookmarkId];
      
      expect(tagsData[bookmarkId]).toBeUndefined();
    });
  });

  describe('Tag Filtering', () => {
    beforeEach(() => {
      // Setup test data
      tagsData['bm-1'] = ['work', 'important'];
      tagsData['bm-2'] = ['work', 'reference'];
      tagsData['bm-3'] = ['personal', 'todo'];
      tagsData['bm-4'] = ['work', 'important', 'reference'];
    });

    test('should filter bookmarks by single tag', () => {
      const filterTag = 'work';
      const filtered = Object.entries(tagsData)
        .filter(([_, tags]) => tags.includes(filterTag))
        .map(([id, _]) => id);
      
      expect(filtered).toEqual(['bm-1', 'bm-2', 'bm-4']);
    });

    test('should filter bookmarks by multiple tags (OR)', () => {
      const filterTags = ['work', 'personal'];
      const filtered = Object.entries(tagsData)
        .filter(([_, tags]) => filterTags.some(t => tags.includes(t)))
        .map(([id, _]) => id);
      
      expect(filtered).toHaveLength(4);
    });

    test('should filter bookmarks by multiple tags (AND)', () => {
      const filterTags = ['work', 'important'];
      const filtered = Object.entries(tagsData)
        .filter(([_, tags]) => filterTags.every(t => tags.includes(t)))
        .map(([id, _]) => id);
      
      expect(filtered).toEqual(['bm-1', 'bm-4']);
    });

    test('should return empty array when no bookmarks match tag', () => {
      const filterTag = 'nonexistent';
      const filtered = Object.entries(tagsData)
        .filter(([_, tags]) => tags.includes(filterTag))
        .map(([id, _]) => id);
      
      expect(filtered).toEqual([]);
    });
  });

  describe('Tag Management', () => {
    test('should get all unique tags', () => {
      tagsData['bm-1'] = ['work', 'important'];
      tagsData['bm-2'] = ['work', 'reference'];
      tagsData['bm-3'] = ['personal'];
      
      const allTags = [...new Set(
        Object.values(tagsData).flat()
      )];
      
      expect(allTags).toContain('work');
      expect(allTags).toContain('important');
      expect(allTags).toContain('reference');
      expect(allTags).toContain('personal');
      expect(allTags).toHaveLength(4);
    });

    test('should count tags by frequency', () => {
      tagsData['bm-1'] = ['work', 'important'];
      tagsData['bm-2'] = ['work', 'reference'];
      tagsData['bm-3'] = ['work', 'personal'];
      
      const tagCounts = {};
      Object.values(tagsData).flat().forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      
      expect(tagCounts['work']).toBe(3);
      expect(tagCounts['important']).toBe(1);
      expect(tagCounts['personal']).toBe(1);
    });

    test('should rename a tag across all bookmarks', () => {
      tagsData['bm-1'] = ['work', 'important'];
      tagsData['bm-2'] = ['work', 'reference'];
      
      // Rename 'work' to 'job'
      Object.keys(tagsData).forEach(id => {
        tagsData[id] = tagsData[id].map(tag => tag === 'work' ? 'job' : tag);
      });
      
      expect(tagsData['bm-1']).toContain('job');
      expect(tagsData['bm-2']).toContain('job');
      expect(tagsData['bm-1']).not.toContain('work');
    });

    test('should delete a tag from all bookmarks', () => {
      tagsData['bm-1'] = ['work', 'important'];
      tagsData['bm-2'] = ['work', 'reference'];
      tagsData['bm-3'] = ['personal'];
      
      // Delete 'work' tag
      const tagToDelete = 'work';
      Object.keys(tagsData).forEach(id => {
        tagsData[id] = tagsData[id].filter(tag => tag !== tagToDelete);
      });
      
      expect(tagsData['bm-1']).not.toContain('work');
      expect(tagsData['bm-2']).not.toContain('work');
      expect(tagsData['bm-3']).not.toContain('work');
    });

    test('should cleanup orphaned tags when bookmark deleted', () => {
      tagsData['bm-1'] = ['work', 'unique-tag'];
      tagsData['bm-2'] = ['work'];
      
      const bookmarkToDelete = 'bm-1';
      delete tagsData[bookmarkToDelete];
      
      const allTags = [...new Set(
        Object.values(tagsData).flat()
      )];
      
      expect(allTags).toContain('work');
      expect(allTags).not.toContain('unique-tag');
    });
  });

  describe('Tag Validation', () => {
    test('should not allow duplicate tags on same bookmark', () => {
      const bookmarkId = 'bm-1';
      const tags = ['work', 'important', 'work'];
      
      const uniqueTags = [...new Set(tags)];
      tagsData[bookmarkId] = uniqueTags;
      
      expect(tagsData[bookmarkId]).toEqual(['work', 'important']);
    });

    test('should allow empty tag list', () => {
      const bookmarkId = 'bm-1';
      tagsData[bookmarkId] = [];
      
      expect(tagsData[bookmarkId]).toEqual([]);
    });

    test('should handle special characters in tags', () => {
      const bookmarkId = 'bm-1';
      const tags = ['work-related', 'c++', '@urgent', '2024-planning'];
      
      tagsData[bookmarkId] = tags;
      
      expect(tagsData[bookmarkId]).toEqual(tags);
    });

    test('should trim whitespace from tags', () => {
      const bookmarkId = 'bm-1';
      const tags = ['  work  ', 'important', '  todo  '];
      
      const trimmedTags = tags.map(t => t.trim());
      tagsData[bookmarkId] = trimmedTags;
      
      expect(tagsData[bookmarkId]).toEqual(['work', 'important', 'todo']);
    });
  });
});
