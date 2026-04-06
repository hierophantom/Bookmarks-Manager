/**
 * Setting Section Component
 *
 * Design System Component - BMG-178
 * Shared settings block with title, description, body, and optional divider.
 */

function createSettingSection(options = {}) {
  const {
    title = '',
    description = '',
    content = null,
    footer = null,
    contrast = 'high',
    divided = true,
    compact = false,
    className = ''
  } = options;

  const section = document.createElement('section');
  section.className = [
    'setting-section',
    `setting-section--${contrast}`,
    divided ? 'setting-section--divided' : '',
    compact ? 'setting-section--compact' : '',
    className
  ].filter(Boolean).join(' ');

  if (title || description) {
    const header = document.createElement('div');
    header.className = 'setting-section__header';

    if (title) {
      const titleEl = document.createElement('h3');
      titleEl.className = 'setting-section__title';
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }

    if (description) {
      const descriptionEl = document.createElement('p');
      descriptionEl.className = 'setting-section__description';
      descriptionEl.textContent = description;
      header.appendChild(descriptionEl);
    }

    section.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'setting-section__body';
  appendSettingSectionContent(body, content);
  section.appendChild(body);

  if (footer) {
    const footerEl = document.createElement('div');
    footerEl.className = 'setting-section__footer';
    appendSettingSectionContent(footerEl, footer);
    section.appendChild(footerEl);
  }

  return section;
}

function appendSettingSectionContent(target, content) {
  if (!content) return;

  if (Array.isArray(content)) {
    content.forEach((item) => appendSettingSectionContent(target, item));
    return;
  }

  if (content instanceof HTMLElement) {
    target.appendChild(content);
    return;
  }

  if (typeof content === 'string') {
    target.insertAdjacentHTML('beforeend', content);
  }
}

function updateSettingSectionTitle(section, title) {
  let titleEl = section.querySelector('.setting-section__title');
  if (!titleEl && title) {
    const header = ensureSettingSectionHeader(section);
    titleEl = document.createElement('h3');
    titleEl.className = 'setting-section__title';
    header.prepend(titleEl);
  }
  if (titleEl) {
    titleEl.textContent = title;
  }
}

function updateSettingSectionDescription(section, description) {
  let descriptionEl = section.querySelector('.setting-section__description');
  if (!descriptionEl && description) {
    const header = ensureSettingSectionHeader(section);
    descriptionEl = document.createElement('p');
    descriptionEl.className = 'setting-section__description';
    header.appendChild(descriptionEl);
  }
  if (descriptionEl) {
    descriptionEl.textContent = description;
  }
}

function replaceSettingSectionBody(section, content) {
  const body = section.querySelector('.setting-section__body');
  if (!body) return;
  body.innerHTML = '';
  appendSettingSectionContent(body, content);
}

function ensureSettingSectionHeader(section) {
  let header = section.querySelector('.setting-section__header');
  if (!header) {
    header = document.createElement('div');
    header.className = 'setting-section__header';
    section.insertBefore(header, section.firstChild || null);
  }
  return header;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSettingSection,
    updateSettingSectionTitle,
    updateSettingSectionDescription,
    replaceSettingSectionBody
  };
}
