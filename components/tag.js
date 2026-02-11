/**
 * Tag Component
 * 
 * Design System Component - BMG-94
 * 
 * @example
 * // Create basic tag
 * const tag = createTag({ text: 'JavaScript' });
 * 
 * @example
 * // Create tag with remove button
 * const tag = createTag({
 *   text: 'React',
 *   onRemove: () => console.log('removed'),
 *   contrast: 'high'
 * });
 */

/**
 * Creates a tag element
 * @param {Object} options - Tag configuration
 * @param {string} options.text - Tag text content
 * @param {string} [options.contrast='low'] - Contrast level: 'low' or 'high'
 * @param {boolean} [options.removable=false] - Whether to show remove button
 * @param {Function} [options.onRemove] - Callback when remove button is clicked
 * @param {Function} [options.onClick] - Callback when tag is clicked
 * @param {boolean} [options.disabled=false] - Whether tag is disabled
 * @param {string} [options.size='default'] - Size: 'small', 'default', 'large'
 * @param {Object} [options.customColor] - Custom colors: {background, text}
 * @returns {HTMLDivElement} The tag element
 */
function createTag(options = {}) {
  const {
    text = '',
    contrast = 'low',
    removable = false,
    onRemove = null,
    onClick = null,
    disabled = false,
    size = 'default',
    customColor = null
  } = options;

  if (!text) {
    console.error('Tag requires text content');
    return null;
  }

  // Create tag container
  const tag = document.createElement('div');
  tag.className = `tag tag--${contrast}-contrast`;
  tag.setAttribute('role', 'listitem');
  tag.setAttribute('aria-label', text);
  
  // Add size class
  if (size !== 'default') {
    tag.classList.add(`tag--${size}`);
  }
  
  // Add clickable class if onClick provided
  if (onClick) {
    tag.classList.add('tag--clickable');
    tag.setAttribute('role', 'button');
    tag.setAttribute('tabindex', '0');
  }
  
  // Add disabled class
  if (disabled) {
    tag.classList.add('tag--disabled');
    tag.setAttribute('aria-disabled', 'true');
  }
  
  // Apply custom color
  if (customColor) {
    tag.classList.add('tag--color');
    tag.style.background = customColor.background;
    tag.style.color = customColor.text;
  }
  
  // Create text element
  const textEl = document.createElement('span');
  textEl.className = 'tag__text';
  textEl.textContent = text;
  tag.appendChild(textEl);
  
  // Add remove button if needed
  if (removable) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'tag__remove';
    removeBtn.setAttribute('type', 'button');
    removeBtn.setAttribute('aria-label', `Remove ${text}`);
    removeBtn.setAttribute('tabindex', '0');
    
    // Create X icon (simple SVG)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tag__remove-icon');
    svg.setAttribute('viewBox', '0 0 8 8');
    svg.setAttribute('fill', 'none');
    
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '1.5');
    line1.setAttribute('y1', '1.5');
    line1.setAttribute('x2', '6.5');
    line1.setAttribute('y2', '6.5');
    
    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '6.5');
    line2.setAttribute('y1', '1.5');
    line2.setAttribute('x2', '1.5');
    line2.setAttribute('y2', '6.5');
    
    svg.appendChild(line1);
    svg.appendChild(line2);
    removeBtn.appendChild(svg);
    
    // Handle remove click
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!disabled && onRemove) {
        onRemove(tag);
      }
    });
    
    tag.appendChild(removeBtn);
  }
  
  // Handle tag click
  if (onClick && !disabled) {
    tag.addEventListener('click', () => onClick(tag));
    tag.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(tag);
      }
    });
  }
  
  return tag;
}

/**
 * Updates tag text
 * @param {HTMLDivElement} tag - The tag element
 * @param {string} text - New text content
 */
function updateTagText(tag, text) {
  const textEl = tag.querySelector('.tag__text');
  if (textEl) {
    textEl.textContent = text;
    tag.setAttribute('aria-label', text);
  }
}

/**
 * Updates tag contrast
 * @param {HTMLDivElement} tag - The tag element
 * @param {string} contrast - Contrast level: 'low' or 'high'
 */
function updateTagContrast(tag, contrast) {
  tag.classList.remove('tag--low-contrast', 'tag--high-contrast');
  tag.classList.add(`tag--${contrast}-contrast`);
}

/**
 * Toggles tag disabled state
 * @param {HTMLDivElement} tag - The tag element
 * @param {boolean} disabled - Whether to disable the tag
 */
function toggleTagDisabled(tag, disabled) {
  if (disabled) {
    tag.classList.add('tag--disabled');
    tag.setAttribute('aria-disabled', 'true');
  } else {
    tag.classList.remove('tag--disabled');
    tag.removeAttribute('aria-disabled');
  }
}

/**
 * Creates a tag list container
 * @param {Array<Object>} tags - Array of tag configurations
 * @param {Object} [options] - Container options
 * @returns {HTMLDivElement} The tag list container
 */
function createTagList(tags = [], options = {}) {
  const {
    gap = '8px',
    wrap = true
  } = options;

  const container = document.createElement('div');
  container.className = 'tag-list';
  container.setAttribute('role', 'list');
  container.style.cssText = `
    display: flex;
    gap: ${gap};
    align-items: center;
    ${wrap ? 'flex-wrap: wrap;' : 'flex-wrap: nowrap; overflow-x: auto;'}
  `;
  
  tags.forEach(tagConfig => {
    const tag = createTag(tagConfig);
    if (tag) {
      container.appendChild(tag);
    }
  });
  
  return container;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTag,
    updateTagText,
    updateTagContrast,
    toggleTagDisabled,
    createTagList
  };
}
