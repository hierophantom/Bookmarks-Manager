const UndoService = (() => {
  // Tracks the most recent undo action so Ctrl+Z can trigger it
  let _lastUndoFn = null;
  let _lastUndoCancel = null;

  /**
   * Show an undo snackbar.
   * @param {string}   message    - Notification text.
   * @param {Function} onUndo     - Called when the user clicks Undo or presses Ctrl+Z.
   * @param {number}   [timeout]  - Auto-dismiss delay in ms (default 5000).
   * @returns {{ cancel: Function }}
   */
  function show(message, onUndo, timeout = 5000) {
    let consumed = false;
    let snackbarHandle = null;

    const runUndoOnce = () => {
      if (consumed) return;
      consumed = true;
      if (_lastUndoFn === runUndoOnce) {
        _lastUndoFn = null;
        _lastUndoCancel = null;
      }
      if (snackbarHandle && typeof snackbarHandle.cancel === 'function') {
        snackbarHandle.cancel();
      }
      try { onUndo(); } catch (e) { console.error('[UndoService] undo failed', e); }
    };

    _lastUndoFn = runUndoOnce;

    snackbarHandle = SnackbarService.show({
      message,
      actionLabel: 'Undo',
      onAction: runUndoOnce,
      onDismiss: () => {
        if (_lastUndoFn === runUndoOnce) {
          _lastUndoFn = null;
          _lastUndoCancel = null;
        }
      },
      timeout,
    });

    _lastUndoCancel = snackbarHandle && typeof snackbarHandle.cancel === 'function'
      ? snackbarHandle.cancel
      : null;

    return snackbarHandle;
  }

  /**
   * Programmatically trigger the most recent undo (used by Ctrl+Z handler).
   */
  function triggerLast() {
    if (typeof _lastUndoFn !== 'function') return;
    const fn = _lastUndoFn;
    const cancel = _lastUndoCancel;
    _lastUndoFn = null;
    _lastUndoCancel = null;
    if (typeof cancel === 'function') {
      try { cancel(); } catch (e) { console.warn('[UndoService] failed to dismiss snackbar on keyboard undo', e); }
    }
    try { fn(); } catch (e) { console.error('[UndoService] triggerLast failed', e); }
  }

  // Global Ctrl+Z / Cmd+Z handler — skip when focus is inside an editable field
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== 'z' || e.shiftKey) return;
    const active = document.activeElement;
    if (active) {
      const tag = active.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return;
    }
    if (_lastUndoFn) {
      e.preventDefault();
      triggerLast();
    }
  });

  return { show, triggerLast };
})();
