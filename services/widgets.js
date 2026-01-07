const WidgetsService = (()=>{
  const STORAGE_KEY = 'slotWidgets';
  const DEFAULT_SLOTS = 6;

  async function render(containerId){
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const slots = await SlotSystem.ensureSlots(STORAGE_KEY, DEFAULT_SLOTS);
    const grid = document.createElement('div');
    grid.className = 'widgets-grid';
    slots.forEach((item, idx)=>{
      const slot = document.createElement('div');
      slot.className = 'widget-slot';
      slot.dataset.index = idx;
      if (!item){
        slot.innerHTML = `<div class="widget-empty">Empty</div>`;
        slot.addEventListener('click', async ()=>{
          const pick = await Modal.openWidgetPicker();
          if (!pick) return;
          await SlotSystem.setSlot(STORAGE_KEY, idx, pick);
          await render(containerId);
        });
        // allow dropping onto empty slot
        slot.addEventListener('dragover', (e)=>{ e.preventDefault(); slot.classList.add('dragover'); });
        slot.addEventListener('dragleave', ()=>{ slot.classList.remove('dragover'); });
        slot.addEventListener('drop', async (e)=>{
          e.preventDefault(); slot.classList.remove('dragover');
          const srcIndex = parseInt(e.dataTransfer.getData('text/widget-index'),10);
          if (isNaN(srcIndex)) return;
          await swapSlots(srcIndex, idx);
          await render(containerId);
        });
      } else {
        slot.innerHTML = `<div class="widget-item" draggable="true"><strong>${item.title||item.id}</strong> <button class="remove">Remove</button></div>`;
        const itemEl = slot.querySelector('.widget-item');
        // drag handlers
        itemEl.addEventListener('dragstart', (e)=>{
          e.dataTransfer.setData('text/widget-index', String(idx));
          e.dataTransfer.effectAllowed = 'move';
        });
        slot.addEventListener('dragover', (e)=>{ e.preventDefault(); slot.classList.add('dragover'); });
        slot.addEventListener('dragleave', ()=>{ slot.classList.remove('dragover'); });
        slot.addEventListener('drop', async (e)=>{
          e.preventDefault(); slot.classList.remove('dragover');
          const srcIndex = parseInt(e.dataTransfer.getData('text/widget-index'),10);
          if (isNaN(srcIndex)) return;
          await swapSlots(srcIndex, idx);
          await render(containerId);
        });
        slot.querySelector('.remove').addEventListener('click', async (e)=>{ e.stopPropagation(); await SlotSystem.clearSlot(STORAGE_KEY, idx); await render(containerId); });
      }
      grid.appendChild(slot);
    });
    container.appendChild(grid);
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
