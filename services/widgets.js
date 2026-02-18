const WidgetsService = (()=>{
  const STORAGE_KEY = 'slotWidgets';
  const DEFAULT_SLOTS = 7;

  async function render(containerId){
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
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
    
    container.appendChild(cubeSection);
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
