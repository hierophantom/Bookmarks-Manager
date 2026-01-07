const Modal = (() => {
  // Simple ModalManager that creates an overlay and form
  function createOverlay(){
    let overlay = document.getElementById('__bm_modal_overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = '__bm_modal_overlay';
    overlay.addEventListener('click', (e)=>{ if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  let currentResolver = null;
  function close(){
    const overlay = document.getElementById('__bm_modal_overlay');
    if (overlay) overlay.remove();
    if (currentResolver) { currentResolver(null); currentResolver = null; }
  }

  function openBookmarkForm(defaults = {}){
    return new Promise(async res=>{
      console.log('=== Modal.openBookmarkForm START ===', {defaults});
      currentResolver = res;
      const overlay = createOverlay();
      overlay.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'bm-modal-card bm-bookmark-form';

      const tagArr = Array.isArray(defaults.tags) ? defaults.tags : [];

      card.innerHTML = `
        <h3>${defaults.id ? 'Edit Bookmark' : 'Add Bookmark'}</h3>
        <div class="bm-modal-form">
          <label class="bm-modal-label">Title<input id="bm_title" value="${escapeHtml(defaults.title||'')}" /></label>
          <label class="bm-modal-label">URL<input id="bm_url" value="${escapeHtml(defaults.url||'')}" /></label>
          <label class="bm-modal-label">Tags (comma-separated)<input id="bm_tags" value="${tagArr.join(', ')}" placeholder="tag1, tag2, tag3" /></label>
          <div class="bm-modal-actions">
            <button id="bm_cancel" class="bm-btn-cancel">Cancel</button>
            <button id="bm_save" class="bm-btn-primary">Save</button>
          </div>
        </div>
      `;

      overlay.appendChild(card);

      const inputTitle = card.querySelector('#bm_title');
      const inputUrl = card.querySelector('#bm_url');
      const inputTags = card.querySelector('#bm_tags');
      const btnSave = card.querySelector('#bm_save');
      const btnCancel = card.querySelector('#bm_cancel');

      console.log('Modal: DOM elements', {inputTitle: !!inputTitle, inputUrl: !!inputUrl, inputTags: !!inputTags, btnSave: !!btnSave, btnCancel: !!btnCancel});

      btnCancel.addEventListener('click', ()=>{ 
        console.log('Modal: cancel clicked');
        close(); 
      });
      
      btnSave.addEventListener('click', ()=>{
        console.log('=== Modal.btnSave CLICKED ===');
        const title = inputTitle.value.trim();
        const url = inputUrl.value.trim();
        const tagsString = inputTags.value;
        
        console.log('Modal.btnSave: raw input', {title, url, tagsString});
        
        // Simple split on comma
        const tags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
        
        console.log('Modal.btnSave: parsed tags =', tags);
        
        if (!title){ alert('Title is required'); return; }
        if (url && !isValidUrl(url)){ alert('URL looks invalid'); return; }
        
        console.log('Modal.btnSave: validation passed, closing modal and resolving with', {title, url, tags});
        close();
        res({title, url, tags});
      });
      
      console.log('=== Modal.openBookmarkForm END ===');
      setTimeout(()=>inputTitle.focus(), 0);
    });
  }

  function isValidUrl(v){
    try{ if (!v) return true; new URL(v); return true; }catch(e){ return false; }
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  
  function openFolderForm(defaults = {}){
    return new Promise(res=>{
      const overlay = createOverlay();
      overlay.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'bm-modal-card bm-folder-form';
      card.innerHTML = `
        <h3>Edit Folder</h3>
        <div class="bm-modal-form">
          <label class="bm-modal-label">Folder name<input id="bm_folder_title" value="${escapeHtml(defaults.title||'')}" /></label>
          <div class="bm-modal-actions">
            <button id="bm_folder_cancel" class="bm-btn-cancel">Cancel</button>
            <button id="bm_folder_save" class="bm-btn-primary">Save</button>
          </div>
        </div>
      `;
      overlay.appendChild(card);
      const input = card.querySelector('#bm_folder_title');
      card.querySelector('#bm_folder_cancel').addEventListener('click', ()=>{ close(); });
      card.querySelector('#bm_folder_save').addEventListener('click', ()=>{
        const title = input.value.trim();
        if (!title){ alert('Folder name required'); return; }
        close();
        res({ title });
      });
      setTimeout(()=>input.focus(),0);
    });
  }

  function openTabsPicker(tabs = []){
    return new Promise(res=>{
      const overlay = createOverlay();
      overlay.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'bm-modal-card bm-tabs-picker';
      const listHtml = tabs.map((t,i)=>`<label><input type=checkbox data-index="${i}" /> <span>${escapeHtml(t.title||t.url)}</span> <small>${escapeHtml(t.url)}</small></label>`).join('');
      card.innerHTML = `
        <h3>Add Tabs to Folder</h3>
        <div class="bm-modal-form">
          <div class="bm-select-all-container"><label><input type="checkbox" id="bm_select_all" /> Select all</label></div>
          <div id="bm_tabs_list">${listHtml}</div>
          <div class="bm-modal-actions">
            <button id="bm_tabs_cancel" class="bm-btn-cancel">Cancel</button>
            <button id="bm_tabs_add" class="bm-btn-primary">Add Selected</button>
          </div>
        </div>
      `;
      overlay.appendChild(card);
      const selectAll = card.querySelector('#bm_select_all');
      const checkboxes = card.querySelectorAll('#bm_tabs_list input[type=checkbox]');
      selectAll.addEventListener('change', ()=>{ checkboxes.forEach(cb=>cb.checked = selectAll.checked); });
      card.querySelector('#bm_tabs_cancel').addEventListener('click', ()=>{ close(); res([]); });
      card.querySelector('#bm_tabs_add').addEventListener('click', ()=>{
        const selected = [];
        checkboxes.forEach(cb=>{ if (cb.checked) selected.push(tabs[parseInt(cb.dataset.index,10)]); });
        close(); res(selected);
      });
    });
  }

  function openWidgetPicker(defaults = {}){
    return new Promise(res=>{
      const overlay = createOverlay();
      overlay.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'bm-modal-card bm-widget-picker';
      const items = [
        { id: 'clock', title: 'Clock' },
        { id: 'quicklinks', title: 'Quick Links' },
        { id: 'notes', title: 'Notes' }
      ];
      card.innerHTML = `<h3>Add Widget</h3>`;
      const list = document.createElement('div');
      list.className = 'bm-widget-list';
      items.forEach(it=>{
        const btn = document.createElement('button');
        btn.className = 'bm-widget-item-btn';
        btn.textContent = it.title;
        btn.addEventListener('click', ()=>{ close(); res(it); });
        list.appendChild(btn);
      });
      const cancel = document.createElement('div');
      cancel.className = 'bm-modal-cancel-container';
      const cbtn = document.createElement('button');
      cbtn.className = 'bm-btn-cancel bm-btn-full';
      cbtn.textContent = 'Cancel';
      cbtn.addEventListener('click', ()=>{ close(); res(null); });
      cancel.appendChild(cbtn);
      card.appendChild(list);
      card.appendChild(cancel);
      overlay.appendChild(card);
    });
  }

  return { openBookmarkForm, openFolderForm, openTabsPicker, openWidgetPicker };
})();
