const WidgetRegistryService = (() => {
  const CATEGORY_DEFINITIONS = [
    {
      id: 'productivity',
      label: 'Productivity',
      description: 'Focus, workflow, and output helpers.',
      sortOrder: 10
    },
    {
      id: 'information',
      label: 'Information',
      description: 'Glanceable context and updates.',
      sortOrder: 20
    },
    {
      id: 'wellness-motivation',
      label: 'Wellness & motivation',
      description: 'Mood, encouragement, and reflection.',
      sortOrder: 30
    },
    {
      id: 'time-calendar',
      label: 'Time & Calendar',
      description: 'Time-aware widgets for your home page.',
      sortOrder: 40
    }
  ];

  const WIDGET_DEFINITIONS = {
    'quick-note': createQuickNoteDefinition(),
    'bookmark-count': createBookmarkCountDefinition(),
    'daily-affirmation': createDailyAffirmationDefinition(),
    'today-date': createTodayDateDefinition(),
    'digital-clock': createDigitalClockDefinition()
  };

  function getCategories() {
    return CATEGORY_DEFINITIONS
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((category) => ({ ...category }));
  }

  function getCategory(categoryId) {
    return getCategories().find((category) => category.id === categoryId) || null;
  }

  function getDefinitions() {
    return Object.values(WIDGET_DEFINITIONS)
      .slice()
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
  }

  function getDefinition(widgetId) {
    return widgetId ? WIDGET_DEFINITIONS[widgetId] || null : null;
  }

  function getDefaultCategoryId() {
    const firstDefinition = getDefinitions()[0];
    return firstDefinition ? firstDefinition.categoryId : (CATEGORY_DEFINITIONS[0] ? CATEGORY_DEFINITIONS[0].id : null);
  }

  function getCatalogWidgets(options = {}) {
    const { categoryId = null, query = '' } = options;
    const normalizedQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';

    return getDefinitions().filter((definition) => {
      if (categoryId && definition.categoryId !== categoryId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        definition.name,
        definition.description,
        ...(Array.isArray(definition.tags) ? definition.tags : [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }

  function createInstance(widgetId, options = {}) {
    const definition = getDefinition(widgetId);
    if (!definition) {
      return null;
    }

    return {
      kind: 'widget-instance',
      version: 1,
      instanceId: createInstanceId(),
      widgetId: definition.id,
      settings: definition.sanitizeSettings(options.settings || {})
    };
  }

  function normalizeStoredRecord(record) {
    if (!record || typeof record !== 'object') {
      return record;
    }

    if (record.kind === 'widget-instance' && typeof record.widgetId === 'string') {
      const definition = getDefinition(record.widgetId);
      if (!definition) {
        return record;
      }

      return {
        ...record,
        kind: 'widget-instance',
        version: 1,
        instanceId: record.instanceId || createInstanceId(),
        settings: definition.sanitizeSettings(record.settings || {})
      };
    }

    if (record.id === 'clock') {
      return createInstance('digital-clock', {
        settings: record.settings || {}
      });
    }

    return record;
  }

  function isWidgetInstanceRecord(record) {
    return Boolean(record && record.kind === 'widget-instance' && typeof record.widgetId === 'string');
  }

  function getWidgetPreview(record, now = new Date()) {
    const normalizedRecord = normalizeStoredRecord(record);
    if (!isWidgetInstanceRecord(normalizedRecord)) {
      return {
        label: normalizedRecord?.title || normalizedRecord?.id || 'Widget',
        subtext: normalizedRecord?.subtitle || 'Legacy widget',
        icon: normalizedRecord?.icon || 'bookmark'
      };
    }

    const definition = getDefinition(normalizedRecord.widgetId);
    if (!definition || typeof definition.getPreview !== 'function') {
      return {
        label: definition?.name || 'Widget',
        subtext: definition?.description || 'Custom widget',
        icon: definition?.icon || 'bookmark'
      };
    }

    return definition.getPreview(normalizedRecord, now);
  }

  function bindWidgetElement(element, record) {
    const normalizedRecord = normalizeStoredRecord(record);
    if (!isWidgetInstanceRecord(normalizedRecord)) {
      return null;
    }

    const definition = getDefinition(normalizedRecord.widgetId);
    if (!definition || typeof definition.bindElement !== 'function') {
      return null;
    }

    return definition.bindElement(element, normalizedRecord);
  }

  function hasSettings(record) {
    const normalizedRecord = normalizeStoredRecord(record);
    if (!isWidgetInstanceRecord(normalizedRecord)) {
      return false;
    }

    const definition = getDefinition(normalizedRecord.widgetId);
    return Boolean(definition && definition.hasSettings);
  }

  function validateWidgetSettings(widgetId, settings) {
    const definition = getDefinition(widgetId);
    if (!definition) {
      return { valid: false, message: 'Unknown widget.' };
    }

    if (typeof definition.validateSettings !== 'function') {
      return { valid: true };
    }

    return definition.validateSettings(settings);
  }

  function createDigitalClockDefinition() {
    return {
      id: 'digital-clock',
      name: 'Digital clock',
      description: 'A live clock with per-widget timezone and format settings.',
      categoryId: 'time-calendar',
      icon: 'schedule',
      tags: ['clock', 'time', 'timezone', 'calendar'],
      supportsMultiple: true,
      hasSettings: true,
      sortOrder: 10,
      sanitizeSettings,
      validateSettings,
      getPreview,
      bindElement
    };

    function sanitizeSettings(settings = {}) {
      const normalizedTimeFormat = settings.timeFormat === '12-hour' ? '12-hour' : '24-hour';
      const normalizedTimeZone = normalizeTimeZone(settings.timezone);
      return {
        timeFormat: normalizedTimeFormat,
        showSeconds: Boolean(settings.showSeconds),
        timezone: normalizedTimeZone,
        label: typeof settings.label === 'string' ? settings.label.trim().slice(0, 40) : ''
      };
    }

    function validateSettings(settings = {}) {
      const normalizedTimeZone = normalizeTimeZone(settings.timezone);
      if (normalizedTimeZone === 'local') {
        return { valid: true };
      }

      try {
        new Intl.DateTimeFormat([], { timeZone: normalizedTimeZone }).format(new Date());
        return { valid: true };
      } catch (_error) {
        return {
          valid: false,
          field: 'timezone',
          message: 'Use local or a valid IANA timezone like Europe/London.'
        };
      }
    }

    function getPreview(record, now = new Date()) {
      const settings = sanitizeSettings(record?.settings || {});
      return {
        label: formatTime(now, settings),
        subtext: settings.label || formatTimeZoneLabel(settings.timezone),
        icon: 'schedule'
      };
    }

    function bindElement(element, record) {
      if (!element) {
        return null;
      }

      const update = () => {
        const preview = getPreview(record, new Date());
        const labelEl = element.querySelector('.widget-small__label');
        const subtextEl = element.querySelector('.widget-small__subtext');

        if (labelEl) {
          labelEl.textContent = preview.label;
        }

        if (subtextEl) {
          subtextEl.textContent = preview.subtext;
        }
      };

      update();

      const settings = sanitizeSettings(record?.settings || {});
      const refreshIntervalMs = settings.showSeconds ? 1000 : 15000;
      const intervalId = window.setInterval(update, refreshIntervalMs);

      return () => {
        window.clearInterval(intervalId);
      };
    }
  }

  function createQuickNoteDefinition() {
    return {
      id: 'quick-note',
      name: 'Quick note',
      description: 'Pin a short reminder or next step to the home page.',
      categoryId: 'productivity',
      icon: 'edit_note',
      tags: ['note', 'memo', 'reminder', 'task'],
      supportsMultiple: true,
      hasSettings: true,
      sortOrder: 10,
      sanitizeSettings,
      validateSettings,
      getPreview
    };

    function sanitizeSettings(settings = {}) {
      return {
        note: typeof settings.note === 'string' ? settings.note.trim().slice(0, 80) : ''
      };
    }

    function validateSettings() {
      return { valid: true };
    }

    function getPreview(record) {
      const settings = sanitizeSettings(record?.settings || {});
      const note = settings.note || '';
      return {
        label: note ? truncateText(note, 24) : 'Quick note',
        subtext: note ? 'Pinned note' : 'Add a short note',
        icon: 'edit_note'
      };
    }
  }

  function createBookmarkCountDefinition() {
    return {
      id: 'bookmark-count',
      name: 'Bookmark count',
      description: 'See how many saved bookmarks you have right now.',
      categoryId: 'information',
      icon: 'bookmark',
      tags: ['bookmarks', 'count', 'library', 'saved'],
      supportsMultiple: true,
      hasSettings: false,
      sortOrder: 20,
      sanitizeSettings: () => ({}),
      validateSettings: () => ({ valid: true }),
      getPreview() {
        return {
          label: 'Loading...',
          subtext: 'Saved bookmarks',
          icon: 'bookmark'
        };
      },
      bindElement(element) {
        if (!element) {
          return null;
        }

        let cancelled = false;
        const labelEl = element.querySelector('.widget-small__label');
        const subtextEl = element.querySelector('.widget-small__subtext');

        getBookmarkCount()
          .then((count) => {
            if (cancelled) return;
            if (labelEl) {
              labelEl.textContent = String(count);
            }
            if (subtextEl) {
              subtextEl.textContent = count === 1 ? 'Saved bookmark' : 'Saved bookmarks';
            }
          })
          .catch(() => {
            if (cancelled) return;
            if (labelEl) {
              labelEl.textContent = '--';
            }
            if (subtextEl) {
              subtextEl.textContent = 'Saved bookmarks';
            }
          });

        return () => {
          cancelled = true;
        };
      }
    };
  }

  function createDailyAffirmationDefinition() {
    const affirmations = [
      'Keep going',
      'Stay curious',
      'Small steps',
      'You are building momentum',
      'Progress counts',
      'One thing at a time'
    ];

    return {
      id: 'daily-affirmation',
      name: 'Daily affirmation',
      description: 'A small encouraging message for the day.',
      categoryId: 'wellness-motivation',
      icon: 'self_improvement',
      tags: ['affirmation', 'motivation', 'mindset', 'wellness'],
      supportsMultiple: true,
      hasSettings: false,
      sortOrder: 30,
      sanitizeSettings: () => ({}),
      validateSettings: () => ({ valid: true }),
      getPreview(_record, now = new Date()) {
        const affirmation = affirmations[getDaySeed(now) % affirmations.length];
        return {
          label: truncateText(affirmation, 24),
          subtext: 'Daily affirmation',
          icon: 'self_improvement'
        };
      }
    };
  }

  function createTodayDateDefinition() {
    return {
      id: 'today-date',
      name: 'Today date',
      description: 'A simple date widget for the current day.',
      categoryId: 'time-calendar',
      icon: 'today',
      tags: ['date', 'calendar', 'today', 'day'],
      supportsMultiple: true,
      hasSettings: false,
      sortOrder: 20,
      sanitizeSettings: () => ({}),
      validateSettings: () => ({ valid: true }),
      getPreview(_record, now = new Date()) {
        return {
          label: new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' }).format(now),
          subtext: new Intl.DateTimeFormat([], { weekday: 'long' }).format(now),
          icon: 'today'
        };
      },
      bindElement(element) {
        if (!element) {
          return null;
        }

        const update = () => {
          const preview = this.getPreview(null, new Date());
          const labelEl = element.querySelector('.widget-small__label');
          const subtextEl = element.querySelector('.widget-small__subtext');
          if (labelEl) {
            labelEl.textContent = preview.label;
          }
          if (subtextEl) {
            subtextEl.textContent = preview.subtext;
          }
        };

        update();
        const intervalId = window.setInterval(update, 60000);
        return () => {
          window.clearInterval(intervalId);
        };
      }
    };
  }

  function formatTime(now, settings) {
    const formatterOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: settings.timeFormat === '12-hour'
    };

    if (settings.timeFormat !== '12-hour') {
      formatterOptions.hourCycle = 'h23';
    }

    if (settings.showSeconds) {
      formatterOptions.second = '2-digit';
    }

    const timeZone = normalizeTimeZone(settings.timezone);
    if (timeZone !== 'local') {
      formatterOptions.timeZone = timeZone;
    }

    return new Intl.DateTimeFormat([], formatterOptions).format(now);
  }

  function normalizeTimeZone(value) {
    if (typeof value !== 'string') {
      return 'local';
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return 'local';
    }

    return normalizedValue.toLowerCase() === 'local' ? 'local' : normalizedValue;
  }

  function formatTimeZoneLabel(timeZone) {
    if (!timeZone || timeZone === 'local') {
      return 'Local time';
    }

    return timeZone.replace(/_/g, ' ');
  }

  function createInstanceId() {
    return `widget-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function truncateText(value, maxLength) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  }

  function getDaySeed(now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    return Math.floor(Date.UTC(year, month, day) / 86400000);
  }

  function getBookmarkCount() {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.bookmarks || typeof chrome.bookmarks.getTree !== 'function') {
        resolve(0);
        return;
      }

      chrome.bookmarks.getTree((tree) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(countBookmarks(tree));
      });
    });
  }

  function countBookmarks(nodes = []) {
    return nodes.reduce((total, node) => {
      if (!node || typeof node !== 'object') {
        return total;
      }

      if (node.url) {
        return total + 1;
      }

      const children = Array.isArray(node.children) ? node.children : [];
      return total + countBookmarks(children);
    }, 0);
  }

  return {
    getCategories,
    getCategory,
    getDefinitions,
    getDefinition,
    getDefaultCategoryId,
    getCatalogWidgets,
    createInstance,
    normalizeStoredRecord,
    isWidgetInstanceRecord,
    getWidgetPreview,
    bindWidgetElement,
    hasSettings,
    validateWidgetSettings
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WidgetRegistryService;
}