/**
 * Search Bar Widget Component
 *
 * Design System Component - BMG-206
 * Composed widget for homepage search, provider display, and results menu.
 */

function createSearchBarWidget(options = {}) {
  const {
    placeholder = 'Search Oasis or the web...',
    value = '',
    provider = null,
    results = [],
    state,
    className = '',
    ariaLabel = 'Search',
    disabled = false,
    onInput = null,
    onSubmit = null,
    onEscape = null,
    onProviderClick = null,
    onResultClick = null
  } = options;

  const widget = document.createElement('div');
  widget.className = ['search-bar-widget', className].filter(Boolean).join(' ');
  widget._searchBarWidgetLockedState = typeof state === 'string';

  const field = document.createElement('div');
  field.className = 'search-bar-widget__field';

  const icon = document.createElement('span');
  icon.className = 'search-bar-widget__search-icon material-symbols-outlined';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = 'search';

  const input = document.createElement('input');
  input.className = 'search-bar-widget__input';
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value;
  input.disabled = Boolean(disabled);
  input.setAttribute('aria-label', ariaLabel);
  input.autocomplete = 'off';

  const providerControl = document.createElement(onProviderClick ? 'button' : 'span');
  providerControl.className = 'search-bar-widget__provider';
  if (onProviderClick) {
    providerControl.type = 'button';
    providerControl.setAttribute('aria-label', 'Choose search provider');
    providerControl.addEventListener('click', (event) => {
      event.stopPropagation();
      onProviderClick(widget);
    });
  } else {
    providerControl.setAttribute('aria-hidden', 'true');
  }
  const providerVisual = buildSearchBarWidgetProviderVisual(provider);
  if (providerVisual) {
    providerControl.appendChild(providerVisual);
  }

  field.append(icon, input, providerControl);
  widget.appendChild(field);

  const menu = document.createElement('div');
  menu.className = 'search-bar-widget__menu';
  widget.appendChild(menu);

  widget._searchBarWidget = {
    field,
    input,
    providerControl,
    menu,
    state: 'unfocused-idle',
    results: []
  };

  if (!widget._searchBarWidgetLockedState) {
    field.addEventListener('mouseenter', () => syncSearchBarWidgetAutoState(widget, 'hover'));
    field.addEventListener('mouseleave', () => syncSearchBarWidgetAutoState(widget, 'idle'));
    input.addEventListener('focus', () => syncSearchBarWidgetAutoState(widget, 'focus'));
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!widget.contains(document.activeElement)) {
          syncSearchBarWidgetAutoState(widget, 'blur');
        }
      }, 0);
    });
  }

  input.addEventListener('input', (event) => {
    if (typeof onInput === 'function') {
      onInput(event, input.value, widget);
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && typeof onSubmit === 'function') {
      onSubmit(event, input.value, widget);
    }

    if (event.key === 'Escape' && typeof onEscape === 'function') {
      onEscape(event, input.value, widget);
    }
  });

  field.addEventListener('click', (event) => {
    if (event.target.closest('.search-bar-widget__provider')) return;
    if (!disabled) {
      input.focus();
    }
  });

  setSearchBarWidgetResults(widget, results, { onResultClick });
  applySearchBarWidgetState(widget, state || (results.length ? 'results' : 'unfocused-idle'));

  return widget;
}

function buildSearchBarWidgetProviderVisual(provider) {
  const source = provider && typeof provider === 'object' && provider.visual !== undefined
    ? provider.visual
    : provider;

  if (!source) return null;

  if (source instanceof HTMLElement) {
    source.classList.add('search-bar-widget__provider-visual');
    return source;
  }

  if (typeof source !== 'string') {
    return null;
  }

  const trimmed = source.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('<svg')) {
    const wrap = document.createElement('span');
    wrap.className = 'search-bar-widget__provider-visual';
    wrap.innerHTML = trimmed;
    return wrap;
  }

  if (/^(https?:|data:|blob:|chrome-extension:)/.test(trimmed)) {
    const image = document.createElement('img');
    image.className = 'search-bar-widget__provider-visual search-bar-widget__provider-image';
    image.src = trimmed;
    image.alt = '';
    image.loading = 'lazy';
    return image;
  }

  if (/^[a-z0-9_]+$/i.test(trimmed) && trimmed.length <= 32) {
    const icon = document.createElement('span');
    icon.className = 'search-bar-widget__provider-visual material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = trimmed;
    return icon;
  }

  const text = document.createElement('span');
  text.className = 'search-bar-widget__provider-visual search-bar-widget__provider-text';
  text.textContent = trimmed;
  return text;
}

