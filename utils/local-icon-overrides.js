/**
 * LocalIconOverrides
 *
 * Optional local SVG icon replacement for Material Symbols.
 *
 * How it works:
 * - Default behavior remains Material Symbols from CDN.
 * - If a matching local SVG exists for an icon name, the span is replaced with a
 *   mask-based local icon that inherits currentColor from the component.
 * - If no local file exists, the original Material span stays in place.
 *
 * Drop custom icons here:
 *   assets/icons/materials/<icon-name>.svg
 *
 * Example:
 *   assets/icons/material/search.svg
 *   assets/icons/material/info.svg
 *   assets/icons/material/conversion_path.svg
 */
(function bootstrapLocalIconOverrides() {
  const BASE_PATH = 'assets/icons/materials';
  const ICON_NAME_ALIASES = {
    apps: 'Apps',
    landscape: 'Landscape',
    conversion_path: 'Path',
    close: 'close_small',
    chevron_right: 'keyboard_arrow_right',
    south_west: 'subdirectory_arrow_right',
    expand_more: 'keyboard_arrow_down'
  };
  let observer = null;

  function candidateNames(iconName) {
    const original = String(iconName || '').trim();
    if (!original) return [];

    const lower = original.toLowerCase();
    const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
    const aliased = ICON_NAME_ALIASES[lower];

    return [...new Set([original, lower, capitalized, aliased].filter(Boolean))];
  }

  function getIconUrl(iconName, overrideName = null) {
    const safeName = String(overrideName || iconName || '').trim();
    if (!safeName) return null;
    const relative = `${BASE_PATH}/${safeName}.svg`;
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      return chrome.runtime.getURL(relative);
    }
    return `/${relative}`;
  }

  function createMaskedIconElement(sourceSpan, iconName, candidate, iconUrl) {
    const el = document.createElement('span');
    el.className = `${sourceSpan.className} app-local-icon`;
    el.setAttribute('aria-hidden', sourceSpan.getAttribute('aria-hidden') || 'true');
    el.dataset.materialIconName = iconName;
    el.dataset.materialIconSource = candidate;
    if (sourceSpan.id) el.id = sourceSpan.id;
    el.style.setProperty('--app-local-icon-url', `url("${iconUrl}")`);
    return el;
  }

  function upgradeOne(span) {
    if (!span || span.tagName !== 'SPAN') return;
    if (!span.classList.contains('material-symbols-outlined')) return;
    if (span.dataset.localIconProcessed === 'true') return;

    // Keep the canonical Material icon rendering when online.
    if (typeof navigator !== 'undefined' && navigator.onLine !== false) return;

    span.dataset.localIconProcessed = 'true';

    const iconName = (span.textContent || '').trim();
    const names = candidateNames(iconName);
    if (!names.length) return;

    let idx = 0;
    let settled = false;

    function tryNext() {
      if (settled || idx >= names.length) return;
      const candidate = names[idx++];
      const iconUrl = getIconUrl(iconName, candidate);
      if (!iconUrl) {
        tryNext();
        return;
      }

      const probe = new Image();
      probe.onload = () => {
        if (settled) return;
        settled = true;
        const masked = createMaskedIconElement(span, iconName, candidate, iconUrl);
        span.replaceWith(masked);
      };

      // Missing icon file should not change current behavior.
      probe.onerror = () => {
        if (settled) return;
        tryNext();
      };

      probe.src = iconUrl;
    }

    tryNext();
  }

  function upgrade(root) {
    if (!root || !root.querySelectorAll) return;
    const spans = root.querySelectorAll('span.material-symbols-outlined');
    spans.forEach(upgradeOne);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches('span.material-symbols-outlined')) {
            upgradeOne(node);
            return;
          }
          if (node.querySelectorAll) {
            upgrade(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function restoreMaterialIcons(root = document) {
    if (!root || !root.querySelectorAll) return;
    const replaced = root.querySelectorAll('.app-local-icon[data-material-icon-name]');
    replaced.forEach((el) => {
      const token = el.dataset.materialIconName;
      if (!token) return;
      const span = document.createElement('span');
      span.className = 'material-symbols-outlined';
      span.setAttribute('aria-hidden', el.getAttribute('aria-hidden') || 'true');
      span.textContent = token;
      if (el.id) span.id = el.id;
      el.replaceWith(span);
    });
  }

  function syncByNetworkState() {
    if (typeof navigator === 'undefined') return;
    if (navigator.onLine === false) {
      upgrade(document);
    } else {
      restoreMaterialIcons(document);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncByNetworkState();
    startObserver();

    window.addEventListener('offline', syncByNetworkState);
    window.addEventListener('online', syncByNetworkState);
    window.addEventListener('focus', syncByNetworkState);
    document.addEventListener('visibilitychange', syncByNetworkState);
  });
})();
