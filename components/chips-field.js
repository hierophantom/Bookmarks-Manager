/**
 * Chips Field Component
 *
 * Design System Component - BMG-198
 */

function createChipsField(options = {}) {
  const {
    label = 'Label',
    contrast = 'low',
    state = 'idle',
    selectedValues = [],
    availableItems = [],
    menuTitle = 'Select options:',
    inputPlaceholder = label,
    allowCustom = true,
    onChange = null
  } = options;

  const field = document.createElement('div');
  field.className = `chips-field chips-field--${contrast}`;

  const content = document.createElement('div');
  content.className = 'chips-field__content';

  const chipList = document.createElement('div');
  chipList.className = 'chips-field__chip-list';

  const input = document.createElement('input');
  input.className = 'chips-field__input';
  input.type = 'text';
  input.placeholder = inputPlaceholder;
  input.setAttribute('aria-label', label);

  const action = document.createElement('button');
  action.className = 'chips-field__action';
  action.type = 'button';
  action.setAttribute('aria-label', `Clear ${label.toLowerCase()}`);
  action.innerHTML = "<svg viewBox='0 0 10 10' aria-hidden='true'><path d='M2 2L8 8'></path><path d='M8 2L2 8'></path></svg>";

  const menuWrapper = document.createElement('div');
  menuWrapper.className = 'chips-field__menu';

  content.append(chipList, input);
  field.append(content, action, menuWrapper);

  const selection = [];
  const uniqueOptions = [];
  let query = '';
  let active = state === 'active';

  const syncOptions = (items) => {
    uniqueOptions.length = 0;
    const seen = new Set();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const value = normalizeChipValue(item);
      if (!value) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      uniqueOptions.push(value);
    });
    uniqueOptions.sort((left, right) => left.localeCompare(right));
  };

  const emitChange = () => {
    if (typeof onChange === 'function') {
      onChange(selection.slice());
    }
  };

  const applyState = () => {
    field.classList.toggle('chips-field--active', active);
    field.classList.toggle('chips-field--hover', !active && state === 'hover');
    field.classList.toggle('chips-field--has-value', selection.length > 0);
    field.classList.toggle('chips-field--has-query', Boolean(query));
  };

  const hasValue = (value) => selection.some((item) => item.toLowerCase() === value.toLowerCase());

  const getFilteredItems = () => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return uniqueOptions.slice();
    }
    return uniqueOptions.filter((item) => item.toLowerCase().includes(normalizedQuery));
  };

  const getCustomAddLabel = () => {
    const normalized = normalizeChipValue(query);
    if (!allowCustom || !normalized) {
      return null;
    }

    const exists = uniqueOptions.some((item) => item.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      return null;
    }

    return `Add ${normalized}`;
  };

  const openMenu = () => {
    active = true;
    menuWrapper.classList.add('chips-field__menu--open');
    applyState();
    renderMenu();
  };

  const closeMenu = () => {
    active = false;
    menuWrapper.classList.remove('chips-field__menu--open');
    applyState();
  };

  const renderSelection = () => {
    chipList.innerHTML = '';
    selection.forEach((value) => {
      const chip = typeof createChip === 'function'
        ? createChip({ text: value, contrast, onRemove: () => removeValue(value) })
        : createFallbackChip(value);
      chipList.appendChild(chip);
    });
    input.placeholder = selection.length > 0 ? '' : inputPlaceholder;
    applyState();
  };

  const renderMenu = () => {
    menuWrapper.innerHTML = '';
    const filteredItems = getFilteredItems();
    const customAddLabel = getCustomAddLabel();
    const menuItems = customAddLabel ? [customAddLabel, ...filteredItems] : filteredItems;
    const menu = typeof createSelectionMenu === 'function'
      ? createSelectionMenu({
        type: 'simple',
        contrast,
        title: menuTitle,
        items: menuItems,
        selectedIndices: menuItems.map((item, index) => (customAddLabel && index === 0 ? -1 : hasValue(item) ? index : -1)).filter((index) => index !== -1),
        showClear: false,
        showSelectAll: !query.trim() && filteredItems.length > 0,
        onSelect: (index) => {
          if (customAddLabel && index === 0) {
            commitQuery();
            return;
          }

          const selectedItem = menuItems[index];
          if (selectedItem) {
            toggleValue(selectedItem);
          }
        },
        onSelectAll: () => {
          filteredItems.forEach((item) => addValue(item));
          renderSelection();
          renderMenu();
          emitChange();
        }
      })
      : document.createElement('div');

    if (customAddLabel) {
      const firstItem = menu.querySelector('.selection-menu__item');
      if (firstItem) {
        firstItem.classList.add('selection-menu__item--add');
        const checkbox = firstItem.querySelector('.selection-menu__checkbox');
        if (checkbox) {
          checkbox.classList.remove('selection-menu__checkbox--checked');
          checkbox.innerHTML = "<svg viewBox='0 0 12 12' aria-hidden='true'><path d='M6 2V10'></path><path d='M2 6H10'></path></svg>";
        }
      }
    }

    if (filteredItems.length === 0 && !customAddLabel) {
      const empty = document.createElement('div');
      empty.className = 'selection-menu__item';
      empty.textContent = query ? 'No matching tags' : 'No tags available';
      menu.appendChild(empty);
      const selectAllRow = menu.querySelector('.selection-menu__select-all');
      if (selectAllRow) {
        selectAllRow.remove();
      }
    }

    menuWrapper.appendChild(menu);
  };

  const addValue = (value) => {
    const normalized = normalizeChipValue(value);
    if (!normalized || hasValue(normalized)) return false;
    selection.push(normalized);
    if (!uniqueOptions.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      uniqueOptions.push(normalized);
      uniqueOptions.sort((left, right) => left.localeCompare(right));
    }
    return true;
  };

  const removeValue = (value) => {
    const index = selection.findIndex((item) => item.toLowerCase() === value.toLowerCase());
    if (index === -1) return;
    selection.splice(index, 1);
    renderSelection();
    renderMenu();
    emitChange();
    input.focus();
  };

  const toggleValue = (value) => {
    if (hasValue(value)) {
      removeValue(value);
      return;
    }

    if (addValue(value)) {
      query = '';
      input.value = '';
      renderSelection();
      renderMenu();
      emitChange();
    }
  };

  const commitQuery = () => {
    const normalized = normalizeChipValue(query);
    if (!allowCustom || !normalized) return false;
    const didAdd = addValue(normalized);
    if (didAdd) {
      query = '';
      input.value = '';
      renderSelection();
      renderMenu();
      emitChange();
    }
    return didAdd;
  };

  input.addEventListener('focus', openMenu);
  input.addEventListener('input', () => {
    query = input.value;
    openMenu();
  });
  input.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ',') && query.trim()) {
      event.preventDefault();
      const customAddLabel = getCustomAddLabel();
      if (customAddLabel || getFilteredItems().length === 0) {
        commitQuery();
      }
      return;
    }

    if (event.key === 'Backspace' && !query && selection.length > 0) {
      removeValue(selection[selection.length - 1]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      input.blur();
    }
  });

  field.addEventListener('click', (event) => {
    if (event.target === action) return;
    input.focus();
    openMenu();
  });

  action.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    selection.splice(0, selection.length);
    query = '';
    input.value = '';
    renderSelection();
    renderMenu();
    emitChange();
    input.focus();
  });

  document.addEventListener('click', (event) => {
    if (!field.contains(event.target)) {
      closeMenu();
    }
  });

  field.getSelectedValues = () => selection.slice();
  field.setSelectedValues = (values) => {
    selection.splice(0, selection.length);
    (Array.isArray(values) ? values : []).forEach((value) => addValue(value));
    query = '';
    input.value = '';
    renderSelection();
    renderMenu();
    emitChange();
  };
  field.setAvailableItems = (items) => {
    syncOptions(items);
    renderMenu();
  };
  field.focusInput = () => input.focus();

  syncOptions(availableItems);
  (Array.isArray(selectedValues) ? selectedValues : []).forEach((value) => addValue(value));
  renderSelection();
  renderMenu();
  applyState();

  return field;
}

function normalizeChipValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createFallbackChip(value) {
  const chip = document.createElement('span');
  chip.textContent = value;
  return chip;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createChipsField
  };
}