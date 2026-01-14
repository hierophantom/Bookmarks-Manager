/**
 * Emoji Picker Component
 * Displays categorized emojis for selection
 */
const EmojiPicker = (() => {
  // Comprehensive emoji list by category
  const EMOJI_CATEGORIES = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'],
    'Objects': ['📁', '📂', '🗂️', '📚', '📖', '📝', '📄', '📃', '📋', '📊', '📈', '📉', '💼', '📌', '📍', '🔖', '🏷️', '📦', '📮', '📪', '📫', '📬', '📭', '🗳️', '✏️', '✒️', '🖊️', '🖋️', '🖍️', '📐', '📏', '🔗', '🔒', '🔓', '🔑', '🗝️', '🔨', '🛠️', '⚙️', '🔧', '🔩', '⚒️'],
    'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '⭐', '🌟', '✨', '⚡', '🔥', '💥', '💫', '💢', '💯', '✔️', '✅', '☑️', '✖️', '❌', '➕', '➖', '❓', '❔', '❗', '❕', '💤', '💬', '🗨️', '🗯️'],
    'Travel': ['🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🎡', '🎢', '🚂', '🚃', '🚄', '🚅', '🚆'],
    'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤺', '🤼', '🤸', '🤾', '🏇', '🧗', '🚴', '🚵', '🤹', '🎪', '🎭'],
    'Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐚', '🐞', '🐜', '🦗', '🦟', '🦂', '🌸', '🌺', '🌻', '🌷', '🌹'],
    'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥗', '🥔', '🍠', '🥐', '🥖', '🍞', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟'],
    'Flags': ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️'],
    'Popular': ['🎯', '💡', '🎨', '🎬', '🎮', '🎲', '🎧', '🎵', '🎶', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '📷', '📹', '🎥', '📞', '☎️', '📺', '📻', '⏰', '⏱️', '⏲️', '⌛', '⏳', '🔋', '🔌', '💰', '💵', '💴', '💶', '💷', '💳', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️']
  };

  /**
   * Show emoji picker modal
   * @returns {Promise<string|null>} Selected emoji or null if cancelled
   */
  function show(currentEmoji = null) {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.id = 'emoji-picker-overlay';
      overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

      // Create modal card
      const modal = document.createElement('div');
      modal.style.cssText = 'background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 600px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
      header.innerHTML = `
        <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: #111827;">Select Emoji</h2>
        <button id="emoji-picker-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; line-height: 1; padding: 0; width: 32px; height: 32px;">&times;</button>
      `;
      modal.appendChild(header);

      // Category tabs
      const tabs = document.createElement('div');
      tabs.style.cssText = 'display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;';
      
      Object.keys(EMOJI_CATEGORIES).forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = 'emoji-category-tab';
        tab.dataset.category = category;
        tab.textContent = category;
        tab.style.cssText = `
          padding: 8px 16px;
          border: none;
          background: ${index === 0 ? '#3b82f6' : '#f3f4f6'};
          color: ${index === 0 ? 'white' : '#6b7280'};
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          transition: all 0.2s;
        `;
        tab.addEventListener('click', () => {
          // Update active tab
          tabs.querySelectorAll('.emoji-category-tab').forEach(t => {
            t.style.background = '#f3f4f6';
            t.style.color = '#6b7280';
          });
          tab.style.background = '#3b82f6';
          tab.style.color = 'white';
          
          // Show category emojis
          showCategory(category);
        });
        tabs.appendChild(tab);
      });
      modal.appendChild(tabs);

      // Emoji grid container
      const gridContainer = document.createElement('div');
      gridContainer.id = 'emoji-grid-container';
      gridContainer.style.cssText = 'flex: 1; overflow-y: auto; min-height: 300px;';
      modal.appendChild(gridContainer);

      // Clear button
      const footer = document.createElement('div');
      footer.style.cssText = 'margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;';
      footer.innerHTML = `
        <button id="emoji-clear-btn" style="padding: 8px 16px; background: #f3f4f6; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Clear</button>
        <button id="emoji-cancel-btn" style="padding: 8px 16px; background: #f3f4f6; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Cancel</button>
      `;
      modal.appendChild(footer);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Function to show category emojis
      function showCategory(category) {
        gridContainer.innerHTML = '';
        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); gap: 8px;';
        
        EMOJI_CATEGORIES[category].forEach(emoji => {
          const btn = document.createElement('button');
          btn.className = 'emoji-btn';
          btn.textContent = emoji;
          btn.style.cssText = `
            width: 48px;
            height: 48px;
            border: 2px solid ${emoji === currentEmoji ? '#3b82f6' : 'transparent'};
            background: #f9fafb;
            border-radius: 6px;
            cursor: pointer;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          `;
          btn.addEventListener('mouseenter', () => {
            if (emoji !== currentEmoji) {
              btn.style.background = '#e5e7eb';
            }
          });
          btn.addEventListener('mouseleave', () => {
            btn.style.background = '#f9fafb';
          });
          btn.addEventListener('click', () => {
            cleanup();
            resolve(emoji);
          });
          grid.appendChild(btn);
        });
        
        gridContainer.appendChild(grid);
      }

      // Show first category by default
      showCategory(Object.keys(EMOJI_CATEGORIES)[0]);

      // Event handlers
      const cleanup = () => {
        overlay.remove();
      };

      document.getElementById('emoji-picker-close').addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      document.getElementById('emoji-cancel-btn').addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      document.getElementById('emoji-clear-btn').addEventListener('click', () => {
        cleanup();
        resolve(''); // Empty string means clear emoji
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(null);
        }
      });

      // ESC key to close
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(null);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  return { show };
})();
