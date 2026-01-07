// Simple page bridge exposed to page scripts as chromeExtensionBridge
(function(){
  if (window.chromeExtensionBridge) return;
  window.chromeExtensionBridge = {
    sendMessage(msg){
      // validate shape
      if (!msg || typeof msg.type !== 'string') return;
      window.postMessage({__bm_from_page: true, msg}, '*');
    }
  };
  // listen for messages from page and forward to extension
  window.addEventListener('message', (ev)=>{
    if (ev.source !== window) return;
    const data = ev.data;
    if (data && data.__bm_from_page){
      chrome.runtime.sendMessage(data.msg);
    }
  });
})();