function createSearchBarWidgetResultItem(item, onResultClick, widget) {
  if (typeof createSearchResultItem === 'function') {
    return createSearchResultItem({
      title: item.title,
      details: item.details,
      meta: item.meta,
      leading: item.leading,
      state: item.state || 'idle',
      ariaLabel: item.ariaLabel,
      disabled: item.disabled,
      onClick: () => {
        if (typeof item.onClick === 'function') {
          item.onClick(item, widget);
        }
        if (typeof onResultClick === 'function') {
          onResultClick(item, widget);
        }
      }
    });
  }

  const fallback = document.createElement('button');
  fallback.type = 'button';
  fallback.className = 'search-bar-widget__fallback-result';
  fallback.textContent = item.title || '';
  fallback.addEventListener('click', () => {
    if (typeof onResultClick === 'function') {
      onResultClick(item, widget);
    }
  });
  return fallback;
}

function setSearchBarWidgetResults(widget, sections = [], options = {}) {
  const state = widget && widget._searchBarWidget;
  if (!state) return;

  const { onResultClick = null } = options;
  state.results = Array.isArray(sections) ? sections : [];
  state.menu.innerHTML = '';

  state.results.forEach((section) => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'search-bar-widget__section';

    if (section.title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'search-bar-widget__section-title';
      titleEl.textContent = section.title;
      sectionEl.appendChild(titleEl);
    }

    const items = Array.isArray(section.items) ? section.items : [];
    items.forEach((item) => {
      const rowWrap = document.createElement('div');
      rowWrap.className = 'search-bar-widget__section-item';
      rowWrap.appendChild(createSearchBarWidgetResultItem(item, onResultClick, widget));
      sectionEl.appendChild(rowWrap);
    });

    state.menu.appendChild(sectionEl);
  });

  if (!widget._searchBarWidgetLockedState) {
    applySearchBarWidgetState(widget, state.results.length ? 'results' : (document.activeElement === state.input ? 'focused-idle' : 'unfocused-idle'));
  }
}

function updateSearchBarWidgetValue(widget, value) {
  const input = widget && widget._searchBarWidget && widget._searchBarWidget.input;
  if (!input) return;
  input.value = value;
}

function updateSearchBarWidgetPlaceholder(widget, placeholder) {
  const input = widget && widget._searchBarWidget && widget._searchBarWidget.input;
  if (!input) return;
  input.placeholder = placeholder;
}

function updateSearchBarWidgetProvider(widget, provider) {
  const state = widget && widget._searchBarWidget;
  if (!state) return;
  state.providerControl.innerHTML = '';
  const visual = buildSearchBarWidgetProviderVisual(provider);
  if (visual) {
    state.providerControl.appendChild(visual);
  }
}

function setSearchBarWidgetDisabled(widget, disabled) {
  const state = widget && widget._searchBarWidget;
  if (!state) return;
  state.input.disabled = Boolean(disabled);
  widget.classList.toggle('search-bar-widget--disabled', Boolean(disabled));
}

function applySearchBarWidgetState(widget, nextState) {
  if (!widget || !widget.classList) return;

  const normalized = normalizeSearchBarWidgetState(nextState);
  widget.classList.remove(
    'search-bar-widget--unfocused-idle',
    'search-bar-widget--unfocused-hover',
    'search-bar-widget--focused-idle',
    'search-bar-widget--focused-hover',
    'search-bar-widget--results'
  );
  widget.classList.add(`search-bar-widget--${normalized}`);

  if (widget._searchBarWidget) {
    widget._searchBarWidget.state = normalized;
  }
}

function normalizeSearchBarWidgetState(state) {
  const normalized = String(state || '').toLowerCase().replace(/[\s/]+/g, '-');
  const aliases = {
    'unfocused-idle': 'unfocused-idle',
    'un-focused-idle': 'unfocused-idle',
    'un-focused---idle': 'unfocused-idle',
    'unfocused-hover': 'unfocused-hover',
    'un-focused-hover': 'unfocused-hover',
    'focused-idle': 'focused-idle',
    'focused-hover': 'focused-hover',
    'results': 'results',
    'results-menu': 'results'
  };
  return aliases[normalized] || 'unfocused-idle';
}

function syncSearchBarWidgetAutoState(widget, signal) {
  if (!widget || widget._searchBarWidgetLockedState || !widget._searchBarWidget) return;
  const state = widget._searchBarWidget;
  const hasResults = Array.isArray(state.results) && state.results.length > 0;

  if (hasResults && document.activeElement === state.input && (signal === 'focus' || signal === 'idle')) {
    applySearchBarWidgetState(widget, 'results');
    return;
  }

  switch (signal) {
    case 'focus':
      applySearchBarWidgetState(widget, 'focused-idle');
      break;
    case 'hover':
      applySearchBarWidgetState(widget, document.activeElement === state.input ? 'focused-hover' : 'unfocused-hover');
      break;
    case 'blur':
      applySearchBarWidgetState(widget, 'unfocused-idle');
      break;
    default:
      applySearchBarWidgetState(widget, document.activeElement === state.input ? 'focused-idle' : 'unfocused-idle');
      break;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSearchBarWidget,
    setSearchBarWidgetResults,
    updateSearchBarWidgetValue,
    updateSearchBarWidgetPlaceholder,
    updateSearchBarWidgetProvider,
    setSearchBarWidgetDisabled,
    applySearchBarWidgetState
  };
}