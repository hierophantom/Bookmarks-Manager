/**
 * Option Card Component
 *
 * Design System Component - BMG-204
 * Selectable card used for compact option choices like themes.
 */

function createOptionCard(options = {}) {
  const {
    label = '',
    description = '',
    meta = '',
    swatches = [],
    leading = null,
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
    'option-card',
    `option-card--${contrast}`,
    selected ? 'option-card--selected' : '',
    disabled ? 'option-card--disabled' : '',
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
  content.className = 'option-card__content';

  const labelEl = document.createElement('span');
  labelEl.className = 'option-card__label';
  labelEl.textContent = label;
  content.appendChild(labelEl);

  if (description) {
    const descriptionEl = document.createElement('span');
    descriptionEl.className = 'option-card__description';
    descriptionEl.textContent = description;
    content.appendChild(descriptionEl);
  }

  card.appendChild(content);

  if (meta) {
    const metaEl = document.createElement('span');
    metaEl.className = 'option-card__meta';
    metaEl.textContent = meta;
    card.appendChild(metaEl);
  }

  if (typeof onClick === 'function' && !disabled) {
    card.addEventListener('click', () => onClick(card));
  }

  return card;
}

function buildOptionCardLeading(swatches, leading) {
  if (leading instanceof HTMLElement) {
    const wrap = document.createElement('div');
    wrap.className = 'option-card__leading';
    wrap.appendChild(leading);
    return wrap;
  }

  if (!Array.isArray(swatches) || swatches.length === 0) {
    return null;
  }

  const swatchWrap = document.createElement('div');
  swatchWrap.className = 'option-card__swatches';

  swatches.slice(0, 3).forEach((swatch) => {
    const swatchEl = document.createElement('span');
    swatchEl.className = 'option-card__swatch';
    swatchEl.style.background = swatch;
    swatchWrap.appendChild(swatchEl);
  });

  return swatchWrap;
}

function setOptionCardSelected(card, selected) {
  card.classList.toggle('option-card--selected', Boolean(selected));
  card.setAttribute('aria-pressed', selected ? 'true' : 'false');
}

function setOptionCardDisabled(card, disabled) {
  card.disabled = Boolean(disabled);
  card.classList.toggle('option-card--disabled', Boolean(disabled));
}

function updateOptionCardLabel(card, label) {
  const labelEl = card.querySelector('.option-card__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

function updateOptionCardDescription(card, description) {
  let descriptionEl = card.querySelector('.option-card__description');
  const content = card.querySelector('.option-card__content');
  if (!content) return;

  if (!descriptionEl && description) {
    descriptionEl = document.createElement('span');
    descriptionEl.className = 'option-card__description';
    content.appendChild(descriptionEl);
  }

  if (descriptionEl) {
    descriptionEl.textContent = description;
    if (!description) {
      descriptionEl.remove();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createOptionCard,
    setOptionCardSelected,
    setOptionCardDisabled,
    updateOptionCardLabel,
    updateOptionCardDescription
  };
}