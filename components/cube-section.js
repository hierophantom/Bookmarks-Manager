/**
 * Cube Section Component
 *
 * Design System Component - BMG-109
 * States: Idle, Hover
 */

/**
 * Creates a cube section element
 * @param {Object} options - Section configuration
 * @param {Array<HTMLElement>} [options.items=[]] - Widget items to render
 * @param {string} [options.state='idle'] - 'idle' or 'hover'
 * @param {string} [options.wrap='none'] - 'none' or 'vertical'
 * @param {HTMLElement|null} [options.action=null] - Action element for hover state
 * @returns {HTMLDivElement} The cube section element
 */
function createCubeSection(options = {}) {
  const {
    items = [],
    state = 'idle',
    wrap = 'none',
    action = null
  } = options;

  const section = document.createElement('div');
  section.className = 'cube-section';

  applyCubeSectionState(section, state);

  const itemsEl = document.createElement('div');
  itemsEl.className = 'cube-section__items';

  if (wrap === 'vertical') {
    itemsEl.classList.add('cube-section__items--wrap-vertical');
  }

  items.forEach((item) => {
    if (item instanceof HTMLElement) {
      itemsEl.appendChild(item);
    }
  });

  section.appendChild(itemsEl);

  if (state === 'hover' && action instanceof HTMLElement) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'cube-section__actions';
    actionsEl.appendChild(action);
    section.appendChild(actionsEl);
  }

  return section;
}

/**
 * Applies cube section state
 * @param {HTMLDivElement} section - Section element
 * @param {string} state - 'idle' or 'hover'
 */
function applyCubeSectionState(section, state) {
  section.classList.remove('cube-section--idle', 'cube-section--hover');
  section.classList.add(`cube-section--${state}`);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createCubeSection,
    applyCubeSectionState
  };
}
