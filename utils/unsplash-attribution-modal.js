/**
 * Unsplash Attribution Modal
 * Displays photographer attribution for current Unsplash background
 * Uses the design system's BaseModal for consistency
 */

const UnsplashAttributionModal = (() => {
  /**
   * Show attribution modal for current Unsplash image
   */
  async function show() {
    try {
      const settings = await BackgroundsService.getBackgroundSettings();
      
      if (settings.type !== 'unsplash' || !settings.photographer) {
        console.warn('[UnsplashAttributionModal] No Unsplash background active');
        return;
      }

      if (typeof createModal === 'function' && typeof showModal === 'function') {
        return new Promise((resolve) => {
          const content = document.createElement('div');
          content.className = 'modal__form';
          content.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div>
                <p style="font-size:12px;font-weight:600;color:var(--theme-secondary);text-transform:uppercase;margin:0 0 6px 0;">Photographer</p>
                <a href="${escapeHtmlAttr(settings.photographerUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--theme-primary);text-decoration:none;font-weight:600;word-break:break-word;">
                  ${escapeHtml(settings.photographer)}
                </a>
              </div>
              <div style="padding:8px;background:var(--theme-background);border-radius:6px;font-size:12px;">
                <p style="margin:0;color:var(--theme-secondary);font-weight:600;text-transform:uppercase;margin-bottom:4px;">Attribution</p>
                <p style="margin:0;color:var(--theme-text);line-height:1.4;">
                  Photo courtesy of <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" style="color:var(--theme-primary);text-decoration:none;">Unsplash</a>
                </p>
              </div>
              <a href="${escapeHtmlAttr(settings.unsplashUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 12px;background:var(--theme-primary);color:white;border-radius:6px;text-decoration:none;font-weight:500;text-align:center;margin-top:4px;">
                View on Unsplash
              </a>
            </div>
          `;

          const modal = createModal({
            type: 'dialog',
            title: 'Photo Credit',
            content,
            buttons: [
              { label: 'Done', type: 'primary', role: 'confirm', shortcut: '↵' }
            ],
            onClose: () => resolve(true)
          });

          showModal(modal);
        });
      }

      const modal = new BaseModal({
        title: 'Photo Credit',
        customContent: `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <p style="font-size: 12px; font-weight: 600; color: var(--theme-secondary); text-transform: uppercase; margin: 0 0 6px 0;">Photographer</p>
              <a href="${escapeHtmlAttr(settings.photographerUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--theme-primary); text-decoration: none; font-weight: 600; word-break: break-word;">
                ${escapeHtml(settings.photographer)}
              </a>
            </div>
            <div style="padding: 8px; background: var(--theme-background); border-radius: 6px; font-size: 12px;">
              <p style="margin: 0; color: var(--theme-secondary); font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Attribution</p>
              <p style="margin: 0; color: var(--theme-text); line-height: 1.4;">
                Photo courtesy of <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" style="color: var(--theme-primary); text-decoration: none;">Unsplash</a>
              </p>
            </div>
            <a href="${escapeHtmlAttr(settings.unsplashUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 8px 12px; background: var(--theme-primary); color: white; border-radius: 6px; text-decoration: none; font-weight: 500; text-align: center; margin-top: 4px;">
              View on Unsplash
            </a>
          </div>
        `,
        confirmText: 'Done',
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

  return {
    show,
    updateButtonVisibility
  };
})();
