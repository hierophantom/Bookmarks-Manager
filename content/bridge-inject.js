// Content script to load the bridge into page context and listen for toggle messages
(function(){
  // inject bridge script as a page script so pages can call chromeExtensionBridge
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('service-search-engine/bridge.js');
  s.onload = () => s.remove();
  (document.head||document.documentElement).appendChild(s);

  // Listen for messages from background (toggle overlay)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'toggle-search'){
      window.postMessage({__bm_toggle_search: true}, '*');
    }
  });
})();
