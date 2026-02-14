/**
 * Tooltip Component
 * 
 * Design System Component - BMG-95
 * 
 * @example
 * // Create tooltip with hover trigger
 * const trigger = createTooltip({
 *   text: 'Delete bookmark',
 *   target: buttonElement,
 *   position: 'top'
 * });
 * 
 * @example
 * // Manual tooltip control
 * const tooltip = createTooltipElement('Edit');
 * showTooltip(tooltip, targetElement, 'bottom');
 */

/**
 * Creates a tooltip element
 * @param {string} text - Tooltip text content
 * @param {string} [position='top'] - Position: 'top', 'bottom', 'left', 'right'
 * @param {string} [delay='fast'] - Show delay: 'instant', 'fast', 'slow'
 * @returns {HTMLDivElement} The tooltip element
 */
function createTooltipElement(text, position = 'top', delay = 'fast') {
  if (!text) {
    console.error('Tooltip requires text content');
    return null;
  }

  const tooltip = document.createElement('div');
  tooltip.className = `tooltip tooltip--${position} tooltip--${delay}`;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-hidden', 'true');
  
  const textEl = document.createElement('span');
  textEl.className = 'tooltip__text';
  textEl.textContent = text;
  
  tooltip.appendChild(textEl);
  
  return tooltip;
}

/**
 * Creates a tooltip with automatic hover behavior
 * @param {Object} options - Tooltip configuration
 * @param {string} options.text - Tooltip text
 * @param {HTMLElement} options.target - Target element to attach tooltip to
 * @param {string} [options.position='top'] - Position relative to target
 * @param {string} [options.delay='fast'] - Show delay
 * @param {boolean} [options.hoverOnly=true] - Only show on hover
 * @returns {Object} - Object with tooltip element and control functions
 */
function createTooltip(options = {}) {
  const {
    text = '',
    target = null,
    position = 'top',
    delay = 'fast',
    hoverOnly = true
  } = options;

  if (!target) {
    console.error('Tooltip requires a target element');
    return null;
  }

  // Create wrapper if target doesn't have relative positioning
  let wrapper = target.parentElement;
  if (!wrapper) {
    return null;
  }
  if (!wrapper.classList.contains('tooltip-trigger')) {
    wrapper = document.createElement('div');
    wrapper.className = 'tooltip-trigger';
    target.parentNode.insertBefore(wrapper, target);
    wrapper.appendChild(target);
  }

  // Create tooltip
  const tooltip = createTooltipElement(text, position, delay);
  wrapper.appendChild(tooltip);

  let showTimeout = null;
  let hideTimeout = null;

  // Show tooltip
  function show() {
    clearTimeout(hideTimeout);
    
    const delayMs = delay === 'instant' ? 0 : delay === 'slow' ? 800 : 200;
    
    showTimeout = setTimeout(() => {
      tooltip.classList.add('tooltip--visible');
      tooltip.setAttribute('aria-hidden', 'false');
    }, delayMs);
  }

  // Hide tooltip
  function hide() {
    clearTimeout(showTimeout);
    
    hideTimeout = setTimeout(() => {
      tooltip.classList.remove('tooltip--visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }, 100);
  }

  // Attach hover listeners if needed
  if (hoverOnly) {
    target.addEventListener('mouseenter', show);
    target.addEventListener('mouseleave', hide);
    target.addEventListener('focus', show);
    target.addEventListener('blur', hide);
  }

  // Return control object
  return {
    element: tooltip,
    show,
    hide,
    destroy: () => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
      target.removeEventListener('mouseenter', show);
      target.removeEventListener('mouseleave', hide);
      target.removeEventListener('focus', show);
      target.removeEventListener('blur', hide);
    }
  };
}

/**
 * Shows a tooltip relative to a target element
 * @param {HTMLDivElement} tooltip - The tooltip element
 * @param {HTMLElement} target - Target element
 * @param {string} [position='top'] - Position relative to target
 */
function showTooltip(tooltip, target, position = 'top') {
  if (!tooltip || !target) return;

  // Update position class
  tooltip.className = tooltip.className.replace(/tooltip--(top|bottom|left|right)/, `tooltip--${position}`);
  
  // Position tooltip
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let top = 0;
  let left = 0;
  
  switch (position) {
    case 'top':
      top = targetRect.top - tooltipRect.height - 4;
      left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
      break;
    case 'bottom':
      top = targetRect.bottom + 4;
      left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
      break;
    case 'left':
      top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
      left = targetRect.left - tooltipRect.width - 4;
      break;
    case 'right':
      top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
      left = targetRect.right + 4;
      break;
  }
  
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.classList.add('tooltip--visible');
  tooltip.setAttribute('aria-hidden', 'false');
}

/**
 * Hides a tooltip
 * @param {HTMLDivElement} tooltip - The tooltip element
 */
function hideTooltip(tooltip) {
  if (!tooltip) return;
  
  tooltip.classList.remove('tooltip--visible');
  tooltip.setAttribute('aria-hidden', 'true');
}

/**
 * Updates tooltip text
 * @param {HTMLDivElement} tooltip - The tooltip element
 * @param {string} text - New text content
 */
function updateTooltipText(tooltip, text) {
  const textEl = tooltip.querySelector('.tooltip__text');
  if (textEl) {
    textEl.textContent = text;
  }
}

/**
 * Updates tooltip position
 * @param {HTMLDivElement} tooltip - The tooltip element
 * @param {string} position - New position: 'top', 'bottom', 'left', 'right'
 */
function updateTooltipPosition(tooltip, position) {
  tooltip.className = tooltip.className.replace(/tooltip--(top|bottom|left|right)/, `tooltip--${position}`);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTooltipElement,
    createTooltip,
    showTooltip,
    hideTooltip,
    updateTooltipText,
    updateTooltipPosition
  };
}
