/**
 * Segmented Control Component
 *
 * Design System Component - BMG-211
 * Based on Figma: node-id=227-14872
 *
 * Compact single-select control with optional title.
 */

function createSegmentedControl(options = {}) {
  const {
    items = [],
    selectedValue = items.find((item) => item && item.selected)?.value ?? items[0]?.value ?? null,
    title = '',
    showTitle = Boolean(title),
    ariaLabel = '',
    contrast = 'low',
    disabled = false,
    className = '',
    onChange = null
  } = options;

  const control = document.createElement('div');
  control.className = [
    'segmented-control',
    `segmented-control--${contrast}`,
    disabled ? 'segmented-control--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  control._segmentedControl = {
    items: normalizeSegmentedControlItems(items),
    selectedValue,
    onChange,
    disabled: Boolean(disabled)
  };

  if (showTitle) {
    const titleEl = document.createElement('span');
    titleEl.className = 'segmented-control__title';
    titleEl.textContent = title;
    control.appendChild(titleEl);
  }

  const surface = document.createElement('div');
  surface.className = 'segmented-control__surface';
  surface.setAttribute('role', 'radiogroup');
  surface.setAttribute('aria-label', ariaLabel || title || 'Segmented control');
  if (disabled) {
    surface.setAttribute('aria-disabled', 'true');
  }
  control.appendChild(surface);

  renderSegmentedControlItems(control);
  return control;
}

function normalizeSegmentedControlItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item, index) => ({
      label: item.label || `Option ${index + 1}`,
      value: item.value ?? item.label ?? `option-${index + 1}`,
      disabled: Boolean(item.disabled)
    }));
}

function renderSegmentedControlItems(control) {
  const config = control?._segmentedControl;
  const surface = control?.querySelector('.segmented-control__surface');
  if (!config || !surface) return;

  surface.innerHTML = '';

  config.items.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'segmented-control__item';
    button.setAttribute('role', 'radio');
    button.dataset.segmentedControlValue = String(item.value);

    const selected = item.value === config.selectedValue;
    button.setAttribute('aria-checked', selected ? 'true' : 'false');
    button.classList.toggle('segmented-control__item--selected', selected);

    if (index === config.items.length - 1) {
      button.classList.add('segmented-control__item--last');
    }

    if (config.disabled || item.disabled) {
      button.disabled = true;
      button.classList.add('segmented-control__item--disabled');
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'segmented-control__item-label';
    labelEl.textContent = item.label;
    button.appendChild(labelEl);

    button.addEventListener('click', () => {
      if (button.disabled) return;
      setSegmentedControlValue(control, item.value, { emit: true, focusValue: item.value });
    });

    button.addEventListener('keydown', (event) => handleSegmentedControlKeydown(event, control, item.value));
    surface.appendChild(button);
  });
}

function handleSegmentedControlKeydown(event, control, value) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(event.key)) return;

  event.preventDefault();
  const config = control?._segmentedControl;
  if (!config) return;

  const enabledItems = config.items.filter((item) => !item.disabled);
  if (!enabledItems.length) return;

  const currentIndex = enabledItems.findIndex((item) => item.value === value);
  let nextItem = enabledItems[currentIndex] || enabledItems[0];

  if (event.key === 'ArrowLeft') {
    nextItem = enabledItems[(currentIndex - 1 + enabledItems.length) % enabledItems.length];
  }
  if (event.key === 'ArrowRight') {
    nextItem = enabledItems[(currentIndex + 1) % enabledItems.length];
  }
  if (event.key === 'Home') {
    nextItem = enabledItems[0];
  }
  if (event.key === 'End') {
    nextItem = enabledItems[enabledItems.length - 1];
  }

  setSegmentedControlValue(control, nextItem.value, { emit: true, focusValue: nextItem.value });
}

function setSegmentedControlValue(control, value, options = {}) {
  const { emit = false, focusValue = null } = options;
  const config = control?._segmentedControl;
  if (!config || config.disabled) return;

  const nextItem = config.items.find((item) => item.value === value && !item.disabled);
  if (!nextItem) return;

  config.selectedValue = nextItem.value;
  renderSegmentedControlItems(control);

  if (focusValue !== null) {
    const nextButton = control.querySelector(`[data-segmented-control-value="${CSS.escape(String(focusValue))}"]`);
    nextButton?.focus();
  }

  if (emit && typeof config.onChange === 'function') {
    config.onChange(nextItem.value, nextItem, control);
  }
}

function getSegmentedControlValue(control) {
  return control?._segmentedControl?.selectedValue ?? null;
}

function updateSegmentedControlItems(control, items, options = {}) {
  const config = control?._segmentedControl;
  if (!config) return;

  config.items = normalizeSegmentedControlItems(items);
  const { selectedValue = config.selectedValue } = options;
  config.selectedValue = config.items.some((item) => item.value === selectedValue)
    ? selectedValue
    : config.items[0]?.value ?? null;

  renderSegmentedControlItems(control);
}

function updateSegmentedControlTitle(control, title) {
  const titleEl = control?.querySelector('.segmented-control__title');
  if (titleEl) {
    titleEl.textContent = title;
  }
}

function setSegmentedControlDisabled(control, disabled) {
  const config = control?._segmentedControl;
  if (!config) return;

  config.disabled = Boolean(disabled);
  control.classList.toggle('segmented-control--disabled', Boolean(disabled));
  const surface = control.querySelector('.segmented-control__surface');
  if (surface) {
    if (disabled) {
      surface.setAttribute('aria-disabled', 'true');
    } else {
      surface.removeAttribute('aria-disabled');
    }
  }

  renderSegmentedControlItems(control);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSegmentedControl,
    setSegmentedControlValue,
    getSegmentedControlValue,
    updateSegmentedControlItems,
    updateSegmentedControlTitle,
    setSegmentedControlDisabled
  };
}