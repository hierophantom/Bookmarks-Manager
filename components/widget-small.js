/**
 * Widget Small Component
 *
 * Design System Component - BMG-108
 * Types: Widget, Empty slot
 * States: Idle, Hover, Dragged active
 */

/**
 * Creates a widget-small element
 * @param {Object} options - Widget configuration
 * @param {string} [options.type='widget'] - 'widget' or 'empty'
 * @param {string} [options.state='idle'] - 'idle', 'hover', or 'dragged'
 * @param {string} [options.label='Label'] - Label text
 * @param {string} [options.subtext='Subtext'] - Subtext text
 * @param {string|HTMLElement} [options.icon] - Icon for widget
 * @param {Array<HTMLElement>} [options.actions=[]] - Action elements for hover state
 * @returns {HTMLDivElement} Widget element
 */
function createWidgetSmall(options = {}) {
  const {
    type = 'widget',
    state = 'idle',
    label = 'Label',
    subtext = 'Subtext',
    icon = null,
    actions = []
  } = options;

  const widget = document.createElement('div');
  widget.className = 'widget-small';

  applyWidgetSmallType(widget, type);
  applyWidgetSmallState(widget, state);

  if (type === 'widget') {
    const content = document.createElement('div');
    content.className = 'widget-small__content';

    const iconEl = createWidgetSmallIcon(icon);
    if (iconEl) {
      content.appendChild(iconEl);
    }

    const textEl = document.createElement('div');
    textEl.className = 'widget-small__text';

    const labelEl = document.createElement('div');
    labelEl.className = 'widget-small__label';
    labelEl.textContent = label;

    const subtextEl = document.createElement('div');
    subtextEl.className = 'widget-small__subtext';
    subtextEl.textContent = subtext;

    textEl.appendChild(labelEl);
    textEl.appendChild(subtextEl);
    content.appendChild(textEl);

    widget.appendChild(content);
  }

  if (type === 'empty' && state === 'dragged') {
    const plusEl = createWidgetSmallIcon('+');
    if (plusEl) {
      widget.appendChild(plusEl);
    }
  }

  if (type === 'widget' && state === 'hover' && actions.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'widget-small__actions';
    actions.forEach((actionEl) => {
      if (actionEl instanceof HTMLElement) {
        actionsEl.appendChild(actionEl);
      }
    });
    widget.appendChild(actionsEl);
  }

  return widget;
}

/**
 * Applies widget-small type
 * @param {HTMLDivElement} widget - Widget element
 * @param {string} type - 'widget' or 'empty'
 */
function applyWidgetSmallType(widget, type) {
  widget.classList.remove('widget-small--widget', 'widget-small--empty');
  widget.classList.add(`widget-small--${type}`);
}

/**
 * Applies widget-small state
 * @param {HTMLDivElement} widget - Widget element
 * @param {string} state - 'idle', 'hover', or 'dragged'
 */
function applyWidgetSmallState(widget, state) {
  widget.classList.remove('widget-small--idle', 'widget-small--hover', 'widget-small--dragged');
  widget.classList.add(`widget-small--${state}`);
}

/**
 * Updates widget label text
 * @param {HTMLDivElement} widget - Widget element
 * @param {string} label - New label
 */
function updateWidgetSmallLabel(widget, label) {
  const labelEl = widget.querySelector('.widget-small__label');
  if (labelEl) {
    labelEl.textContent = label;
  }
}

/**
 * Updates widget subtext
 * @param {HTMLDivElement} widget - Widget element
 * @param {string} subtext - New subtext
 */
function updateWidgetSmallSubtext(widget, subtext) {
  const subtextEl = widget.querySelector('.widget-small__subtext');
  if (subtextEl) {
    subtextEl.textContent = subtext;
  }
}

/**
 * Updates widget icon
 * @param {HTMLDivElement} widget - Widget element
 * @param {string|HTMLElement} icon - New icon
 */
function updateWidgetSmallIcon(widget, icon) {
  const iconEl = widget.querySelector('.widget-small__icon');
  if (!iconEl) return;

  iconEl.innerHTML = '';

  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      iconEl.classList.add('widget-small__icon--text');
      iconEl.textContent = icon;
    }
  } else if (icon instanceof HTMLElement) {
    iconEl.appendChild(icon);
  }
}

function createWidgetSmallIcon(icon) {
  if (!icon) return null;

  const iconEl = document.createElement('div');
  iconEl.className = 'widget-small__icon';

  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      iconEl.classList.add('widget-small__icon--text');
      iconEl.textContent = icon;
    }
  } else if (icon instanceof HTMLElement) {
    iconEl.appendChild(icon);
  }

  return iconEl;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createWidgetSmall,
    applyWidgetSmallType,
    applyWidgetSmallState,
    updateWidgetSmallLabel,
    updateWidgetSmallSubtext,
    updateWidgetSmallIcon
  };
}
