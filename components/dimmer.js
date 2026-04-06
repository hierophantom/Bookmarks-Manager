/**
 * Dimmer Component
 *
 * Design System Component - BMG-178
 * Centered slider used for darkening or lightening a background.
 */

function createDimmer(options = {}) {
  const {
    min = -70,
    max = 70,
    step = 1,
    value = 0,
    leftLabel = 'Dimmest',
    centerLabel = 'None',
    rightLabel = 'Lightest',
    showValue = false,
    contrast = 'high',
    disabled = false,
    className = '',
    onInput = null,
    onChange = null
  } = options;

  const dimmer = document.createElement('div');
  dimmer.className = ['dimmer', `dimmer--${contrast}`, disabled ? 'dimmer--disabled' : '', className].filter(Boolean).join(' ');

  const control = document.createElement('div');
  control.className = 'dimmer__control';

  const track = document.createElement('div');
  track.className = 'dimmer__track';

  const darkHalf = document.createElement('div');
  darkHalf.className = 'dimmer__track-half dimmer__track-half--dark';
  const lightHalf = document.createElement('div');
  lightHalf.className = 'dimmer__track-half dimmer__track-half--light';
  track.appendChild(darkHalf);
  track.appendChild(lightHalf);

  const thumb = document.createElement('div');
  thumb.className = 'dimmer__thumb';

  const input = document.createElement('input');
  input.className = 'dimmer__input';
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.disabled = Boolean(disabled);
  input.setAttribute('aria-label', 'Dimmer');

  control.appendChild(track);
  control.appendChild(thumb);
  control.appendChild(input);

  const labels = document.createElement('div');
  labels.className = 'dimmer__labels';

  const left = document.createElement('span');
  left.className = 'dimmer__label dimmer__label--start';
  left.textContent = leftLabel;

  const middle = document.createElement('span');
  middle.className = showValue ? 'dimmer__value' : 'dimmer__label dimmer__label--center';
  middle.textContent = showValue ? formatDimmerValue(value) : centerLabel;

  const right = document.createElement('span');
  right.className = 'dimmer__label dimmer__label--end';
  right.textContent = rightLabel;

  labels.appendChild(left);
  labels.appendChild(middle);
  labels.appendChild(right);

  dimmer.appendChild(control);
  dimmer.appendChild(labels);

  const syncVisuals = () => {
    const numericValue = Number(input.value);
    const percent = getDimmerPercent(numericValue, min, max);
    dimmer.style.setProperty('--dimmer-thumb-left', `${percent}%`);
    if (showValue) {
      middle.textContent = formatDimmerValue(numericValue);
    }
  };

  input.addEventListener('input', () => {
    syncVisuals();
    if (typeof onInput === 'function') {
      onInput(Number(input.value), input, dimmer);
    }
  });

  input.addEventListener('change', () => {
    if (typeof onChange === 'function') {
      onChange(Number(input.value), input, dimmer);
    }
  });

  syncVisuals();
  return dimmer;
}

function getDimmerPercent(value, min, max) {
  if (max <= min) return 50;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

function formatDimmerValue(value) {
  return value > 0 ? `+${value}%` : `${value}%`;
}

function setDimmerValue(dimmer, value) {
  const input = dimmer.querySelector('.dimmer__input');
  if (!input) return;
  input.value = String(value);
  const event = new Event('input', { bubbles: true });
  input.dispatchEvent(event);
}

function getDimmerValue(dimmer) {
  const input = dimmer.querySelector('.dimmer__input');
  return input ? Number(input.value) : 0;
}

function setDimmerDisabled(dimmer, disabled) {
  const input = dimmer.querySelector('.dimmer__input');
  if (!input) return;
  input.disabled = Boolean(disabled);
  dimmer.classList.toggle('dimmer--disabled', Boolean(disabled));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createDimmer,
    getDimmerValue,
    setDimmerValue,
    setDimmerDisabled
  };
}