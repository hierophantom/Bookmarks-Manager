/**
 * Emoji Picker Component
 * Displays categorized emojis for selection
 */
const EmojiPicker = (() => {
  const DATASET_PATH = 'assets/data/emoji-categories.json';
  const FALLBACK_CATEGORIES = {
    Smileys: [{ emoji: '😀', label: 'grinning face', tags: ['smile'] }, { emoji: '😍', label: 'smiling face with heart-eyes', tags: ['love'] }],
    Nature: [{ emoji: '🌿', label: 'herb', tags: ['plant'] }, { emoji: '🌸', label: 'cherry blossom', tags: ['flower'] }],
    Objects: [{ emoji: '📁', label: 'file folder', tags: ['folder'] }, { emoji: '📝', label: 'memo', tags: ['note'] }],
    Symbols: [{ emoji: '⭐', label: 'star', tags: ['favorite'] }, { emoji: '✅', label: 'check mark button', tags: ['done'] }]
  };
  let emojiDatasetPromise = null;

  function getDatasetUrl() {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      return chrome.runtime.getURL(DATASET_PATH);
    }
    return `../${DATASET_PATH}`;
  }

  function normalizeCategories(rawCategories) {
    const normalized = {};
    Object.entries(rawCategories || {}).forEach(([category, items]) => {
      normalized[category] = (items || [])
        .filter((item) => item && item.emoji)
        .map((item) => ({
          emoji: item.emoji,
          label: item.label || '',
          tags: Array.isArray(item.tags) ? item.tags : []
        }));
    });
    return normalized;
  }

  async function loadCategories() {
    if (!emojiDatasetPromise) {
      emojiDatasetPromise = (async () => {
        try {
          const response = await fetch(getDatasetUrl(), { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`Failed to load emoji dataset: ${response.status}`);
          }
          const payload = await response.json();
          const categories = normalizeCategories(payload.categories);
          if (Object.keys(categories).length === 0) {
            throw new Error('Emoji dataset is empty');
          }
          return categories;
        } catch (error) {
          console.warn('[EmojiPicker] Falling back to minimal emoji categories.', error);
          return FALLBACK_CATEGORIES;
        }
      })();
    }
    return emojiDatasetPromise;
  }

  /**
   * Show emoji picker modal
   * @returns {Promise<string|null>} Selected emoji or null if cancelled
   */
  async function show(currentEmoji = null) {
    const categoryMap = await loadCategories();
    return new Promise((resolve) => {
      const allEntries = [];
      const uniqueEmoji = new Set();
      Object.values(categoryMap).forEach((entries) => {
        entries.forEach((entry) => {
          if (uniqueEmoji.has(entry.emoji)) return;
          uniqueEmoji.add(entry.emoji);
          allEntries.push({
            emoji: entry.emoji,
            label: entry.label,
            tags: entry.tags,
            searchText: `${entry.label} ${(entry.tags || []).join(' ')}`.toLowerCase()
          });
        });
      });
      let activeCategory = 'All';
      let searchTerm = '';

      const content = document.createElement('div');
      content.className = 'emoji-picker__content';

      const handleSearchValue = (value) => {
        searchTerm = (value || '').trim().toLowerCase();
        renderGrid();
      };

      if (typeof createSearchComp === 'function') {
        const searchComp = createSearchComp({
          placeholder: 'Search all emojis',
          value: '',
          contrast: 'low',
          ariaLabel: 'Search emojis',
          onInput: (_event, value) => {
            handleSearchValue(value);
          }
        });
        searchComp.classList.add('emoji-picker__search-comp');
        content.appendChild(searchComp);
      } else {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search all emojis';
        searchInput.className = 'emoji-picker__search';
        searchInput.addEventListener('input', () => {
          handleSearchValue(searchInput.value);
        });
        content.appendChild(searchInput);
      }

      const categories = ['All', ...Object.keys(categoryMap)];
      const CATEGORY_EMOJI = {
        All: '🗂️',
        Smileys: '😀',
        People: '🧑',
        Component: '🧩',
        Nature: '🌿',
        Food: '🍔',
        Travel: '✈️',
        Activities: '⚽',
        Objects: '📦',
        Symbols: '🔣',
        Flags: '🚩'
      };
      const tabsShelf = document.createElement('div');
      tabsShelf.className = 'emoji-picker__tabs-shelf';
      let segmentedSurface = null;

      if (typeof createSegmentedControl === 'function') {
        const segmented = createSegmentedControl({
          items: categories.map((category) => ({
            label: CATEGORY_EMOJI[category] || '•',
            value: category,
            ariaLabel: category,
            title: category
          })),
          selectedValue: activeCategory,
          contrast: 'low',
          className: 'emoji-picker__segmented-shelf',
          onChange: (value) => {
            activeCategory = value;
            renderGrid();
          }
        });

        segmented.style.width = '100%';
        segmented.style.display = 'block';

        segmentedSurface = segmented.querySelector('.segmented-control__surface');
        if (segmentedSurface) {
          segmentedSurface.classList.add('emoji-picker__tabs-surface');
        }

        tabsShelf.appendChild(segmented);
      } else {
        const tabsFallback = document.createElement('div');
        tabsFallback.className = 'emoji-picker__tabs-fallback';
        categories.forEach((category, index) => {
          const tab = document.createElement('button');
          tab.className = 'emoji-category-tab';
          tab.textContent = CATEGORY_EMOJI[category] || '•';
          tab.title = category;
          tab.setAttribute('aria-label', category);
          tab.classList.add('emoji-picker__tabs-fallback-item');
          tab.classList.toggle('emoji-picker__tabs-fallback-item--active', index === 0);
          tab.addEventListener('click', () => {
            activeCategory = category;
            tabsFallback.querySelectorAll('.emoji-category-tab').forEach((t) => {
              t.classList.remove('emoji-picker__tabs-fallback-item--active');
            });
            tab.classList.add('emoji-picker__tabs-fallback-item--active');
            renderGrid();
          });
          tabsFallback.appendChild(tab);
        });
        tabsShelf.appendChild(tabsFallback);
      }

      content.appendChild(tabsShelf);

      // Emoji grid container
      const gridContainer = document.createElement('div');
      gridContainer.id = 'emoji-grid-container';
      gridContainer.className = 'emoji-picker__grid-container';
      content.appendChild(gridContainer);

      function getVisibleEntries() {
        const base = activeCategory === 'All' ? allEntries : (categoryMap[activeCategory] || []).map((entry) => ({
          ...entry,
          searchText: `${entry.label} ${(entry.tags || []).join(' ')}`.toLowerCase()
        }));
        if (!searchTerm) return base;
        return base.filter((entry) => entry.emoji.includes(searchTerm) || entry.searchText.includes(searchTerm));
      }

      function renderGrid() {
        gridContainer.innerHTML = '';
        const visibleEntries = getVisibleEntries();

        if (!visibleEntries.length) {
          const empty = document.createElement('div');
          empty.className = 'emoji-picker__empty';
          empty.textContent = 'No matches found.';
          gridContainer.appendChild(empty);
          return;
        }

        const grid = document.createElement('div');
        grid.className = 'emoji-picker__grid';

        const gridWrap = document.createElement('div');
        gridWrap.className = 'emoji-picker__grid-wrap';

        const createEmojiTile = (entry) => {
          const { emoji, label } = entry;
          const tile = document.createElement('div');
          tile.className = 'emoji-picker__emoji-tile';

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'emoji-picker__emoji-button';
          btn.textContent = emoji;
          if (label) {
            btn.title = label;
            btn.setAttribute('aria-label', label);
          }

          btn.addEventListener('click', () => {
            submitResult = emoji;
            submitIntent = 'select';
            const confirmBtn = modalInstance?.querySelector('.modal__action-btn--primary');
            if (confirmBtn) {
              confirmBtn.click();
            }
          });

          tile.appendChild(btn);
          return tile;
        };

        if (activeCategory === 'All' && !searchTerm) {
          categories
            .filter((category) => category !== 'All')
            .forEach((category) => {
              const categoryEntries = categoryMap[category] || [];
              if (!categoryEntries.length) return;

              const group = document.createElement('div');
              group.className = 'emoji-picker__group';

              const groupTitle = document.createElement('h3');
              groupTitle.className = 'emoji-picker__group-title';
              groupTitle.textContent = category;
              group.appendChild(groupTitle);

              const groupGrid = document.createElement('div');
              groupGrid.className = 'emoji-picker__grid';
              categoryEntries.forEach((entry) => {
                groupGrid.appendChild(createEmojiTile(entry));
              });

              group.appendChild(groupGrid);
              gridWrap.appendChild(group);
            });

          gridContainer.appendChild(gridWrap);
          return;
        }

        visibleEntries.forEach((entry) => {
          grid.appendChild(createEmojiTile(entry));
        });

        gridWrap.appendChild(grid);
        gridContainer.appendChild(gridWrap);
      }

      renderGrid();

      function applySegmentedOverrides() {
        if (!segmentedSurface) return;
        segmentedSurface.querySelectorAll('.segmented-control__item').forEach((item) => {
          item.style.flex = '1 1 0';
          item.style.minWidth = '0';
          const labelEl = item.querySelector('.segmented-control__item-label');
          if (labelEl) {
            labelEl.style.fontSize = '24px';
            labelEl.style.lineHeight = '1';
          }
        });
      }

      let submitResult = null;
      let submitIntent = 'select';
      let modalInstance = null;

      modalInstance = createModal({
        type: 'form',
        title: 'Select Emoji',
        content,
        buttons: [
          { label: 'Cancel', type: 'common', role: 'cancel' },
          {
            label: 'Clear',
            type: 'common',
            onClick: () => {
              submitIntent = 'clear';
              submitResult = '';
            }
          },
          {
            label: 'Select',
            type: 'primary',
            role: 'confirm',
            onClick: () => {
              submitIntent = 'select';
            }
          }
        ],
        onSubmit: () => {
          if (submitIntent === 'clear') {
            return true;
          }
          return submitResult !== null;
        },
        onClose: (confirmed) => {
          if (!confirmed) {
            resolve(null);
            return;
          }

          if (submitIntent === 'clear') {
            resolve('');
            return;
          }

          resolve(submitResult);
        }
      });

      const modalShell = modalInstance.querySelector('.modal');
      if (modalShell) {
        modalShell.classList.add('modal--emoji-picker', 'modal--scroll-body');
      }

      showModal(modalInstance);
      if (segmentedSurface) {
        window.requestAnimationFrame(applySegmentedOverrides);
      }
    });
  }

  return { show };
})();
