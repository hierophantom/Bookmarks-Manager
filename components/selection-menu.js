/**
 * Selection Menu Component
 * 
 * Design System Component - BMG-102
 * 
 * Variants: multi-select (tags), single-select (sort)
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
 * @param {string} [options.type='tag'] - 'tag' or 'sort'
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
    onSelect = null,
    onClear = null,
    onSelectAll = null
  } = options;

  const menu = document.createElement('div');
  menu.className = `selection-menu selection-menu--${contrast}`;

  const header = document.createElement('div');
  header.className = 'selection-menu__header';

  const headerTitle = document.createElement('div');
  headerTitle.className = 'selection-menu__title';
  headerTitle.textContent = title || (type === 'sort' ? 'Sort view' : 'Select tags:');
  header.appendChild(headerTitle);

  if (type === 'tag' && showClear) {
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

  const addTagItem = (label, index) => {
    const item = document.createElement('div');
    item.className = 'selection-menu__item';

    const checkbox = document.createElement('span');
    checkbox.className = 'selection-menu__checkbox';
    if (selectedIndices.includes(index)) {
      checkbox.classList.add('selection-menu__checkbox--checked');
    }

    const tagEl = typeof createTag === 'function'
      ? createTag({ text: label })
      : createSelectionMenuTag(label);

    item.appendChild(checkbox);
    item.appendChild(tagEl);

    item.addEventListener('click', () => {
      if (typeof onSelect === 'function') {
        onSelect(index, label);
      }
    });

    menu.appendChild(item);
  };

  const addSortItem = (label, index, isSelected) => {
    const item = document.createElement('div');
    item.className = 'selection-menu__item';
    if (isSelected) {
      item.classList.add('selection-menu__item--selected');
    }

    const check = document.createElement('span');
    check.className = 'selection-menu__checkmark';
    if (isSelected) {
      check.innerHTML = "<svg viewBox='0 0 12 12' aria-hidden='true'><path d='M4.5 8.5L2 6l1-1 1.5 1.5L9 2l1 1z'/></svg>";
    }

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    item.appendChild(check);
    item.appendChild(labelEl);

    item.addEventListener('click', () => {
      if (typeof onSelect === 'function') {
        onSelect(index, label);
      }
    });

    menu.appendChild(item);
  };

  if (type === 'tag') {
    items.forEach((label, index) => addTagItem(label, index));

    if (showSelectAll) {
      const selectAll = document.createElement('div');
      selectAll.className = 'selection-menu__select-all';

      const selectAllBtn = document.createElement('button');
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

  if (type === 'sort') {
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
