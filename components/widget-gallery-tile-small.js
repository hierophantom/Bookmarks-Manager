/**
 * Widget Small Component
 *
 * Design System Component - BMG-108
 * Types: Widget, Empty slot
 * States: Idle, Hover, Dragged active
 */

/**
 * Creates a widget-gallery-tile-small element
 * @param {Object} options - Widget configuration
 * @param {string} [options.type='widget'] - 'widget' or 'empty'
 * @param {string} [options.state='idle'] - 'idle', 'hover', or 'dragged'
 * @param {string} [options.label='Label'] - Label text
 * @param {string} [options.subtext='Subtext'] - Subtext text
 * @param {string|HTMLElement} [options.icon] - Icon for widget
 * @param {Array<HTMLElement>} [options.actions=[]] - Action elements for hover state
 * @returns {HTMLDivElement} Widget element
 */
function createWidgetGalleryTileSmall(options = {}) {
  const {
    type = 'widget',
    state = 'idle',
    label = 'Label',
    subtext = 'Subtext',
    icon = null,
    actions = []
  } = options;

  const widget = document.createElement('div');
  widget.className = 'widget-gallery-tile-small';

  applyWidgetSmallType(widget, type);
  applyWidgetSmallState(widget, state);

  if (type === 'widget') {
    const content = document.createElement('div');
    content.className = 'widget-gallery-tile-small__content';

    const iconEl = createWidgetGalleryTileSmallIcon(icon);
    if (iconEl) {
      content.appendChild(iconEl);
    }

    const textEl = document.createElement('div');
    textEl.className = 'widget-gallery-tile-small__text';

    const labelEl = document.createElement('div');
    labelEl.className = 'widget-gallery-tile-small__label';
    labelEl.textContent = label;

    const subtextEl = document.createElement('div');
    subtextEl.className = 'widget-gallery-tile-small__subtext';
    subtextEl.textContent = subtext;

    textEl.appendChild(labelEl);
    textEl.appendChild(subtextEl);
    content.appendChild(textEl);

    widget.appendChild(content);
  }

  if (type === 'empty' && state === 'dragged') {
    const plusEl = createWidgetGalleryTileSmallIcon('add');
    if (plusEl) {
      widget.appendChild(plusEl);
    }
  }

  if (type === 'widget' && actions.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'widget-gallery-tile-small__actions';
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
 * Applies widget-gallery-tile-small type
 * @param {HTMLDivElement} widget - Widget element
 * @param {string} type - 'widget' or 'empty'
 */
function applyWidgetSmallType(widget, type) {
  if (!widget || !widget.classList) return;
  widget.classList.remove('widget-gallery-tile-small--widget', 'widget-gallery-tile-small--empty');
  widget.classList.add(`widget-gallery-tile-small--${type}`);
}

/**
 * Applies widget-gallery-tile-small state
 * @param {HTMLDivElement} widget - Widget element
 * @param {string} state - 'idle', 'hover', or 'dragged'
 */
function applyWidgetSmallState(widget, state) {
  if (!widget || !widget.classList) return;
  widget.classList.remove('widget-gallery-tile-small--idle', 'widget-gallery-tile-small--hover', 'widget-gallery-tile-small--dragged');
  widget.classList.add(`widget-gallery-tile-small--${state}`);
}

/**
 * Updates widget label text
 * @param {HTMLDivElement} widget - Widget element
 * @param {string} label - New label
 */
function updateWidgetSmallLabel(widget, label) {
  const labelEl = widget.querySelector('.widget-gallery-tile-small__label');
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
  const subtextEl = widget.querySelector('.widget-gallery-tile-small__subtext');
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
  const iconEl = widget.querySelector('.widget-gallery-tile-small__icon');
  if (!iconEl) return;

  iconEl.innerHTML = '';

  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      iconEl.classList.add('widget-gallery-tile-small__icon--text');
      iconEl.textContent = icon;
    }
  } else if (icon instanceof HTMLElement) {
    iconEl.appendChild(icon);
  }
}

function createWidgetGalleryTileSmallIcon(icon) {
  if (!icon) return null;

  const iconEl = document.createElement('div');
  iconEl.className = 'widget-gallery-tile-small__icon';

  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      // Use Material Icons
      const materialIcon = document.createElement('span');
      materialIcon.className = 'material-symbols-outlined';
      materialIcon.textContent = icon;
      iconEl.appendChild(materialIcon);
    }
  } else if (icon instanceof HTMLElement) {
    iconEl.appendChild(icon);
  }

  return iconEl;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createWidgetGalleryTileSmall,
    applyWidgetSmallType,
    applyWidgetSmallState,
    updateWidgetSmallLabel,
    updateWidgetSmallSubtext,
    updateWidgetSmallIcon
  };
}
