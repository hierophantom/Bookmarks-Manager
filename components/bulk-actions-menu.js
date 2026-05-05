/**
 * Bulk Actions Menu
 *
 * Design System Component - BMG-242
 *
 * Opens at the bottom center of the page and shows
 * selected count with action buttons.
 */
function createBulkActionsMenu(options = {}) {
  const {
    selectedCount = 0,
    actions = [],
    visible = true,
    attachToBody = true,
    onClose = null
  } = options;

  const element = document.createElement('div');
  element.className = 'bulk-actions-menu';
  if (!visible) {
    element.classList.add('bulk-actions-menu--hidden');
  }

  const counter = document.createElement('div');
  counter.className = 'bulk-actions-menu__counter';

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'bulk-actions-menu__actions';

  element.appendChild(counter);
  element.appendChild(actionsWrap);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'action-button';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  const closeBtnIcon = document.createElement('span');
  closeBtnIcon.className = 'action-button__icon';
  const closeBtnSymbol = document.createElement('span');
  closeBtnSymbol.className = 'material-symbols-outlined';
  closeBtnSymbol.setAttribute('aria-hidden', 'true');
  closeBtnSymbol.textContent = 'close';
  closeBtnIcon.appendChild(closeBtnSymbol);
  closeBtn.appendChild(closeBtnIcon);
  closeBtn.addEventListener('click', () => {
    if (typeof onClose === 'function') {
      onClose();
    } else {
      hide();
    }
  });
  element.appendChild(closeBtn);

  function setSelectedCount(count) {
    const safeCount = Number.isFinite(count) ? Math.max(0, Number(count)) : 0;
    counter.innerHTML = '';
    const countEl = document.createElement('span');
    countEl.className = 'bulk-actions-menu__counter-count';
    countEl.textContent = safeCount;
    const labelEl = document.createElement('span');
    labelEl.className = 'bulk-actions-menu__counter-label';
    labelEl.textContent = 'items selected';
    counter.appendChild(countEl);
    counter.appendChild(labelEl);
  }

  function createActionButton(action = {}) {
    const {
      label = '',
      icon = null,
      variant = 'common',
      onClick = null
    } = action;

    if (!label) return null;

    let button = null;
    const resolvedIcon = icon ? createBulkActionIcon(icon) : null;

    if (variant === 'primary' && typeof createPrimaryButton === 'function') {
      button = createPrimaryButton({
        label,
        icon: resolvedIcon,
        onClick: () => {
          if (typeof onClick === 'function') onClick(action);
        }
      });
    } else if (typeof createCommonButton === 'function') {
      button = createCommonButton({
        label,
        icon: resolvedIcon,
        onClick: () => {
          if (typeof onClick === 'function') onClick(action);
        }
      });
    } else {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'bulk-actions-menu__fallback-button';
      button.textContent = label;
      button.addEventListener('click', () => {
        if (typeof onClick === 'function') onClick(action);
      });
    }

    button.classList.add('bulk-actions-menu__action');
    return button;
  }

  function setActions(nextActions = []) {
    actionsWrap.innerHTML = '';
    const normalized = Array.isArray(nextActions) ? nextActions : [];
    normalized.forEach((action) => {
      const button = createActionButton(action);
      if (button) {
        actionsWrap.appendChild(button);
      }
    });
  }

  function show() {
    element.classList.remove('bulk-actions-menu--hidden');
  }

  function hide() {
    element.classList.add('bulk-actions-menu--hidden');
  }

  function destroy() {
    element.remove();
  }

  setSelectedCount(selectedCount);
  setActions(actions);

  if (attachToBody && document.body) {
    document.body.appendChild(element);
  }

  return {
    element,
    setSelectedCount,
    setActions,
    show,
    hide,
    destroy
  };
}

function createBulkActionIcon(iconName) {
  if (iconName instanceof HTMLElement) {
    return iconName;
  }

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = String(iconName || '');
  return icon;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createBulkActionsMenu
  };
}
