/**
 * Journey Origin Item Component
 *
 * Design System Component - BMG-210
 * Based on Figma: node-id=227-14806
 *
 * Selectable left-rail item for Journey sessions.
 */

function createJourneyOriginItem(options = {}) {
  const {
    title = '',
    details = [],
    faviconUrl = '',
    favicon = null,
    state = 'idle',
    active = state === 'active',
    disabled = false,
    className = '',
    ariaLabel = '',
    onClick = null
  } = options;

  const item = document.createElement('button');
  item.type = 'button';
  item.className = [
    'journey-origin-item',
    active ? 'journey-origin-item--active' : '',
    disabled ? 'journey-origin-item--disabled' : '',
    className
  ].filter(Boolean).join(' ');
  item.disabled = Boolean(disabled);
  item.setAttribute('aria-pressed', active ? 'true' : 'false');
  item.setAttribute('aria-label', ariaLabel || buildJourneyOriginItemAriaLabel(title, details));

  if (state === 'hover') {
    item.classList.add('journey-origin-item--hover');
  }

  const header = document.createElement('div');
  header.className = 'journey-origin-item__header';

  const leading = createJourneyOriginItemLeading({ faviconUrl, favicon });
  if (leading) {
    header.appendChild(leading);
  }

  const titleEl = document.createElement('span');
  titleEl.className = 'journey-origin-item__title';
  titleEl.textContent = title || 'Untitled session';
  header.appendChild(titleEl);

  item.appendChild(header);

  normalizeJourneyOriginDetails(details).forEach((detail) => {
    const detailEl = document.createElement('span');
    detailEl.className = 'journey-origin-item__detail';
    detailEl.textContent = detail;
    item.appendChild(detailEl);
  });

  if (typeof onClick === 'function' && !disabled) {
    item.addEventListener('click', () => onClick(item));
  }

  return item;
}

function createJourneyOriginItemLeading(options = {}) {
  const { faviconUrl = '', favicon = null } = options;

  if (favicon instanceof HTMLElement) {
    const wrap = document.createElement('span');
    wrap.className = 'journey-origin-item__leading';
    wrap.appendChild(favicon);
    return wrap;
  }

  if (faviconUrl && typeof FaviconService !== 'undefined' && typeof FaviconService.createFaviconElement === 'function') {
    return FaviconService.createFaviconElement(faviconUrl, {
      size: 24,
      className: 'journey-origin-item__leading',
      alt: ''
    });
  }

  return null;
}

function normalizeJourneyOriginDetails(details) {
  return (Array.isArray(details) ? details : [])
    .filter((detail) => typeof detail === 'string' && detail.trim())
    .slice(0, 2);
}

function buildJourneyOriginItemAriaLabel(title, details) {
  return [title, ...normalizeJourneyOriginDetails(details)].filter(Boolean).join(', ');
}

function setJourneyOriginItemActive(item, active) {
  item.classList.toggle('journey-origin-item--active', Boolean(active));
  item.setAttribute('aria-pressed', active ? 'true' : 'false');
}

function applyJourneyOriginItemState(item, state) {
  item.classList.toggle('journey-origin-item--hover', state === 'hover');
}

function updateJourneyOriginItemTitle(item, title) {
  const titleEl = item.querySelector('.journey-origin-item__title');
  if (titleEl) {
    titleEl.textContent = title;
  }
}

function updateJourneyOriginItemDetails(item, details) {
  item.querySelectorAll('.journey-origin-item__detail').forEach((detail) => detail.remove());
  normalizeJourneyOriginDetails(details).forEach((detail) => {
    const detailEl = document.createElement('span');
    detailEl.className = 'journey-origin-item__detail';
    detailEl.textContent = detail;
    item.appendChild(detailEl);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createJourneyOriginItem,
    setJourneyOriginItemActive,
    applyJourneyOriginItemState,
    updateJourneyOriginItemTitle,
    updateJourneyOriginItemDetails
  };
}