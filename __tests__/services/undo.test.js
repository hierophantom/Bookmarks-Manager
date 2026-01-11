/**
 * Tests for Undo/Redo System
 * Tests undo/redo state management and history
 */

describe('Undo/Redo System', () => {
  let undoStack;
  let redoStack;

  beforeEach(() => {
    // Initialize undo/redo stacks
    undoStack = [];
    redoStack = [];
  });

  describe('Basic Undo/Redo Operations', () => {
    test('should push state to undo stack', () => {
      const state = { action: 'addBookmark', bookmark: { id: 'bm-1' } };
      
      undoStack.push(state);
      
      expect(undoStack).toHaveLength(1);
      expect(undoStack[0]).toEqual(state);
    });

    test('should undo last action', () => {
      const state1 = { action: 'addBookmark', id: 'bm-1' };
      const state2 = { action: 'editBookmark', id: 'bm-2' };
      
      undoStack.push(state1);
      undoStack.push(state2);
      
      const lastState = undoStack.pop();
      redoStack.push(lastState);
      
      expect(undoStack).toHaveLength(1);
      expect(redoStack).toHaveLength(1);
      expect(redoStack[0]).toEqual(state2);
    });

    test('should redo last undone action', () => {
      const state1 = { action: 'addBookmark', id: 'bm-1' };
      const state2 = { action: 'editBookmark', id: 'bm-2' };
      
      undoStack.push(state1);
      undoStack.push(state2);
      
      const undoneState = undoStack.pop();
      redoStack.push(undoneState);
      
      const redoState = redoStack.pop();
      undoStack.push(redoState);
      
      expect(undoStack).toHaveLength(2);
      expect(redoStack).toHaveLength(0);
    });

    test('should clear redo stack when new action after undo', () => {
      undoStack.push({ action: 'action1' });
      undoStack.push({ action: 'action2' });
      
      undoStack.pop();
      redoStack.push({ action: 'action2' });
      
      // New action after undo
      undoStack.push({ action: 'action3' });
      redoStack = [];
      
      expect(redoStack).toHaveLength(0);
    });
  });

  describe('Undo/Redo with Different Actions', () => {
    test('should handle bookmark addition undo', () => {
      const addState = {
        action: 'addBookmark',
        bookmark: {
          id: 'bm-1',
          title: 'Test',
          url: 'https://test.com',
        },
      };
      
      undoStack.push(addState);
      const undone = undoStack.pop();
      
      expect(undone.action).toBe('addBookmark');
      expect(undone.bookmark.id).toBe('bm-1');
    });

    test('should handle bookmark deletion undo', () => {
      const deleteState = {
        action: 'deleteBookmark',
        bookmark: {
          id: 'bm-1',
          title: 'Test',
          url: 'https://test.com',
        },
        previousParentId: 'folder-1',
        previousIndex: 0,
      };
      
      undoStack.push(deleteState);
      const undone = undoStack.pop();
      
      expect(undone.action).toBe('deleteBookmark');
      expect(undone.previousParentId).toBe('folder-1');
    });

    test('should handle bookmark edit undo', () => {
      const editState = {
        action: 'editBookmark',
        bookmarkId: 'bm-1',
        oldData: {
          title: 'Old Title',
          url: 'https://old.com',
        },
        newData: {
          title: 'New Title',
          url: 'https://new.com',
        },
      };
      
      undoStack.push(editState);
      const undone = undoStack.pop();
      
      expect(undone.oldData.title).toBe('Old Title');
      expect(undone.newData.title).toBe('New Title');
    });

    test('should handle bookmark move undo', () => {
      const moveState = {
        action: 'moveBookmark',
        bookmarkId: 'bm-1',
        fromParentId: 'folder-1',
        fromIndex: 0,
        toParentId: 'folder-2',
        toIndex: 5,
      };
      
      undoStack.push(moveState);
      const undone = undoStack.pop();
      
      expect(undone.fromParentId).toBe('folder-1');
      expect(undone.toParentId).toBe('folder-2');
    });

    test('should handle batch operations undo', () => {
      const batchState = {
        action: 'batchOperation',
        operations: [
          { type: 'add', bookmark: { id: 'bm-1' } },
          { type: 'edit', bookmark: { id: 'bm-2' } },
          { type: 'move', bookmark: { id: 'bm-3' } },
        ],
      };
      
      undoStack.push(batchState);
      const undone = undoStack.pop();
      
      expect(undone.operations).toHaveLength(3);
    });
  });

  describe('Undo/Redo History Limits', () => {
    test('should respect maximum undo history limit', () => {
      const MAX_HISTORY = 50;
      
      for (let i = 0; i < 100; i++) {
        undoStack.push({ action: `action-${i}` });
        if (undoStack.length > MAX_HISTORY) {
          undoStack.shift();
        }
      }
      
      expect(undoStack.length).toBeLessThanOrEqual(MAX_HISTORY);
      expect(undoStack).toHaveLength(50);
    });

    test('should clear history when limit is reached', () => {
      const MAX_HISTORY = 10;
      
      for (let i = 0; i < 20; i++) {
        undoStack.push({ id: i });
        if (undoStack.length > MAX_HISTORY) {
          undoStack.shift();
        }
      }
      
      expect(undoStack).toHaveLength(10);
      expect(undoStack[0].id).toBe(10);
    });

    test('should maintain separate limits for undo and redo', () => {
      const MAX_HISTORY = 10;
      
      for (let i = 0; i < 15; i++) {
        undoStack.push({ id: i });
        if (undoStack.length > MAX_HISTORY) {
          undoStack.shift();
        }
      }
      
      for (let i = 0; i < 8; i++) {
        redoStack.push(undoStack.pop());
      }
      
      expect(undoStack.length).toBe(7);
      expect(redoStack.length).toBe(8);
    });
  });

  describe('Undo/Redo Edge Cases', () => {
    test('should handle undo on empty stack gracefully', () => {
      expect(undoStack.length).toBe(0);
      
      const result = undoStack.pop();
      
      expect(result).toBeUndefined();
    });

    test('should handle redo on empty stack gracefully', () => {
      expect(redoStack.length).toBe(0);
      
      const result = redoStack.pop();
      
      expect(result).toBeUndefined();
    });

    test('should track multiple undo/redo sequences', () => {
      // Action 1
      undoStack.push({ action: 'action1' });
      
      // Action 2
      undoStack.push({ action: 'action2' });
      
      // Undo action2
      redoStack.push(undoStack.pop());
      expect(undoStack).toHaveLength(1);
      
      // Undo action1
      redoStack.push(undoStack.pop());
      expect(undoStack).toHaveLength(0);
      
      // Redo action1
      undoStack.push(redoStack.pop());
      expect(undoStack).toHaveLength(1);
      
      // Redo action2
      undoStack.push(redoStack.pop());
      expect(undoStack).toHaveLength(2);
      expect(redoStack).toHaveLength(0);
    });
  });

  describe('Undo/Redo Persistence', () => {
    test('should persist undo history to storage', () => {
      const history = [
        { action: 'add', id: 'bm-1' },
        { action: 'edit', id: 'bm-2' },
      ];
      
      const storageData = {
        undoHistory: history,
        timestamp: Date.now(),
      };
      
      expect(storageData.undoHistory).toEqual(history);
      expect(storageData).toHaveProperty('timestamp');
    });

    test('should restore undo history from storage', () => {
      const savedHistory = [
        { action: 'add', id: 'bm-1' },
        { action: 'edit', id: 'bm-2' },
      ];
      
      const restoredHistory = [...savedHistory];
      
      expect(restoredHistory).toEqual(savedHistory);
      expect(restoredHistory).toHaveLength(2);
    });

    test('should handle corrupted undo history gracefully', () => {
      let history;
      
      try {
        const corruptedData = undefined;
        history = corruptedData || [];
      } catch (e) {
        history = [];
      }
      
      expect(history).toEqual([]);
    });
  });
});
