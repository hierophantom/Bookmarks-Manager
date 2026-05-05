/**
 * Option Card Component
 *
 * Design System Component - BMG-204
 * Selectable card used for compact option choices like themes.
 */

function createSelectCard(options = {}) {
  const {
    label = '',
    description = '',
    meta = '',
    counter = null,
    swatches = [],
    leading = null,
    trailing = null,
    selected = false,
    disabled = false,
    contrast = 'high',
    value = '',
    name = '',
    className = '',
    onClick = null
  } = options;

  const card = document.createElement('button');
  card.type = 'button';
  card.className = [
    'select-card',
    `select-card--${contrast}`,
    selected ? 'select-card--selected' : '',
    disabled ? 'select-card--disabled' : '',
    className
  ].filter(Boolean).join(' ');
  card.disabled = Boolean(disabled);
  card.setAttribute('aria-pressed', selected ? 'true' : 'false');

  if (name) {
    card.dataset.optionCardName = name;
  }

  if (value !== undefined && value !== null && value !== '') {
    card.dataset.optionCardValue = String(value);
  }

  const leadingEl = buildOptionCardLeading(swatches, leading);
  if (leadingEl) {
    card.appendChild(leadingEl);
  }

  const content = document.createElement('div');
  content.className = 'select-card__content';

  const labelEl = document.createElement('span');
  labelEl.className = 'select-card__label';
  labelEl.textContent = label;
  content.appendChild(labelEl);

  if (description) {
    const descriptionEl = document.createElement('span');
    descriptionEl.className = 'select-card__description';
    descriptionEl.textContent = description;
    content.appendChild(descriptionEl);
  }

  card.appendChild(content);

  if (meta) {
    const metaEl = document.createElement('span');
    metaEl.className = 'select-card__meta';
    metaEl.textContent = meta;
    card.appendChild(metaEl);
  }

  if (counter !== null && counter !== undefined) {
    const counterEl = document.createElement('span');
    counterEl.className = 'select-card__counter';
    counterEl.textContent = String(counter);
    card.appendChild(counterEl);
  }

  const trailingEl = buildOptionCardTrailing(trailing);
  if (trailingEl) {
    card.appendChild(trailingEl);
  }

  if (typeof onClick === 'function' && !disabled) {
    card.addEventListener('click', () => onClick(card));
  }

  return card;
}

function buildOptionCardLeading(swatches, leading) {
  if (leading instanceof HTMLElement) {
    const wrap = document.createElement('div');
    wrap.className = 'select-card__leading';
    wrap.appendChild(leading);
    return wrap;
  }

  if (!Array.isArray(swatches) || swatches.length === 0) {
    return null;
  }

  const swatchWrap = document.createElement('div');
  swatchWrap.className = 'select-card__swatches';

  swatches.slice(0, 3).forEach((swatch) => {
    const swatchEl = document.createElement('span');
    swatchEl.className = 'select-card__swatch';
    swatchEl.style.background = swatch;
    swatchWrap.appendChild(swatchEl);
  });

  return swatchWrap;
}

function buildOptionCardTrailing(trailing) {
  if (!trailing) return null;

  const wrap = document.createElement('div');
  wrap.className = 'select-card__trailing';

  if (trailing instanceof HTMLElement) {
    wrap.appendChild(trailing);
    return wrap;
  }

  if (typeof trailing === 'string') {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = trailing;
    wrap.appendChild(icon);
    return wrap;
  }

  return null;
}

function setOptionCardSelected(card, selected) {
  card.classList.toggle('select-card--selected', Boolean(selected));
  card.setAttribute('aria-pressed', selected ? 'true' : 'false');
}

function setOptionCardDisabled(card, disabled) {
  card.disabled = Boolean(disabled);
  card.classList.toggle('select-card--disabled', Boolean(disabled));
}

function updateOptionCardLabel(card, label) {
  const labelEl = card.querySelector('.select-card__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

function updateOptionCardDescription(card, description) {
  let descriptionEl = card.querySelector('.select-card__description');
  const content = card.querySelector('.select-card__content');
  if (!content) return;

  if (!descriptionEl && description) {
    descriptionEl = document.createElement('span');
    descriptionEl.className = 'select-card__description';
    content.appendChild(descriptionEl);
  }

  if (descriptionEl) {
    descriptionEl.textContent = description;
    if (!description) {
      descriptionEl.remove();
    }
  }
}

function updateOptionCardCounter(card, counter) {
  let counterEl = card.querySelector('.select-card__counter');

  if (counter === null || counter === undefined) {
    if (counterEl) counterEl.remove();
    return;
  }

  if (!counterEl) {
    counterEl = document.createElement('span');
    counterEl.className = 'select-card__counter';
    const trailing = card.querySelector('.select-card__trailing');
    if (trailing) {
      card.insertBefore(counterEl, trailing);
    } else {
      card.appendChild(counterEl);
    }
  }

  counterEl.textContent = String(counter);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSelectCard,
    setOptionCardSelected,
    setOptionCardDisabled,
    updateOptionCardLabel,
    updateOptionCardDescription,
    updateOptionCardCounter
  };
}