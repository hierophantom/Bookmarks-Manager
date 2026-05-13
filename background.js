chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-search'){
    // broadcast to active tab(s)
    const tabs = await chrome.tabs.query({active:true,currentWindow:true});
    for (const t of tabs) chrome.tabs.sendMessage(t.id, {type:'toggle-search'}).catch(()=>{});
  }
});

function isTrustedRuntimeSender(sender) {
  return Boolean(sender && sender.id === chrome.runtime.id);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!isTrustedRuntimeSender(sender)) {
    return;
  }

  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
    return;
  }

  if (msg && msg.type === 'toggle-search'){
    // send to active tab
    chrome.tabs.query({active:true,currentWindow:true}).then(tabs=>{
      tabs.forEach(t=>chrome.tabs.sendMessage(t.id,{type:'toggle-search'}).catch(()=>{}));
    });
    return; // no async response
  }

  if (msg.type === 'GET_BOOKMARK_TAGS') {
    const bookmarkId = typeof msg.bookmarkId === 'string' ? msg.bookmarkId : null;
    if (!bookmarkId) {
      sendResponse({ tags: [] });
      return;
    }

    chrome.storage.local.get('bookmarkTags', (data) => {
      const all = data && data.bookmarkTags ? data.bookmarkTags : {};
      const tags = all[bookmarkId] || [];
      sendResponse({ tags });
    });
    return true; // keep channel open for async sendResponse
  }
});
