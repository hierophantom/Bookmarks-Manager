const WidgetsService = (()=>{
  const STORAGE_KEY = 'slotWidgets';
  const DEFAULT_SLOTS = 7;
  const BOOKMARK_WIDGETS_KEY = 'bookmarkWidgetSlots';
  const BOOKMARK_ROW_SIZE = 5;

  async function render(containerId){
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    await renderBookmarkWidgets(container, containerId);
    await renderStandardWidgets(container, containerId);
  }

  async function renderBookmarkWidgets(container, containerId) {
    const slots = await normalizeBookmarkSlots({ compact: true });

    const bookmarkItems = slots.map((item, idx) => {
      if (!item) {
        const emptyWidget = createWidgetSmall({
          type: 'empty',
          state: 'idle'
        });

        emptyWidget.addEventListener('click', async () => {
          const data = await Modal.openBookmarkForm({}, { showTabsSuggestions: true, showTags: false });
          if (!data) return;
          await setBookmarkSlot(idx, createBookmarkWidgetRecord(data));
          await render(containerId);
        });

        emptyWidget.addEventListener('dragover', (e) => {
          e.preventDefault();
          emptyWidget.classList.add('widget-small--dragged');
        });
        emptyWidget.addEventListener('dragleave', () => {
          emptyWidget.classList.remove('widget-small--dragged');
        });
        emptyWidget.addEventListener('drop', async (e) => {
          e.preventDefault();
          emptyWidget.classList.remove('widget-small--dragged');
          const srcIndex = parseInt(e.dataTransfer.getData('text/bookmark-widget-index'), 10);
          if (isNaN(srcIndex)) return;
          await swapBookmarkSlots(srcIndex, idx);
          await render(containerId);
        });

        return emptyWidget;
      }

      const editBtn = createCubeActionButton({
        icon: 'edit',
        label: 'Edit bookmark',
        tooltip: 'Edit bookmark',
        colorScheme: 'default',
        onClick: async (e) => {
          e.stopPropagation();
          const updated = await Modal.openBookmarkForm(
            { title: item.title || '', url: item.url || '' },
            { showTabsSuggestions: false, showTags: false }
          );
          if (!updated) return;
          await setBookmarkSlot(idx, createBookmarkWidgetRecord(updated));
          await render(containerId);
        }
      });

      const removeBtn = createCubeActionButton({
        icon: 'close',
        label: 'Remove bookmark',
        tooltip: 'Remove bookmark',
        colorScheme: 'destructive',
        onClick: async (e) => {
          e.stopPropagation();
          const confirmed = await Modal.openConfirmation({
            title: 'Remove bookmark?',
            message: 'This bookmark will be removed from this widget section.',
            confirmText: 'Remove',
            destructive: true
          });
          if (!confirmed) return;
          await setBookmarkSlot(idx, null);
          await render(containerId);
        }
      });

      const faviconIcon = (typeof FaviconService !== 'undefined' && item.url)
        ? FaviconService.createFaviconElement(item.url, {
          size: 24,
          className: 'widget-small__favicon',
          alt: item.title || 'Bookmark favicon'
        })
        : 'book';

      const widget = createWidgetSmall({
        type: 'widget',
        state: 'idle',
        label: item.title || 'Bookmark',
        subtext: getBookmarkSubtext(item.url),
        icon: faviconIcon,
        actions: [editBtn, removeBtn]
      });

      widget.setAttribute('draggable', 'true');
      widget.addEventListener('click', () => {
        if (!item.url) return;
        chrome.tabs.create({ url: item.url });
      });
      widget.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/bookmark-widget-index', String(idx));
        e.dataTransfer.effectAllowed = 'move';
      });
      widget.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      widget.addEventListener('drop', async (e) => {
        e.preventDefault();
        const srcIndex = parseInt(e.dataTransfer.getData('text/bookmark-widget-index'), 10);
        if (isNaN(srcIndex)) return;
        await swapBookmarkSlots(srcIndex, idx);
          await render(containerId);
      });
      widget.addEventListener('mouseenter', () => {
        widget.classList.remove('widget-small--idle');
        widget.classList.add('widget-small--hover');
      });
      widget.addEventListener('mouseleave', () => {
        widget.classList.remove('widget-small--hover');
        widget.classList.add('widget-small--idle');
      });

      return widget;
    });

    const addBookmarkAction = createCubeActionButtonWithLabel({
      icon: 'add',
      label: 'Add bookmark',
      colorScheme: 'primary',
      onClick: async () => {
        const data = await Modal.openBookmarkForm({}, { showTabsSuggestions: true, showTags: false });
        if (!data) return;
        await addBookmarkToWidgetSection(createBookmarkWidgetRecord(data));
        await render(containerId);
      }
    });

    const bookmarkSection = createCubeSection({
      items: bookmarkItems,
      state: 'idle',
      wrap: 'none',
      action: addBookmarkAction
    });

    container.appendChild(createWidgetSection('Quick links', bookmarkSection));
  }

  async function renderStandardWidgets(container, containerId) {
    
    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    
    // Create cube section with widgets
    const widgetItems = slots.map((item, idx) => {
      if (!item) {
        // Empty slot
        const emptyWidget = createWidgetSmall({
          type: 'empty',
          state: 'idle'
        });
        
        // Click to add widget
        emptyWidget.addEventListener('click', async () => {
          const pick = await Modal.openWidgetPicker();
          if (!pick) return;
          await SlotSystem.setSlot(STORAGE_KEY, idx, pick);
          await render(containerId);
        });
        
        // Drag and drop handlers
        emptyWidget.addEventListener('dragover', (e) => {
          e.preventDefault();
          emptyWidget.classList.add('widget-small--dragged');
        });
        emptyWidget.addEventListener('dragleave', () => {
          emptyWidget.classList.remove('widget-small--dragged');
        });
        emptyWidget.addEventListener('drop', async (e) => {
          e.preventDefault();
          emptyWidget.classList.remove('widget-small--dragged');
          const srcIndex = parseInt(e.dataTransfer.getData('text/widget-index'), 10);
          if (isNaN(srcIndex)) return;
          await swapSlots(srcIndex, idx);
          await render(containerId);
        });
        
        return emptyWidget;
      } else {
        // Widget with content
        const title = item.title || item.id || 'Label';
        const subtitle = item.subtitle || 'Subtext';
        const icon = 'bookmark'; // Use Material Icon
        
        // Create action buttons for hover state
        const editBtn = createCubeActionButton({
          icon: 'edit',
          label: 'Edit',
          tooltip: 'Edit widget',
          colorScheme: 'default',
          onClick: async (e) => {
            e.stopPropagation();
            // TODO: Implement edit
          }
        });
        
        const removeBtn = createCubeActionButton({
          icon: 'close',
          label: 'Remove',
          tooltip: 'Remove widget',
          colorScheme: 'destructive',
          onClick: async (e) => {
            e.stopPropagation();
            const confirmed = await Modal.openConfirmation({
              title: 'Remove widget?',
              message: 'This widget will be removed from the slot.',
              confirmText: 'Remove',
              destructive: true
            });
            if (!confirmed) return;
            await SlotSystem.clearSlot(STORAGE_KEY, idx);
            await render(containerId);
          }
        });
        
        const widget = createWidgetSmall({
          type: 'widget',
          state: 'idle',
          label: title,
          subtext: subtitle,
          icon: icon,
          actions: [editBtn, removeBtn]
        });
        
        // Make widget draggable
        widget.setAttribute('draggable', 'true');
        widget.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/widget-index', String(idx));
          e.dataTransfer.effectAllowed = 'move';
        });
        
        // Drag and drop handlers
        widget.addEventListener('dragover', (e) => {
          e.preventDefault();
        });
        widget.addEventListener('drop', async (e) => {
          e.preventDefault();
          const srcIndex = parseInt(e.dataTransfer.getData('text/widget-index'), 10);
          if (isNaN(srcIndex)) return;
          await swapSlots(srcIndex, idx);
          await render(containerId);
        });
        
        // Show actions on hover
        widget.addEventListener('mouseenter', () => {
          widget.classList.remove('widget-small--idle');
          widget.classList.add('widget-small--hover');
        });
        widget.addEventListener('mouseleave', () => {
          widget.classList.remove('widget-small--hover');
          widget.classList.add('widget-small--idle');
        });
        
        return widget;
      }
    });
    
    // Create add widget action button
    const addWidgetAction = createCubeActionButtonWithLabel({
      icon: 'add',
      label: 'Add widget',
      colorScheme: 'primary',
      onClick: async () => {
        const pick = await Modal.openWidgetPicker();
        if (!pick) return;
        const success = await addWidgetToFirstEmpty(pick);
        if (success) {
          await render(containerId);
        }
      }
    });
    
    // Create cube section
    const cubeSection = createCubeSection({
      items: widgetItems,
      state: 'idle',
      wrap: 'none',
      action: addWidgetAction
    });

    container.appendChild(createWidgetSection('Widgets', cubeSection));
  }

  function createWidgetSection(title, sectionElement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'widget-stack-section';

    const heading = document.createElement('h3');
    heading.className = 'subheading widget-stack-section__title';
    heading.textContent = title;

    wrapper.appendChild(heading);
    wrapper.appendChild(sectionElement);
    return wrapper;
  }

  function createBookmarkWidgetRecord(data) {
    return {
      title: data.title || 'Bookmark',
      url: data.url || ''
    };
  }

  function getBookmarkSubtext(url) {
    try {
      if (!url) return 'No URL';
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return 'Invalid URL';
    }
  }

  async function normalizeBookmarkSlots(options = {}) {
    const { compact = false } = options;
    let slots = await SlotSystem.getSlots(BOOKMARK_WIDGETS_KEY);
    if (!Array.isArray(slots) || slots.length === 0) {
      slots = new Array(BOOKMARK_ROW_SIZE).fill(null);
      await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
      return slots;
    }

    if (slots.length < BOOKMARK_ROW_SIZE) {
      slots = slots.concat(new Array(BOOKMARK_ROW_SIZE - slots.length).fill(null));
      await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
      return slots;
    }

    const remainder = slots.length % BOOKMARK_ROW_SIZE;
    if (remainder !== 0) {
      slots = slots.concat(new Array(BOOKMARK_ROW_SIZE - remainder).fill(null));
      await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
    }

    if (compact) {
      const lastFilledIndex = slots.reduce((lastIndex, slot, index) => (slot ? index : lastIndex), -1);
      const targetLength = Math.max(
        BOOKMARK_ROW_SIZE,
        lastFilledIndex < 0 ? BOOKMARK_ROW_SIZE : Math.ceil((lastFilledIndex + 1) / BOOKMARK_ROW_SIZE) * BOOKMARK_ROW_SIZE
      );

      if (slots.length !== targetLength) {
        slots = slots.slice(0, targetLength);
        await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
      }
    }

    return slots;
  }

  async function setBookmarkSlot(index, item) {
    const slots = await normalizeBookmarkSlots();
    if (index < 0) return;
    if (index >= slots.length) {
      const needed = index - slots.length + 1;
      slots.push(...new Array(needed).fill(null));
    }
    slots[index] = item;
    await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
    await normalizeBookmarkSlots({ compact: true });
  }

  async function swapBookmarkSlots(a, b) {
    if (a === b) return;
    const slots = await normalizeBookmarkSlots();
    const max = Math.max(a, b);
    if (max >= slots.length) return;
    const tmp = slots[a];
    slots[a] = slots[b];
    slots[b] = tmp;
    await SlotSystem.save(BOOKMARK_WIDGETS_KEY, slots);
    await normalizeBookmarkSlots({ compact: true });
  }

  async function addBookmarkToWidgetSection(bookmark) {
    const slots = await normalizeBookmarkSlots();
    let index = slots.findIndex((slot) => !slot);

    if (index < 0) {
      const expanded = slots.concat(new Array(BOOKMARK_ROW_SIZE).fill(null));
      await SlotSystem.save(BOOKMARK_WIDGETS_KEY, expanded);
      index = slots.length;
    }

    await setBookmarkSlot(index, bookmark);
  }

  async function swapSlots(a,b){
    if (a===b) return;
    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    const max = Math.max(a,b);
    if (max >= slots.length) return;
    const tmp = slots[a];
    slots[a] = slots[b];
    slots[b] = tmp;
    await SlotSystem.save(STORAGE_KEY, slots);
  }

  async function addWidgetToFirstEmpty(pick){
    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    const idx = slots.findIndex(s=>!s);
    if (idx < 0) return false;
    await SlotSystem.setSlot(STORAGE_KEY, idx, pick);
    return true;
  }

  return { render, addWidgetToFirstEmpty };
})();
