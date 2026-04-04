/**
 * Chip Component
 *
 * Design System Component - BMG-202
 *
 * @example
 * const chip = createChip({
 *   text: 'Research',
 *   contrast: 'low',
 *   onRemove: () => console.log('removed')
 * });
 */

function createChip(options = {}) {
  const {
    text = 'Chip',
    contrast = 'low',
    state = 'idle',
    dismissible = true,
    onRemove = null,
    onClick = null
  } = options;

  const chip = document.createElement('div');
  chip.className = `chip chip--${contrast}`;

  const textEl = document.createElement('span');
  textEl.className = 'chip__text';
  textEl.textContent = text;
  chip.appendChild(textEl);

  if (state === 'hover') {
    chip.classList.add('chip--hover');
  }

  if (typeof onClick === 'function') {
    chip.classList.add('chip--interactive');
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.addEventListener('click', () => onClick(chip));
    chip.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(chip);
      }
    });
  }

  if (dismissible) {
    const dismissButton = document.createElement('button');
    dismissButton.className = 'chip__dismiss';
    dismissButton.type = 'button';
    dismissButton.setAttribute('aria-label', `Remove ${text}`);
    dismissButton.innerHTML = "<svg viewBox='0 0 10 10' aria-hidden='true'><path d='M2 2L8 8'></path><path d='M8 2L2 8'></path></svg>";
    dismissButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (typeof onRemove === 'function') {
        onRemove(chip);
      }
    });
    chip.appendChild(dismissButton);
  }

  return chip;
}

function updateChipText(chip, text) {
  const textEl = chip.querySelector('.chip__text');
  if (textEl) {
    textEl.textContent = text;
  }

  const dismissButton = chip.querySelector('.chip__dismiss');
  if (dismissButton) {
    dismissButton.setAttribute('aria-label', `Remove ${text}`);
  }
}

function updateChipContrast(chip, contrast) {
  chip.classList.remove('chip--low', 'chip--high');
  chip.classList.add(`chip--${contrast}`);
}

function applyChipState(chip, state) {
  chip.classList.toggle('chip--hover', state === 'hover');
}

function createChipGroup(chips = [], options = {}) {
  const {
    gap = '8px',
    wrap = true
  } = options;

  const group = document.createElement('div');
  group.className = 'chip-group';
  group.style.display = 'flex';
  group.style.gap = gap;
  group.style.flexWrap = wrap ? 'wrap' : 'nowrap';
  group.style.alignItems = 'center';

  chips.forEach((chipConfig) => {
    group.appendChild(createChip(chipConfig));
  });

  return group;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createChip,
    updateChipText,
    updateChipContrast,
    applyChipState,
    createChipGroup
  };
}