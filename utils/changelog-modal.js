const ChangelogModal = (() => {
  const CHANGELOG_PATH = '../docs/CHANGELOG.md';
  const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/gnjemfenbappbegfjoonoacjnpakkdil?utm_source=item-share-cb';

  async function show() {
    const overlay = createOverlay();
    const modal = createModalShell();
    const content = createLoadingState();
    const footer = createFooter(overlay);

    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close();
      }
    });

    const closeButton = footer.querySelector('[data-action="close"]');
    if (closeButton) {
      closeButton.addEventListener('click', () => close());
      setTimeout(() => closeButton.focus(), 60);
    }

    const shareButton = footer.querySelector('[data-action="share"]');
    if (shareButton) {
      shareButton.addEventListener('click', async () => {
        await shareLatestVersion(shareButton);
      });
    }

    try {
      const markdown = await loadMarkdown();
      const versions = parseVersions(markdown);
      const nextContent = buildContent(versions);
      content.replaceWith(nextContent);
    } catch (error) {
      const errorState = createStatusState('Could not load changelog.');
      content.replaceWith(errorState);
      console.error('Failed to open changelog modal:', error);
    }

    function close() {
      document.removeEventListener('keydown', handleKeydown);
      overlay.classList.add('modal-overlay--exiting');
      modal.classList.add('modal--exiting');
      setTimeout(() => {
        overlay.remove();
      }, 200);
    }
  }

  async function loadMarkdown() {
    const response = await fetch(resolvePath(CHANGELOG_PATH));
    if (!response.ok) {
      throw new Error('Unable to load changelog markdown');
    }
    return response.text();
  }

  function parseVersions(markdown) {
    if (!window.ChangelogParser || typeof window.ChangelogParser.parse !== 'function') {
      throw new Error('Changelog parser is unavailable');
    }
    return window.ChangelogParser.parse(markdown);
  }

  function resolvePath(relativePath) {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      return chrome.runtime.getURL(relativePath.replace(/^\.\.\//, ''));
    }
    return relativePath;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay modal-overlay--entering';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'changelog-modal-title');
    return overlay;
  }

  function createModalShell() {
    const modal = document.createElement('div');
    modal.className = 'modal modal--form changelog-modal-shell modal--entering';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'changelog-modal__heading';

    const title = document.createElement('h2');
    title.className = 'modal__title';
    title.id = 'changelog-modal-title';
    title.textContent = 'Changelog';

    titleWrap.appendChild(title);
    modal.appendChild(titleWrap);
    return modal;
  }

  function createLoadingState() {
    return createStatusState('Loading changelog...');
  }

  function createStatusState(message) {
    const state = document.createElement('div');
    state.className = 'changelog-modal__status';
    state.textContent = message;
    return state;
  }

  function buildContent(versions) {
    const content = document.createElement('div');
    content.className = 'changelog-modal__content';

    if (!Array.isArray(versions) || versions.length === 0) {
      content.appendChild(createStatusState('No changelog entries available yet.'));
      return content;
    }

    versions.forEach((version) => {
      content.appendChild(buildVersionBlock(version));
    });

    return content;
  }

  function buildVersionBlock(version) {
    const section = document.createElement('section');
    section.className = 'changelog-modal__version';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'changelog-modal__version-header';

    const heading = document.createElement('h3');
    heading.className = 'changelog-modal__version-title';
    heading.textContent = version.heading;
    titleWrap.appendChild(heading);

    if (Array.isArray(version.tags) && version.tags.length > 0) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'changelog-modal__tags';
      version.tags.slice(0, 3).forEach((tagText) => {
        tagsRow.appendChild(createPillTag(tagText));
      });
      titleWrap.appendChild(tagsRow);
    }

    section.appendChild(titleWrap);

    if (version.summary) {
      const summary = document.createElement('p');
      summary.className = 'changelog-modal__summary';
      summary.textContent = version.summary;
      section.appendChild(summary);
    }

    version.sections.forEach((group) => {
      const groupWrap = document.createElement('div');
      groupWrap.className = 'changelog-modal__group';

      const groupTitle = document.createElement('p');
      groupTitle.className = 'changelog-modal__group-title';
      groupTitle.textContent = `${group.title}:`;
      groupWrap.appendChild(groupTitle);

      const list = document.createElement('ul');
      list.className = 'changelog-modal__list';

      group.items.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.className = 'changelog-modal__list-item';
        if (item.title) {
          const title = document.createElement('span');
          title.className = 'changelog-modal__item-title';
          title.textContent = `${item.title}: `;
          listItem.appendChild(title);
        }
        listItem.appendChild(document.createTextNode(item.text));
        list.appendChild(listItem);
      });

      groupWrap.appendChild(list);
      section.appendChild(groupWrap);
    });

    return section;
  }

  function createPillTag(text) {
    if (typeof createTag === 'function') {
      return createTag({
        text,
        customColor: {
          background: 'var(--common-common-bright-05, rgba(255, 255, 255, 0.1))',
          text: 'var(--common-common-bright-25, rgba(255, 255, 255, 0.9))'
        }
      });
    }

    const pill = document.createElement('span');
    pill.className = 'changelog-modal__pill';
    pill.textContent = text;
    return pill;
  }

  function createFooter(overlay) {
    const footer = document.createElement('div');
    footer.className = 'changelog-modal__actions';

    const closeButton = typeof createCommonButton === 'function'
      ? createCommonButton({ label: 'Close', contrast: 'low' })
      : document.createElement('button');
    if (!closeButton.className) closeButton.textContent = 'Close';
    closeButton.classList.add('modal__action-btn', 'changelog-modal__action-btn');
    closeButton.dataset.action = 'close';

    const shareButton = typeof createPrimaryButton === 'function'
      ? createPrimaryButton({ label: 'Share with a friend', contrast: 'high' })
      : document.createElement('button');
    if (!shareButton.className) shareButton.textContent = 'Share with a friend';
    shareButton.classList.add('modal__action-btn', 'changelog-modal__action-btn');
    shareButton.dataset.action = 'share';

    footer.appendChild(closeButton);
    footer.appendChild(shareButton);
    footer._overlay = overlay;
    return footer;
  }

  async function shareLatestVersion(button) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(CHROME_WEB_STORE_URL);
        updateShareLabel(button, 'Copied link');
        return;
      }

      const fallbackField = document.createElement('textarea');
      fallbackField.value = CHROME_WEB_STORE_URL;
      fallbackField.setAttribute('readonly', 'true');
      fallbackField.style.position = 'absolute';
      fallbackField.style.left = '-9999px';
      document.body.appendChild(fallbackField);
      fallbackField.select();
      const copied = document.execCommand('copy');
      fallbackField.remove();
      updateShareLabel(button, copied ? 'Copied link' : 'Unavailable');
    } catch (error) {
      if (error && error.name !== 'AbortError') {
        console.error('Failed to share changelog:', error);
        updateShareLabel(button, 'Try again');
      }
    }
  }

  function updateShareLabel(button, label) {
    if (typeof updatePrimaryButtonLabel === 'function') {
      updatePrimaryButtonLabel(button, label);
    } else {
      button.textContent = label;
    }
    clearTimeout(button._labelTimer);
    button._labelTimer = setTimeout(() => {
      if (typeof updatePrimaryButtonLabel === 'function') {
        updatePrimaryButtonLabel(button, 'Share with a friend');
      } else {
        button.textContent = 'Share with a friend';
      }
    }, 1800);
  }

  return {
    show
  };
})();
