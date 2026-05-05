/**
 * Unsplash Attribution Modal
 * Displays photographer attribution for current Unsplash background
 * Uses the design system's BaseModal for consistency
 */

const UnsplashAttributionModal = (() => {
  let attributionTooltip = null;

  /**
   * Show attribution dialog-modal for current Unsplash image
   */
  async function show() {
    try {
      const settings = await BackgroundsService.getBackgroundSettings();
      
      if (settings.type !== 'unsplash' || !settings.photographer) {
        console.warn('[UnsplashAttributionModal] No Unsplash background active');
        return;
      }

      const photographerUrl = settings.photographerUrl || settings.unsplashUrl || '#';

      if (typeof createDialogModal === 'function' && typeof showModal === 'function') {
        return new Promise((resolve) => {
          const content = document.createElement('div');
          content.className = 'unsplash-attribution-modal';

          const photographerLink = document.createElement('a');
          photographerLink.className = 'unsplash-attribution-modal__link';
          photographerLink.href = photographerUrl;
          photographerLink.target = '_blank';
          photographerLink.rel = 'noopener noreferrer';
          photographerLink.textContent = settings.photographer;

          const courtesyCopy = document.createElement('p');
          courtesyCopy.className = 'unsplash-attribution-modal__copy';
          courtesyCopy.appendChild(document.createTextNode('Photo courtesy of '));

          const unsplashLink = document.createElement('a');
          unsplashLink.className = 'unsplash-attribution-modal__link';
          unsplashLink.href = 'https://unsplash.com';
          unsplashLink.target = '_blank';
          unsplashLink.rel = 'noopener noreferrer';
          unsplashLink.textContent = 'Unsplash';

          courtesyCopy.appendChild(unsplashLink);

          if (settings.imageDescription) {
            const descEl = document.createElement('p');
            descEl.className = 'unsplash-attribution-modal__description';
            descEl.textContent = settings.imageDescription;
            content.appendChild(descEl);
          }

          content.appendChild(photographerLink);
          content.appendChild(courtesyCopy);

          const modal = createDialogModal({
            type: 'dialog',
            title: 'Background Photo Attribution',
            content,
            buttons: [
              { label: 'Close', type: 'common', role: 'cancel' }
            ],
            onClose: () => resolve(true)
          });

          showModal(modal);
        });
      }

      const modal = new BaseModal({
        title: 'Background Photo Attribution',
        customContent: `
          <div class="unsplash-attribution-modal">
            <a class="unsplash-attribution-modal__link" href="${escapeHtmlAttr(photographerUrl)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(settings.photographer)}
            </a>
            <p class="unsplash-attribution-modal__copy">
              Photo courtesy of <a class="unsplash-attribution-modal__link" href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a>
            </p>
          </div>
        `,
        confirmText: 'Close',
        cancelText: null
      });

      return modal.show();
    } catch (error) {
      console.error('[UnsplashAttributionModal] Error showing modal:', error);
      alert('Failed to load attribution information');
    }
  }

  /**
   * Utility: escape HTML special characters
   */
  function escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Utility: escape HTML attribute values (especially for href)
   */
  function escapeHtmlAttr(text) {
    if (!text) return '';
    return escapeHtml(text).replace(/"/g, '&quot;');
  }

  /**
   * Update button visibility based on current background
   */
  async function updateButtonVisibility() {
    try {
      const btn = document.getElementById('unsplash-attribution-btn');
      if (!btn) return;

      ensureTooltip(btn);

      const settings = await BackgroundsService.getBackgroundSettings();
      
      if (settings.type === 'unsplash' && settings.photographer) {
        btn.style.display = 'block';
      } else {
        btn.style.display = 'none';
      }
    } catch (error) {
      console.warn('[UnsplashAttributionModal] Error updating button visibility:', error);
    }
  }

  function ensureTooltip(btn) {
    if (attributionTooltip || typeof createTooltip !== 'function') {
      return;
    }

    attributionTooltip = createTooltip({
      text: 'Background Attribution',
      target: btn,
      position: 'bottom',
      delay: 'fast'
    });

    const wrapper = btn.parentElement;
    if (wrapper && wrapper.classList.contains('tooltip-trigger')) {
      wrapper.classList.add('tooltip-trigger--topbar-attribution');
    }
  }

  return {
    show,
    updateButtonVisibility
  };
})();
