/**
 * Snackbar Component
 *
 * Design System Component - BMG-156
 *
 * @example
 * SnackbarService.show({
 *   message: 'Bookmark added',
 *   actionLabel: 'Undo',
 *   onAction: () => undoCreate(),
 * });
 */

const SnackbarService = (() => {
  const CONTAINER_ID = '__bm_snackbar_container';

  function ensureContainer() {
    let c = document.getElementById(CONTAINER_ID);
    if (c) return c;
    c = document.createElement('div');
    c.id = CONTAINER_ID;
    c.className = 'snackbar-container';
    document.body.appendChild(c);
    return c;
  }

  /**
   * Show a snackbar notification.
   *
   * @param {object} options
   * @param {string}   options.message       - Text to display.
   * @param {string}   [options.actionLabel] - Label for the action button (e.g. "Undo").
   * @param {Function} [options.onAction]    - Called when the action button is clicked.
   * @param {Function} [options.onDismiss]   - Called when the snackbar is dismissed (auto or manual).
   * @param {number}   [options.timeout=5000]- Auto-dismiss delay in ms.
   * @returns {{ cancel: Function }} - Call cancel() to dismiss early.
   */
  function show({ message, actionLabel, onAction, onDismiss, timeout = 5000 }) {
    const c = ensureContainer();

    const el = document.createElement('div');
    el.className = 'snackbar';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    const msgEl = document.createElement('span');
    msgEl.className = 'snackbar__message';
    msgEl.textContent = message;
    el.appendChild(msgEl);

    let tid;
    let dismissed = false;

    function remove() {
      if (dismissed || !el.parentNode) return;
      dismissed = true;
      clearTimeout(tid);
      el.classList.add('snackbar--exiting');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }

    if (typeof onAction === 'function' && actionLabel) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'snackbar__action';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => {
        remove();
        try { onAction(); } catch (e) { console.error('[SnackbarService] action failed', e); }
      });
      el.appendChild(btn);
    }

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'snackbar__dismiss';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true" style="font-size:14px;line-height:1">close</span>';
    dismissBtn.addEventListener('click', () => {
      remove();
      if (typeof onDismiss === 'function') onDismiss();
    });
    el.appendChild(dismissBtn);

    c.appendChild(el);
    tid = setTimeout(() => {
      remove();
      if (typeof onDismiss === 'function') onDismiss();
    }, timeout);

    return { cancel: remove };
  }

  return { show };
})();
