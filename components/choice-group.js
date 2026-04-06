/**
 * Choice Group Component
 *
 * Design System Component - BMG-178
 * Shared radio or checkbox group for settings flows.
 */

let choiceGroupIdCounter = 0;

function createChoiceGroup(options = {}) {
  const {
    type = 'radio',
    legend = '',
    name = '',
    items = [],
    contrast = 'high',
    columns = 1,
    className = '',
    onChange = null
  } = options;

  const normalizedType = type === 'checkbox' ? 'checkbox' : 'radio';
  const inputName = name || `choice-group-${++choiceGroupIdCounter}`;
  const group = document.createElement('fieldset');
  group.className = [
    'choice-group',
    `choice-group--${normalizedType}`,
    `choice-group--${contrast}`,
    className
  ].filter(Boolean).join(' ');
  group.dataset.choiceGroupType = normalizedType;
  group.dataset.choiceGroupName = inputName;

  if (legend) {
    const legendEl = document.createElement('legend');
    legendEl.className = 'choice-group__legend';
    legendEl.textContent = legend;
    group.appendChild(legendEl);
  }

  const itemsWrap = document.createElement('div');
  itemsWrap.className = 'choice-group__items';
  itemsWrap.style.setProperty('--choice-group-columns', Math.max(1, Number(columns) || 1));

  items.forEach((item, index) => {
    itemsWrap.appendChild(createChoiceGroupItem({
      item,
      index,
      type: normalizedType,
      name: inputName,
      contrast,
      onChange,
      group
    }));
  });

  group.appendChild(itemsWrap);
  return group;
}

function createChoiceGroupItem({ item = {}, index = 0, type = 'radio', name = '', contrast = 'high', onChange = null, group = null }) {
  const {
    label = '',
    description = '',
    value = `${index}`,
    checked = false,
    disabled = false,
    meta = null,
    metaType = 'text'
  } = item;

  const itemEl = document.createElement('label');
  itemEl.className = 'choice-group__item';
  if (disabled) {
    itemEl.classList.add('choice-group__item--disabled');
  }

  const input = document.createElement('input');
  input.className = 'choice-group__item-input';
  input.type = type;
  input.name = name;
  input.value = value;
  input.checked = Boolean(checked);
  input.disabled = Boolean(disabled);

  const control = document.createElement('span');
  control.className = 'choice-group__item-control';
  control.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'choice-group__item-body';

  const copy = document.createElement('div');
  copy.className = 'choice-group__item-copy';

  const labelEl = document.createElement('span');
  labelEl.className = 'choice-group__item-label';
  labelEl.textContent = label;
  copy.appendChild(labelEl);

  if (description) {
    const descriptionEl = document.createElement('span');
    descriptionEl.className = 'choice-group__item-description';
    descriptionEl.textContent = description;
    copy.appendChild(descriptionEl);
  }

  body.appendChild(copy);

  if (meta !== null && meta !== undefined && meta !== '') {
    const metaEl = document.createElement('div');
    metaEl.className = 'choice-group__item-meta';
    appendChoiceGroupMeta(metaEl, meta, metaType, contrast);
    body.appendChild(metaEl);
  }

  itemEl.appendChild(input);
  itemEl.appendChild(control);
  itemEl.appendChild(body);

  input.addEventListener('change', () => {
    if (typeof onChange === 'function') {
      onChange({
        value: type === 'checkbox' ? getChoiceGroupValues(group) : getChoiceGroupValue(group),
        changedValue: value,
        checked: input.checked,
        input,
        item: itemEl,
        group
      });
    }
  });

  return itemEl;
}

function appendChoiceGroupMeta(target, meta, metaType, contrast) {
  if (metaType === 'tag' && typeof createTag === 'function') {
    const tagEl = createTag({
      text: String(meta),
      contrast: contrast === 'low' ? 'low' : 'high',
      size: 'small'
    });
    if (tagEl) {
      tagEl.classList.add('choice-group__tag');
      target.appendChild(tagEl);
      return;
    }
  }

  const textEl = document.createElement('span');
  textEl.className = 'choice-group__item-meta-text';
  textEl.textContent = String(meta);
  target.appendChild(textEl);
}

function getChoiceGroupValue(group) {
  const checked = group.querySelector('.choice-group__item-input:checked');
  return checked ? checked.value : null;
}

function getChoiceGroupValues(group) {
  return Array.from(group.querySelectorAll('.choice-group__item-input:checked')).map((input) => input.value);
}

function setChoiceGroupValue(group, value) {
  const type = group.dataset.choiceGroupType || 'radio';
  const values = Array.isArray(value) ? value.map(String) : [String(value)];
  group.querySelectorAll('.choice-group__item-input').forEach((input) => {
    input.checked = type === 'checkbox'
      ? values.includes(input.value)
      : input.value === values[0];
  });
}

function setChoiceGroupDisabled(group, disabled) {
  group.querySelectorAll('.choice-group__item-input').forEach((input) => {
    input.disabled = Boolean(disabled);
    input.closest('.choice-group__item')?.classList.toggle('choice-group__item--disabled', Boolean(disabled));
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createChoiceGroup,
    getChoiceGroupValue,
    getChoiceGroupValues,
    setChoiceGroupValue,
    setChoiceGroupDisabled
  };
}
