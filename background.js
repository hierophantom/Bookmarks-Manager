chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-search'){
    // broadcast to active tab(s)
    const tabs = await chrome.tabs.query({active:true,currentWindow:true});
    for (const t of tabs) chrome.tabs.sendMessage(t.id, {type:'toggle-search'}).catch(()=>{});
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'toggle-search'){
    // send to active tab
    chrome.tabs.query({active:true,currentWindow:true}).then(tabs=>{
      tabs.forEach(t=>chrome.tabs.sendMessage(t.id,{type:'toggle-search'}).catch(()=>{}));
    });
    return; // no async response
  }

  if (msg && msg.type === 'GET_BOOKMARK_TAGS') {
    chrome.storage.local.get('bookmarkTags', (data) => {
      const all = data && data.bookmarkTags ? data.bookmarkTags : {};
      const tags = all[msg.bookmarkId] || [];
      sendResponse({ tags });
    });
    return true; // keep channel open for async sendResponse
  }
});
