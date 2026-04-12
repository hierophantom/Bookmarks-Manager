/**
 * Selection Menu Component
 * 
 * Design System Component - BMG-102
 * 
 * Variants: multi-select (tags), multi-select (simple selection), single-select (sort)
 * 
 * @example
 * const menu = createSelectionMenu({
 *   type: 'tag',
 *   contrast: 'low',
 *   items: ['#value', '#value', '#value']
 * });
 */

/**
 * Creates a selection menu element
 * @param {Object} options - Menu configuration
 * @param {string} [options.type='tag'] - 'tag', 'simple', 'simple-selection', 'checkbox' (alias), or 'sort'
 * @param {string} [options.contrast='low'] - 'low' or 'high'
 * @param {string} [options.title] - Header title
 * @param {Array<string>} [options.items] - Item labels
 * @param {Array<{title: string, items: string[]}>} [options.sections] - Optional grouped items for sort
 * @param {number} [options.selectedIndex=0] - Selected index for sort menu
 * @param {Array<number>} [options.selectedIndices] - Selected indices for tag menu
 * @param {boolean} [options.showClear=true] - Show clear button (tag menu)
 * @param {boolean} [options.showSelectAll=true] - Show select all row (tag menu)
 * @param {Function} [options.onSelect] - Item select handler
 * @param {Function} [options.onClear] - Clear handler
 * @param {Function} [options.onSelectAll] - Select all handler
 * @returns {HTMLDivElement} The selection menu element
 */
function createSelectionMenu(options = {}) {
  const {
    type = 'tag',
    contrast = 'low',
    title,
    items = [],
    sections = [],
    selectedIndex = 0,
    selectedIndices = [],
    showClear = true,
    showSelectAll = true,
    showHeader = true,
    showSelectionIndicator = true,
    onSelect = null,
    onClear = null,
    onSelectAll = null
  } = options;

  const normalizedType = normalizeSelectionMenuType(type);
  const showSortIndicator = normalizedType === 'sort' && showSelectionIndicator !== false;

  const menu = document.createElement('div');
  menu.className = `selection-menu selection-menu--${contrast}`;
  menu.dataset.selectionMenuType = normalizedType;
  const isMultiSelect = normalizedType === 'tag' || normalizedType === 'simple';

  const updateSortSelection = (selectedItem, selectedLabel) => {
    if (!showSortIndicator) {
      if (typeof selectedLabel === 'string') {
        menu.dataset.selectedLabel = selectedLabel;
      }
      return;
    }

    const sortItems = menu.querySelectorAll('.selection-menu__item[data-selection-sort-item="true"]');
    sortItems.forEach((itemEl) => {
      const checkEl = itemEl.querySelector('.selection-menu__checkmark');
      const isSelected = itemEl === selectedItem;
      itemEl.classList.toggle('selection-menu__item--selected', isSelected);
      if (checkEl) {
        checkEl.innerHTML = isSelected
          ? "<svg viewBox='0 0 12 12' aria-hidden='true'><path d='M4.5 8.5L2 6l1-1 1.5 1.5L9 2l1 1z'/></svg>"
          : '';
      }
    });

    if (typeof selectedLabel === 'string') {
      menu.dataset.selectedLabel = selectedLabel;
    }
  };

  if (showHeader) {
    const header = document.createElement('div');
    header.className = 'selection-menu__header';

    const headerTitle = document.createElement('div');
    headerTitle.className = 'selection-menu__title';
    headerTitle.textContent = title || (normalizedType === 'sort' ? 'Sort view' : 'Select options');
    header.appendChild(headerTitle);

    if (isMultiSelect && showClear) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'selection-menu__clear';
      clearBtn.type = 'button';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', () => {
        if (typeof onClear === 'function') {
          onClear();
        }
      });
      header.appendChild(clearBtn);
    }

    menu.appendChild(header);
  }

  const addTagItem = (label, index) => {
    const descriptor = normalizeSelectionMenuItem(label);
    const item = document.createElement('div');
    item.className = 'selection-menu__item';
    makeSelectionMenuItemInteractive(item, () => {
      if (typeof onSelect === 'function') {
        onSelect(index, descriptor.label);
      }
    });

    const checkbox = createSelectionMenuCheckbox(selectedIndices.includes(index));

    const tagEl = typeof createTag === 'function'
      ? createTag({ text: descriptor.label })
      : createSelectionMenuTag(descriptor.label);

    item.appendChild(checkbox);
    item.appendChild(tagEl);

    menu.appendChild(item);
  };

  const addSimpleItem = (label, index) => {
    const descriptor = normalizeSelectionMenuItem(label);
    const item = document.createElement('div');
    item.className = 'selection-menu__item selection-menu__item--simple';
    if (selectedIndices.includes(index)) {
      item.classList.add('selection-menu__item--selected');
    }

    const checkbox = createSelectionMenuCheckbox(selectedIndices.includes(index));

    const textWrap = createSelectionMenuText(descriptor);

    item.appendChild(checkbox);
    item.appendChild(textWrap);

    makeSelectionMenuItemInteractive(item, () => {
      if (typeof onSelect === 'function') {
        onSelect(index, descriptor.label);
      }
    });

    menu.appendChild(item);
  };

  const addSortItem = (label, index, isSelected) => {
    const descriptor = normalizeSelectionMenuItem(label);
    const item = document.createElement('div');
    item.className = 'selection-menu__item';
    item.dataset.selectionSortItem = 'true';
    if (showSortIndicator && isSelected) {
      item.classList.add('selection-menu__item--selected');
    }

    if (showSortIndicator) {
      const check = document.createElement('span');
      check.className = 'selection-menu__checkmark';
      if (isSelected) {
        check.innerHTML = "<svg viewBox='0 0 12 12' aria-hidden='true'><path d='M4.5 8.5L2 6l1-1 1.5 1.5L9 2l1 1z'/></svg>";
      }
      item.appendChild(check);
    }

    item.appendChild(createSelectionMenuText(descriptor));

    makeSelectionMenuItemInteractive(item, () => {
      updateSortSelection(item, descriptor.label);
      if (typeof onSelect === 'function') {
        onSelect(index, descriptor.label);
      }
    });

    menu.appendChild(item);
  };

  const addCheckboxItem = (label, index) => {
    addSimpleItem(label, index);
  };

  if (normalizedType === 'tag') {
    items.forEach((label, index) => addTagItem(label, index));

    if (showSelectAll) {
      const selectAll = document.createElement('div');
      selectAll.className = 'selection-menu__select-all';

      const selectAllBtn = document.createElement('button');
      selectAllBtn.className = 'selection-menu__select-all-button';
      selectAllBtn.type = 'button';
      selectAllBtn.textContent = 'Select all';
      selectAllBtn.addEventListener('click', () => {
        if (typeof onSelectAll === 'function') {
          onSelectAll();
        }
      });

      selectAll.appendChild(selectAllBtn);
      menu.appendChild(selectAll);
    }
  }

  if (normalizedType === 'simple') {
    items.forEach((label, index) => addCheckboxItem(label, index));

    if (showSelectAll) {
      const selectAll = document.createElement('div');
      selectAll.className = 'selection-menu__select-all';

      const selectAllBtn = document.createElement('button');
      selectAllBtn.className = 'selection-menu__select-all-button';
      selectAllBtn.type = 'button';
      selectAllBtn.textContent = 'Select all';
      selectAllBtn.addEventListener('click', () => {
        if (typeof onSelectAll === 'function') {
          onSelectAll();
        }
      });
      selectAll.appendChild(selectAllBtn);
      menu.appendChild(selectAll);
    }
  }

  if (normalizedType === 'sort') {
    if (sections.length > 0) {
      let offset = 0;
      sections.forEach(section => {
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'selection-menu__section-title';
        sectionTitle.textContent = section.title;
        menu.appendChild(sectionTitle);

        section.items.forEach((label, index) => {
          addSortItem(label, offset + index, selectedIndex === offset + index);
        });
        offset += section.items.length;
      });
    } else {
      items.forEach((label, index) => addSortItem(label, index, selectedIndex === index));
    }
  }

  return menu;
}

