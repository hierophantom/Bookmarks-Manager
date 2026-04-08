/**
 * Journey Node Card Component
 *
 * Design System Component - BMG-209
 * Based on Figma: node-id=227-14918
 *
 * Journey graph node shell with origin, branch, and end-point variants.
 */

function createJourneyNodeCard(options = {}) {
  const {
    variant = 'origin',
    state = 'idle',
    domain = 'Domain',
    url = 'URL',
    faviconUrl = '',
    favicon = null,
    menuItems = [
      { value: 'open', label: 'Open in new tab' },
      { value: 'save', label: 'Save to bookmarks' }
    ],
    className = '',
    disabled = false,
    onClick = null,
    onMenuToggle = null,
    onMenuAction = null
  } = options;

  const card = document.createElement('div');
  card.className = [
    'journey-node-card',
    `journey-node-card--${normalizeJourneyNodeVariant(variant)}`,
    `journey-node-card--${normalizeJourneyNodeState(state)}`,
    disabled ? 'journey-node-card--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const visualButton = document.createElement('button');
  visualButton.type = 'button';
  visualButton.className = 'journey-node-card__visual';
  visualButton.disabled = Boolean(disabled);
  visualButton.setAttribute('aria-label', `${domain}, ${url}`);
  if (typeof onClick === 'function' && !disabled) {
    visualButton.addEventListener('click', () => onClick(card));
  }
  card.appendChild(visualButton);

  const iconStage = document.createElement('div');
  iconStage.className = 'journey-node-card__icon-stage';
  visualButton.appendChild(iconStage);

  const shell = document.createElement('div');
  shell.className = 'journey-node-card__shell';
  iconStage.appendChild(shell);

  const faviconEl = createJourneyNodeCardFavicon({ faviconUrl, favicon });
  if (faviconEl) {
    iconStage.appendChild(faviconEl);
  }

  const details = document.createElement('div');
  details.className = 'journey-node-card__details';

  const domainEl = document.createElement('span');
  domainEl.className = 'journey-node-card__domain';
  domainEl.textContent = domain;
  details.appendChild(domainEl);

  const urlEl = document.createElement('span');
  urlEl.className = 'journey-node-card__url';
  urlEl.textContent = url;
  details.appendChild(urlEl);

  card.appendChild(details);

  if (typeof onMenuToggle === 'function') {
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.className = 'journey-node-card__menu-trigger';
    actionButton.setAttribute('aria-label', 'Open node actions');
    actionButton.setAttribute('aria-expanded', normalizeJourneyNodeState(state) === 'menu-open' ? 'true' : 'false');
    actionButton.innerHTML = "<span class='material-symbols-outlined' aria-hidden='true'>more_vert</span>";
    if (!disabled) {
      actionButton.addEventListener('click', (event) => {
        event.stopPropagation();
        onMenuToggle(card, actionButton);
      });
    }
    card.appendChild(actionButton);
  }

  if (normalizeJourneyNodeState(state) === 'menu-open') {
    const menu = document.createElement('div');
    menu.className = 'journey-node-card__menu';

    normalizeJourneyNodeMenuItems(menuItems).forEach((item) => {
      const menuButton = document.createElement('button');
      menuButton.type = 'button';
      menuButton.className = 'journey-node-card__menu-item';
      menuButton.textContent = item.label;
      if (item.disabled) {
        menuButton.disabled = true;
      }
      if (typeof onMenuAction === 'function' && !item.disabled) {
        menuButton.addEventListener('click', (event) => {
          event.stopPropagation();
          onMenuAction(item.value, item, card);
        });
      }
      menu.appendChild(menuButton);
    });

    card.appendChild(menu);
  }

  return card;
}

function normalizeJourneyNodeVariant(variant) {
  return ['origin', 'branch', 'end-point'].includes(variant) ? variant : 'origin';
}

function normalizeJourneyNodeState(state) {
  return ['idle', 'hover', 'menu-open'].includes(state) ? state : 'idle';
}

function normalizeJourneyNodeMenuItems(menuItems) {
  return (Array.isArray(menuItems) ? menuItems : [])
    .filter(Boolean)
    .map((item, index) => ({
      label: item.label || `Action ${index + 1}`,
      value: item.value ?? item.label ?? `action-${index + 1}`,
      disabled: Boolean(item.disabled)
    }));
}

function createJourneyNodeCardFavicon(options = {}) {
  const { faviconUrl = '', favicon = null } = options;

  if (favicon instanceof HTMLElement) {
    favicon.classList.add('journey-node-card__favicon');
    return favicon;
  }

  if (faviconUrl && typeof FaviconService !== 'undefined' && typeof FaviconService.createFaviconElement === 'function') {
    return FaviconService.createFaviconElement(faviconUrl, {
      size: 40,
      className: 'journey-node-card__favicon',
      alt: ''
    });
  }

  const fallback = document.createElement('span');
  fallback.className = 'journey-node-card__favicon journey-node-card__favicon--fallback';
  fallback.setAttribute('aria-hidden', 'true');
  return fallback;
}

function setJourneyNodeCardState(card, state) {
  card.classList.remove('journey-node-card--idle', 'journey-node-card--hover', 'journey-node-card--menu-open');
  card.classList.add(`journey-node-card--${normalizeJourneyNodeState(state)}`);
}

function updateJourneyNodeCardVariant(card, variant) {
  card.classList.remove('journey-node-card--origin', 'journey-node-card--branch', 'journey-node-card--end-point');
  card.classList.add(`journey-node-card--${normalizeJourneyNodeVariant(variant)}`);
}

function updateJourneyNodeCardContent(card, options = {}) {
  const { domain, url } = options;
  const domainEl = card.querySelector('.journey-node-card__domain');
  const urlEl = card.querySelector('.journey-node-card__url');
  if (domainEl && typeof domain === 'string') {
    domainEl.textContent = domain;
  }
  if (urlEl && typeof url === 'string') {
    urlEl.textContent = url;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createJourneyNodeCard,
    setJourneyNodeCardState,
    updateJourneyNodeCardVariant,
    updateJourneyNodeCardContent
  };
}