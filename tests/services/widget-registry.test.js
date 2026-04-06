const WidgetRegistryService = require('../../services/widget-registry.js');

describe('WidgetRegistryService', () => {
  test('creates a sanitized digital clock instance', () => {
    const instance = WidgetRegistryService.createInstance('digital-clock', {
      settings: {
        timeFormat: '12-hour',
        showSeconds: true,
        timezone: 'Europe/London',
        label: 'Office'
      }
    });

    expect(instance.kind).toBe('widget-instance');
    expect(instance.widgetId).toBe('digital-clock');
    expect(instance.settings).toEqual({
      timeFormat: '12-hour',
      showSeconds: true,
      timezone: 'Europe/London',
      label: 'Office'
    });
    expect(instance.instanceId).toMatch(/^widget-/);
  });

  test('normalizes legacy clock records into digital clock instances', () => {
    const normalized = WidgetRegistryService.normalizeStoredRecord({
      id: 'clock',
      title: 'Clock'
    });

    expect(normalized.kind).toBe('widget-instance');
    expect(normalized.widgetId).toBe('digital-clock');
    expect(normalized.settings).toEqual({
      timeFormat: '24-hour',
      showSeconds: false,
      timezone: 'local',
      label: ''
    });
  });

  test('filters catalog widgets within the requested category', () => {
    const timeWidgets = WidgetRegistryService.getCatalogWidgets({ categoryId: 'time-calendar' });
    const productivityWidgets = WidgetRegistryService.getCatalogWidgets({ categoryId: 'productivity' });
    const informationWidgets = WidgetRegistryService.getCatalogWidgets({ categoryId: 'information' });
    const wellnessWidgets = WidgetRegistryService.getCatalogWidgets({ categoryId: 'wellness-motivation' });

    expect(timeWidgets.map((widget) => widget.id)).toEqual(['digital-clock', 'today-date']);
    expect(productivityWidgets.map((widget) => widget.id)).toEqual(['quick-note']);
    expect(informationWidgets.map((widget) => widget.id)).toEqual(['bookmark-count']);
    expect(wellnessWidgets.map((widget) => widget.id)).toEqual(['daily-affirmation']);
  });

  test('validates timezone settings for digital clock', () => {
    const valid = WidgetRegistryService.validateWidgetSettings('digital-clock', {
      timezone: 'America/New_York'
    });
    const invalid = WidgetRegistryService.validateWidgetSettings('digital-clock', {
      timezone: 'Mars/Olympus'
    });

    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
    expect(invalid.field).toBe('timezone');
  });

  test('sanitizes quick note settings', () => {
    const instance = WidgetRegistryService.createInstance('quick-note', {
      settings: {
        note: '   Finish the widget shop polish before lunch   '
      }
    });

    expect(instance.widgetId).toBe('quick-note');
    expect(instance.settings).toEqual({
      note: 'Finish the widget shop polish before lunch'
    });
  });
});