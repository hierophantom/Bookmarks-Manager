document.addEventListener('DOMContentLoaded', ()=>{
  const q = document.getElementById('q');
  const results = document.getElementById('results');
  q.focus();
  q.addEventListener('input', async ()=>{
    const val = q.value.trim().toLowerCase();
    results.innerHTML = '';
    if (!val) return;
    // search bookmarks
    const tree = await new Promise(res=>chrome.bookmarks.getTree(t=>res(t)));
    const items = [];
    function walk(node){
      if (node.url && (node.title||'').toLowerCase().includes(val) ) items.push(node);
      if (node.children) node.children.forEach(walk);
    }
    walk(tree[0]);
    items.slice(0,30).forEach(it=>{
      const el = document.createElement('div');
      el.innerHTML = `<a href="${it.url}" target="_blank">${it.title||it.url}</a>`;
      results.appendChild(el);
    });
  });
});
