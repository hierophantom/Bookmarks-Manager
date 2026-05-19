const AnalyticsService = (() => {
  const STORAGE_KEY_ENABLED = 'usageAnalyticsEnabled';
  const STORAGE_KEY_DISTINCT_ID = 'usageAnalyticsDistinctId';
  const STORAGE_KEY_SESSION_ID = 'usageAnalyticsSessionId';
  const POSTHOG_API_KEY = 'phc_khpRJXRbiLyPcnaJwXf6zjjVkhKCU6UAXSV4Db2gbgiE';
  const POSTHOG_API_HOST = 'https://eu.i.posthog.com';
  const POSTHOG_BATCH_PATH = '/batch/';
  const MAX_BATCH_SIZE = 20;
  const FLUSH_DELAY_MS = 1200;

  let ready = false;
  let enabled = false;
  let distinctId = null;
  let sessionId = null;
  let currentPage = null;
  let queue = [];
  let flushTimer = null;
  let lifecycleListenersAttached = false;

  function getManifestVersion() {
    try {
      return chrome?.runtime?.getManifest?.()?.version || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  function createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return 'analytics-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getSessionStorageId() {
    try {
      const existing = window.sessionStorage.getItem(STORAGE_KEY_SESSION_ID);
      if (existing) return existing;
      const next = createId();
      window.sessionStorage.setItem(STORAGE_KEY_SESSION_ID, next);
      return next;
    } catch (error) {
      return createId();
    }
  }

  async function ensureDistinctId() {
    if (distinctId) return distinctId;
    const stored = await Storage.get(STORAGE_KEY_DISTINCT_ID);
    distinctId = stored || createId();
    if (!stored) {
      await Storage.set({ [STORAGE_KEY_DISTINCT_ID]: distinctId });
    }
    return distinctId;
  }

  function attachLifecycleListeners() {
    if (lifecycleListenersAttached) return;
    lifecycleListenersAttached = true;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        trackPageExit('visibilitychange');
        void flush(true);
      }
    });

    window.addEventListener('pagehide', () => {
      trackPageExit('pagehide');
      void flush(true);
    });
  }

  function normalizeProperties(properties = {}) {
    const cleaned = {};
    Object.entries(properties || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }

  function buildBaseProperties() {
    return {
      app_name: 'Journey - Bookmark manager',
      app_version: getManifestVersion(),
      session_id: sessionId,
      $process_person_profile: false
    };
  }

  function scheduleFlush() {
    if (flushTimer || queue.length === 0) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush(false);
    }, FLUSH_DELAY_MS);
  }

  async function sendBatch(batch, useBeacon) {
    if (!batch.length) return;

    const payload = JSON.stringify({
      api_key: POSTHOG_API_KEY,
      batch
    });

    const url = `${POSTHOG_API_HOST}${POSTHOG_BATCH_PATH}`;

    if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
        return;
      } catch (error) {
        // Fall through to fetch.
      }
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      mode: 'cors'
    });
  }

  async function flush(useBeacon = false) {
    if (!enabled || queue.length === 0) return;
    if (typeof fetch !== 'function') return;

    const batches = [];
    while (queue.length > 0) {
      batches.push(queue.splice(0, MAX_BATCH_SIZE));
    }

    for (const batch of batches) {
      try {
        await sendBatch(batch, useBeacon);
      } catch (error) {
        if (!useBeacon) {
          queue = batch.concat(queue);
        }
        break;
      }
    }
  }

  function capture(event, properties = {}) {
    if (!ready || !enabled || !distinctId) return false;

    const normalizedEvent = String(event || '').trim();
    if (!normalizedEvent) return false;

    queue.push({
      event: normalizedEvent,
      distinct_id: distinctId,
      properties: {
        ...buildBaseProperties(),
        ...normalizeProperties(properties)
      },
      timestamp: new Date().toISOString()
    });

    scheduleFlush();
    return true;
  }

  function trackPageExit(reason = 'leave') {
    if (!currentPage) return;

    const durationMs = Math.max(0, Date.now() - currentPage.startedAt);
    capture('page_duration', {
      page_name: currentPage.name,
      duration_ms: durationMs,
      reason
    });

    currentPage = null;
  }

  function trackPageView(pageName, properties = {}) {
    const nextPageName = String(pageName || '').trim();
    if (!nextPageName) return;

    const now = Date.now();
    if (currentPage && currentPage.name !== nextPageName) {
      const durationMs = Math.max(0, now - currentPage.startedAt);
      capture('page_duration', {
        page_name: currentPage.name,
        duration_ms: durationMs,
        reason: 'navigation'
      });
    }

    currentPage = {
      name: nextPageName,
      startedAt: now
    };

    capture('page_view', {
      page_name: nextPageName,
      ...normalizeProperties(properties)
    });
  }

  async function init() {
    if (ready) return { enabled };

    sessionId = getSessionStorageId();
    const storedEnabled = await Storage.get(STORAGE_KEY_ENABLED);
    enabled = storedEnabled === undefined || storedEnabled === null ? true : storedEnabled === true;
    if (storedEnabled === undefined || storedEnabled === null) {
      await Storage.set({ [STORAGE_KEY_ENABLED]: true });
    }
    distinctId = await Storage.get(STORAGE_KEY_DISTINCT_ID);

    if (enabled) {
      await ensureDistinctId();
    }

    ready = true;
    attachLifecycleListeners();
    return { enabled };
  }

  async function setEnabled(nextEnabled) {
    const shouldEnable = Boolean(nextEnabled);
    const wasEnabled = enabled;

    if (shouldEnable) {
      enabled = true;
      await ensureDistinctId();
      await Storage.set({ [STORAGE_KEY_ENABLED]: true });
      capture('usage_analytics_enabled', {});
      await flush(false);
      return true;
    }

    if (wasEnabled) {
      capture('usage_analytics_disabled', {});
      await flush(true);
    }

    enabled = false;
    currentPage = null;
    queue = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await Storage.set({ [STORAGE_KEY_ENABLED]: false });
    return false;
  }

  async function isEnabled() {
    if (!ready) {
      await init();
    }
    return enabled;
  }

  return {
    init,
    capture,
    flush,
    setEnabled,
    isEnabled,
    trackPageView,
    trackPageExit
  };
})();

if (typeof window !== 'undefined') {
  window.AnalyticsService = AnalyticsService;
}
