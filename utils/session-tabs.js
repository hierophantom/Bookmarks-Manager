const SessionTabService = (() => {
  const JOURNEY_PAGE_URL = typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function'
    ? chrome.runtime.getURL('core/main.html')
    : '';

  function isJourneySurfaceTab(tab) {
    const effectiveUrl = tab?.url || tab?.pendingUrl || '';

    if (!effectiveUrl) {
      return false;
    }

    if (JOURNEY_PAGE_URL && effectiveUrl.includes(JOURNEY_PAGE_URL)) {
      return true;
    }

    return effectiveUrl.startsWith('chrome://newtab/');
  }

  function filterJourneySurfaceTabs(tabs) {
    return (Array.isArray(tabs) ? tabs : []).filter((tab) => tab && !isJourneySurfaceTab(tab));
  }

  return {
    isJourneySurfaceTab,
    filterJourneySurfaceTabs
  };
})();

if (typeof window !== 'undefined') {
  window.SessionTabService = SessionTabService;
}
