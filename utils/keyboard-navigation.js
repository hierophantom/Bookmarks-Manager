/**
 * Keyboard Navigation Utility
 * Provides accessible keyboard navigation for lists (arrow keys, Home, End)
 */
const KeyboardNavigation = (() => {
  /**
   * Setup keyboard navigation for a list container
   * @param {HTMLElement} container - The container with list items
   * @param {string} itemSelector - CSS selector for list items
   * @param {Object} options - Configuration options
   * @param {Function} options.onItemFocus - Callback when item is focused
    * @param {Function} options.resolveAdjacentItem - Optional resolver for cross-container navigation.
    * Signature: ({ direction, currentItem, currentIndex, items }) => HTMLElement|null
   * @param {string} options.focusClass - CSS class to apply to focused item (default: 'focused')
   * @param {string} options.focusAttribute - Data attribute to mark focusable items (default: 'tabindex')
   */
  function setupListNavigation(container, itemSelector, options = {}) {
    if (!container) return;

    const {
      onItemFocus = null,
      resolveAdjacentItem = null,
      focusClass = 'focused',
      focusAttribute = 'tabindex'
    } = options;

    const items = Array.from(container.querySelectorAll(itemSelector));
    if (items.length === 0) return;

    // Mark items as focusable
    items.forEach((item, index) => {
      item.setAttribute(focusAttribute, index === 0 ? '0' : '-1');
      item.setAttribute('role', 'option');
    });

    // Set initial focus to first item
    let currentIndex = 0;

    function getRowStep() {
      if (items.length <= 1) return 1;

      const firstTop = items[0].offsetTop;
      let columns = 0;

      for (const item of items) {
        if (Math.abs(item.offsetTop - firstTop) <= 2) {
          columns += 1;
        } else {
          break;
        }
      }

      return Math.max(1, columns);
    }

    function focusItem(index) {
      // Wrap around
      if (index < 0) index = items.length - 1;
      if (index >= items.length) index = 0;

      // Remove focus class from all items
      items.forEach((item, i) => {
        item.classList.remove(focusClass);
        item.setAttribute(focusAttribute, i === index ? '0' : '-1');
      });

      // Add focus class and focus the item
      currentIndex = index;
      items[currentIndex].classList.add(focusClass);
      items[currentIndex].setAttribute(focusAttribute, '0');
      items[currentIndex].focus();

      // Call callback if provided
      if (onItemFocus) {
        onItemFocus(items[currentIndex], currentIndex);
      }

      // Scroll into view
      items[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function focusExternalItem(targetItem) {
      if (!targetItem || typeof targetItem.focus !== 'function') return false;

      // Leaving this section: clear local focus markers so stale strokes don't remain.
      items.forEach((item, i) => {
        item.classList.remove(focusClass);
        item.setAttribute(focusAttribute, '-1');
      });

      targetItem.focus();
      targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return true;
    }

    // Keyboard event handler
    const handleKeydown = (e) => {
      // Only handle if container is visible or focused
      if (!container.offsetParent && document.activeElement !== items[currentIndex]) {
        return;
      }

      let handled = false;
      const rowStep = getRowStep();

      switch (e.key) {
        case 'ArrowDown':
          if (currentIndex + rowStep >= items.length && typeof resolveAdjacentItem === 'function') {
            const nextItem = resolveAdjacentItem({
              direction: 'next',
              currentItem: items[currentIndex],
              currentIndex,
              items
            });
            if (focusExternalItem(nextItem)) {
              e.preventDefault();
              handled = true;
              break;
            }
          }
          e.preventDefault();
          focusItem(currentIndex + rowStep);
          handled = true;
          break;

        case 'ArrowUp':
          if (currentIndex - rowStep < 0 && typeof resolveAdjacentItem === 'function') {
            const previousItem = resolveAdjacentItem({
              direction: 'previous',
              currentItem: items[currentIndex],
              currentIndex,
              items
            });
            if (focusExternalItem(previousItem)) {
              e.preventDefault();
              handled = true;
              break;
            }
          }
          e.preventDefault();
          focusItem(currentIndex - rowStep);
          handled = true;
          break;

        case 'ArrowRight':
          e.preventDefault();
          focusItem(currentIndex + 1);
          handled = true;
          break;

        case 'ArrowLeft':
          e.preventDefault();
          focusItem(currentIndex - 1);
          handled = true;
          break;

        case 'Home':
          e.preventDefault();
          focusItem(0);
          handled = true;
          break;

        case 'End':
          e.preventDefault();
          focusItem(items.length - 1);
          handled = true;
          break;
      }

      return handled;
    };

    // Attach event listener to container or document
    const target = container.closest('[role="listbox"], [role="group"], .slots') || container;
    target.addEventListener('keydown', handleKeydown);

    // Also handle Enter key on focused item
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement === items[currentIndex]) {
        const link = items[currentIndex].querySelector('a');
        if (link) {
          link.click();
          e.preventDefault();
        }
      }
    });

    // Focus first item on container click
    container.addEventListener('click', (e) => {
      const item = e.target.closest(itemSelector);
      if (item) {
        const index = items.indexOf(item);
        if (index >= 0) {
          focusItem(index);
        }
      }
    });

    // Cleanup function
    return {
      focus: focusItem,
      getCurrentIndex: () => currentIndex,
      getItems: () => items,
      destroy: () => {
        target.removeEventListener('keydown', handleKeydown);
      }
    };
  }

  /**
   * Add ARIA attributes for accessibility
   * @param {HTMLElement} container - Container element
   * @param {string} label - ARIA label for the list
   */
  function addAriaAttributes(container, label) {
    if (!container) return;
    container.setAttribute('role', 'listbox');
    container.setAttribute('aria-label', label);
  }

  return {
    setupListNavigation,
    addAriaAttributes
  };
})();

if (typeof window !== 'undefined') {
  window.KeyboardNavigation = KeyboardNavigation;
}
