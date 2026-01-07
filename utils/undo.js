const UndoService = (()=>{
  const containerId = '__bm_undo_container';
  function ensureContainer(){
    let c = document.getElementById(containerId);
    if (c) return c;
    c = document.createElement('div');
    c.id = containerId;
    c.style.position = 'fixed';
    c.style.left = '12px';
    c.style.bottom = '12px';
    c.style.zIndex = 100000;
    document.body.appendChild(c);
    return c;
  }

  // show undo toast; returns an object with `cancel()` to dismiss early
  function show(message, onUndo, timeout = 8000){
    const c = ensureContainer();
    const el = document.createElement('div');
    el.style.background = '#222';
    el.style.color = '#fff';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '6px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
    el.style.marginTop = '8px';
    el.innerHTML = `<span style="margin-right:12px">${escapeHtml(message)}</span>`;
    const btn = document.createElement('button');
    btn.textContent = 'Undo';
    btn.style.marginLeft = '8px';
    btn.style.padding = '6px 8px';
    btn.addEventListener('click', ()=>{
      clearTimeout(tid);
      remove();
      try{ onUndo(); }catch(e){ console.error(e); }
    });
    el.appendChild(btn);
    c.appendChild(el);
    function remove(){ if (el.parentNode) el.parentNode.removeChild(el); }
    const tid = setTimeout(()=>{ remove(); }, timeout);
    return { cancel: remove };
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { show };
})();