function normalizeSelectionMenuItem(item) {
  if (item && typeof item === 'object') {
    return {
      label: String(item.label || item.title || ''),
      description: item.description ? String(item.description) : ''
    };
  }

  return {
    label: String(item || ''),
    description: ''
  };
}

function createSelectionMenuText(descriptor) {
  if (descriptor.description) {
    const wrap = document.createElement('span');
    wrap.className = 'selection-menu__text selection-menu__text--with-description';

    const labelEl = document.createElement('span');
    labelEl.className = 'selection-menu__label';
    labelEl.textContent = descriptor.label;

    const descriptionEl = document.createElement('span');
    descriptionEl.className = 'selection-menu__description';
    descriptionEl.textContent = descriptor.description;

    wrap.appendChild(labelEl);
    wrap.appendChild(descriptionEl);
    return wrap;
  }

  const labelEl = document.createElement('span');
  labelEl.className = 'selection-menu__label';
  labelEl.textContent = descriptor.label;
  return labelEl;
}

function makeSelectionMenuItemInteractive(item, onActivate) {
  item.tabIndex = 0;
  item.addEventListener('click', onActivate);
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  });
}

function normalizeSelectionMenuType(type) {
  if (type === 'checkbox' || type === 'simple-selection') {
    return 'simple';
  }
  return type;
}

function createSelectionMenuCheckbox(checked) {
  const checkbox = document.createElement('span');
  checkbox.className = 'selection-menu__checkbox';
  if (checked) {
    checkbox.classList.add('selection-menu__checkbox--checked');
  }
  checkbox.innerHTML = "<svg viewBox='0 0 16 16' aria-hidden='true'><rect x='2.25' y='2.25' width='11.5' height='11.5' rx='1.5'></rect><path d='M5 8.25L7 10.25L11 6.25'></path></svg>";
  return checkbox;
}

/**
 * Creates a basic tag element for selection menu when Tag component is unavailable
 * @param {string} label - Tag text
 * @returns {HTMLSpanElement}
 */
function createSelectionMenuTag(label) {
  const tag = document.createElement('span');
  tag.className = 'selection-menu__tag';
  tag.textContent = label;
  return tag;
}

/**
 * Updates selection menu contrast mode
 * @param {HTMLDivElement} menu - Selection menu element
 * @param {string} contrast - 'low' or 'high'
 */
function updateSelectionMenuContrast(menu, contrast) {
  menu.classList.remove('selection-menu--low', 'selection-menu--high');
  menu.classList.add(`selection-menu--${contrast}`);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSelectionMenu,
    createSelectionMenuTag,
    updateSelectionMenuContrast
  };
}
