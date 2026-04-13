const AboutModal = (() => {
  const LINKEDIN_URL = 'https://www.linkedin.com/in/lior-matza-6334223a/';

  function createContent() {
    const content = document.createElement('div');
    content.className = 'about-modal';

    const copy = document.createElement('p');
    copy.className = 'about-modal__copy';
    copy.appendChild(document.createTextNode('Journey was made by '));

    const authorLink = document.createElement('a');
    authorLink.className = 'about-modal__link';
    authorLink.href = LINKEDIN_URL;
    authorLink.target = '_blank';
    authorLink.rel = 'noopener noreferrer';
    authorLink.textContent = 'Lior Matza';

    copy.appendChild(authorLink);
    copy.appendChild(document.createTextNode(' with ❤️ & 🤖'));

    content.appendChild(copy);
    return content;
  }

  function show() {
    try {
      if (typeof createModal === 'function' && typeof showModal === 'function') {
        return new Promise((resolve) => {
          const modal = createModal({
            type: 'dialog',
            title: 'About Journey',
            content: createContent(),
            buttons: [
              { label: 'Close', type: 'common', role: 'cancel' }
            ],
            onClose: () => resolve(true)
          });

          showModal(modal);
        });
      }

      if (typeof BaseModal !== 'undefined') {
        const modal = new BaseModal({
          title: 'About Journey',
          customContent: `
            <div class="about-modal">
              <p class="about-modal__copy">
                Journey was made by <a class="about-modal__link" href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer">Lior Matza</a> with ❤️ & 🤖
              </p>
            </div>
          `,
          confirmText: 'Close',
          cancelText: null
        });

        return modal.show();
      }

      if (typeof Modal !== 'undefined' && Modal.openNotice) {
        Modal.openNotice({
          title: 'About Journey',
          message: `Journey was made by Lior Matza with ❤️ & 🤖\n${LINKEDIN_URL}`,
          buttonText: 'Close'
        });
        return null;
      }

      console.error('Modal object not available');
      return null;
    } catch (error) {
      console.error('Error opening about modal:', error);
      return null;
    }
  }

  return {
    show
  };
})();