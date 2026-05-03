/**
 * Selection Item Component
 *
 * Design System Component - BMG-240
 *
 * Types:
 * - link (optional leading icon)
 * - single (on/off indicator)
 * - multi (checkbox indicator)
 * - destructive
 * - divider
 *
 * Input variants:
 * - text
 * - tag
 *
 * Interaction states:
 * - idle
 * - hover
 * - active
 * - focus-visible
 *
 * Accessibility:
 * - non-divider items render as keyboard-focusable buttons
 * - divider renders with role="separator"
 */
function createSelectionItem(options = {}) {
  const {
    type = 'link',
    inputType = 'text',
    label = '',
    description = '',
    icon = null,
    selected = false,
    checked = false,
    disabled = false,
    onClick = null
  } = options;

  if (type === 'divider') {
    return createSelectionItemDivider();
  }

  const item = document.createElement('button');
  item.type = 'button';
  item.className = `selection-item selection-item--${normalizeSelectionItemType(type)} selection-item--${normalizeSelectionItemInputType(inputType)}`;

  if (disabled) {
    item.classList.add('selection-item--disabled');
    item.disabled = true;
  }

  const isMulti = type === 'multi';
  const isSingle = type === 'single';
  const isSelected = isSingle ? Boolean(selected) : Boolean(checked);

  if (isSingle || isMulti) {
    const control = document.createElement('span');
    control.className = `selection-item__control selection-item__control--${isSingle ? 'single' : 'multi'}`;
    if (isSelected) {
      control.classList.add('selection-item__control--selected');
    }
    item.appendChild(control);
  }

  if (type === 'link' && icon) {
    const iconWrap = document.createElement('span');
    iconWrap.className = 'selection-item__icon';

    if (icon instanceof HTMLElement) {
      iconWrap.appendChild(icon);
    } else if (typeof icon === 'string') {
      const iconEl = document.createElement('span');
      iconEl.className = 'material-symbols-outlined';
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.textContent = icon;
      iconWrap.appendChild(iconEl);
    }

    item.appendChild(iconWrap);
  }

  if (normalizeSelectionItemInputType(inputType) === 'tag') {
    if (typeof createTag === 'function') {
      const tag = createTag({ text: String(label || '') });
      tag.classList.add('selection-item__tag');
      item.appendChild(tag);
    } else {
      const fallbackTag = document.createElement('span');
      fallbackTag.className = 'selection-item__tag';
      fallbackTag.textContent = String(label || '');
      item.appendChild(fallbackTag);
    }
  } else {
    const textWrap = document.createElement('span');
    textWrap.className = 'selection-item__text';

    const labelEl = document.createElement('span');
    labelEl.className = 'selection-item__label';
    labelEl.textContent = String(label || '');
    textWrap.appendChild(labelEl);

    if (description) {
      const descriptionEl = document.createElement('span');
      descriptionEl.className = 'selection-item__description';
      descriptionEl.textContent = String(description);
      textWrap.appendChild(descriptionEl);
    }

    item.appendChild(textWrap);
  }

  if (typeof onClick === 'function') {
    item.addEventListener('click', onClick);
  }

  return item;
}

function createSelectionItemDivider() {
  const divider = document.createElement('div');
  divider.className = 'selection-item-divider';
  divider.setAttribute('role', 'separator');
  return divider;
}

function normalizeSelectionItemType(type) {
  const value = String(type || 'link').toLowerCase();
  if (value === 'single' || value === 'multi' || value === 'destructive' || value === 'link') {
    return value;
  }
  return 'link';
}

function normalizeSelectionItemInputType(inputType) {
  return String(inputType || 'text').toLowerCase() === 'tag' ? 'tag' : 'text';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSelectionItem,
    createSelectionItemDivider
  };
}
