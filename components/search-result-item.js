/**
 * Search Result Item Component
 *
 * Design System Component - BMG-205
 * Result row used in search dropdown surfaces.
 * States: idle, hover, focused
 */

function createSearchResultItem(options = {}) {
  const {
    title = '',
    details = '',
    meta = '',
    leading = null,
    state = 'idle',
    disabled = false,
    className = '',
    ariaLabel = '',
    onClick = null
  } = options;

  const item = document.createElement('button');
  item.type = 'button';
  item.className = [
    'search-result-item',
    disabled ? 'search-result-item--disabled' : '',
    className
  ].filter(Boolean).join(' ');
  item.disabled = Boolean(disabled);
  item.setAttribute('aria-label', ariaLabel || title || 'Search result');

  const surface = document.createElement('span');
  surface.className = 'search-result-item__surface';
  item.appendChild(surface);

  const leadingEl = buildSearchResultItemLeading(leading);
  if (leadingEl) {
    surface.appendChild(leadingEl);
  }

  const content = document.createElement('span');
  content.className = 'search-result-item__content';

  const titleEl = document.createElement('span');
  titleEl.className = 'search-result-item__title';
  titleEl.textContent = title;
  content.appendChild(titleEl);

  const detailsEl = document.createElement('span');
  detailsEl.className = 'search-result-item__details';
  detailsEl.textContent = details;
  if (!details) {
    detailsEl.hidden = true;
  }
  content.appendChild(detailsEl);

  surface.appendChild(content);

  const metaEl = document.createElement('span');
  metaEl.className = 'search-result-item__meta';
  metaEl.textContent = meta;
  if (!meta) {
    metaEl.hidden = true;
  }
  surface.appendChild(metaEl);

  applySearchResultItemState(item, state);

  if (typeof onClick === 'function' && !disabled) {
    item.addEventListener('click', () => onClick(item));
  }

  return item;
}

function buildSearchResultItemLeading(leading) {
  if (!leading) return null;

  const wrap = document.createElement('span');
  wrap.className = 'search-result-item__leading';

  if (leading instanceof HTMLElement) {
    wrap.appendChild(leading);
    return wrap;
  }

  if (typeof leading !== 'string') {
    return wrap;
  }

  const trimmed = leading.trim();
  if (!trimmed) {
    return wrap;
  }

  if (trimmed.startsWith('<svg')) {
    wrap.innerHTML = trimmed;
    return wrap;
  }

  if (/^(https?:|data:|blob:|chrome-extension:)/.test(trimmed)) {
    const img = document.createElement('img');
    img.className = 'search-result-item__image';
    img.src = trimmed;
    img.alt = '';
    img.loading = 'lazy';
    wrap.appendChild(img);
    return wrap;
  }

  if (/^[a-z0-9_]+$/i.test(trimmed) && trimmed.length <= 32) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = trimmed;
    wrap.appendChild(icon);
    return wrap;
  }

  const text = document.createElement('span');
  text.className = 'search-result-item__leading-text';
  text.textContent = trimmed;
  wrap.appendChild(text);
  return wrap;
}

function applySearchResultItemState(item, state) {
  if (!item || !item.classList) return;

  const normalized = ['idle', 'hover', 'focused'].includes(state) ? state : 'idle';
  item.classList.remove(
    'search-result-item--idle',
    'search-result-item--hover',
    'search-result-item--focused'
  );
  item.classList.add(`search-result-item--${normalized}`);
}

function updateSearchResultItemTitle(item, title) {
  const titleEl = item.querySelector('.search-result-item__title');
  if (titleEl) {
    titleEl.textContent = title;
  }
}

function updateSearchResultItemDetails(item, details) {
  const detailsEl = item.querySelector('.search-result-item__details');
  if (detailsEl) {
    detailsEl.textContent = details;
    detailsEl.hidden = !details;
  }
}

function updateSearchResultItemMeta(item, meta) {
  const metaEl = item.querySelector('.search-result-item__meta');
  if (metaEl) {
    metaEl.textContent = meta;
    metaEl.hidden = !meta;
  }
}

function updateSearchResultItemLeading(item, leading) {
  const existing = item.querySelector('.search-result-item__leading');
  const surface = item.querySelector('.search-result-item__surface');
  if (!surface) return;

  if (existing) {
    existing.remove();
  }

  const next = buildSearchResultItemLeading(leading);
  if (next) {
    surface.insertBefore(next, surface.firstChild);
  }
}

function setSearchResultItemDisabled(item, disabled) {
  item.disabled = Boolean(disabled);
  item.classList.toggle('search-result-item--disabled', Boolean(disabled));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSearchResultItem,
    applySearchResultItemState,
    updateSearchResultItemTitle,
    updateSearchResultItemDetails,
    updateSearchResultItemMeta,
    updateSearchResultItemLeading,
    setSearchResultItemDisabled
  };
}