/**
 * Quote Component
 * 
 * Design System Component - BMG-90
 * 
 * @example
 * // Create a quote with default settings
 * const quote = createQuote({
 *   text: 'The only way to do great work is to love what you do.',
 *   author: 'Steve Jobs',
 *   onAuthorClick: () => console.log('Author clicked')
 * });
 * 
 * @example
 * // Create quote with custom max width
 * const shortQuote = createQuote({
 *   text: 'Be yourself.',
 *   author: 'Oscar Wilde',
 *   maxWidth: 300,
 *   onAuthorClick: (author) => window.location.href = `/author/${author}`
 * });
 */

/**
 * Creates a quote component element
 * @param {Object} options - Quote configuration
 * @param {string} options.text - The quote text (without quotes)
 * @param {string} options.author - The author name
 * @param {Function} [options.onAuthorClick] - Click handler for author name
 * @param {number|string} [options.maxWidth='600px'] - Max width for quote text before truncation
 * @param {boolean} [options.noTruncate=false] - Disable text truncation
 * @param {string} [options.separator='-'] - Separator between quote and author
 * @returns {HTMLDivElement} The quote element
 */
function createQuote(options = {}) {
  const {
    text = '',
    author = '',
    onAuthorClick = null,
    maxWidth = '600px',
    noTruncate = false,
    separator = '-'
  } = options;

  // Validate required fields
  if (!text || !author) {
    console.error('Quote component requires both text and author');
    return null;
  }

  // Create container
  const container = document.createElement('div');
  container.className = 'quote';
  
  if (noTruncate) {
    container.classList.add('quote--no-truncate');
  }

  // Create quote text element
  const quoteText = document.createElement('span');
  quoteText.className = 'quote__text';
  quoteText.textContent = `"${text}"`;
  
  // Apply custom max-width if provided
  if (maxWidth && !noTruncate) {
    if (typeof maxWidth === 'number') {
      quoteText.style.maxWidth = `${maxWidth}px`;
    } else {
      quoteText.style.maxWidth = maxWidth;
    }
  }
  
  container.appendChild(quoteText);

  // Create separator
  const sep = document.createElement('span');
  sep.className = 'quote__separator';
  sep.textContent = separator;
  container.appendChild(sep);

  // Create author button
  const authorBtn = document.createElement('button');
  authorBtn.className = 'quote__author';
  authorBtn.type = 'button';
  authorBtn.textContent = author;
  authorBtn.setAttribute('aria-label', `View quotes by ${author}`);
  
  // Attach click handler
  if (onAuthorClick && typeof onAuthorClick === 'function') {
    authorBtn.addEventListener('click', () => onAuthorClick(author));
  }
  
  container.appendChild(authorBtn);

  return container;
}

/**
 * Updates quote text
 * @param {HTMLDivElement} quoteElement - The quote element
 * @param {string} text - New quote text
 */
function updateQuoteText(quoteElement, text) {
  const textEl = quoteElement.querySelector('.quote__text');
  if (textEl) {
    textEl.textContent = `"${text}"`;
  }
}

/**
 * Updates author name
 * @param {HTMLDivElement} quoteElement - The quote element
 * @param {string} author - New author name
 */
function updateQuoteAuthor(quoteElement, author) {
  const authorEl = quoteElement.querySelector('.quote__author');
  if (authorEl) {
    authorEl.textContent = author;
    authorEl.setAttribute('aria-label', `View quotes by ${author}`);
  }
}

/**
 * Updates both quote and author
 * @param {HTMLDivElement} quoteElement - The quote element
 * @param {string} text - New quote text
 * @param {string} author - New author name
 */
function updateQuote(quoteElement, text, author) {
  updateQuoteText(quoteElement, text);
  updateQuoteAuthor(quoteElement, author);
}

/**
 * Sets the max width for quote text truncation
 * @param {HTMLDivElement} quoteElement - The quote element
 * @param {number|string} maxWidth - Max width (number in px or string with unit)
 */
function setQuoteMaxWidth(quoteElement, maxWidth) {
  const textEl = quoteElement.querySelector('.quote__text');
  if (textEl) {
    if (typeof maxWidth === 'number') {
      textEl.style.maxWidth = `${maxWidth}px`;
    } else {
      textEl.style.maxWidth = maxWidth;
    }
  }
}

/**
 * Toggles text truncation
 * @param {HTMLDivElement} quoteElement - The quote element
 * @param {boolean} noTruncate - Whether to disable truncation
 */
function toggleQuoteTruncation(quoteElement, noTruncate) {
  quoteElement.classList.toggle('quote--no-truncate', noTruncate);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createQuote,
    updateQuoteText,
    updateQuoteAuthor,
    updateQuote,
    setQuoteMaxWidth,
    toggleQuoteTruncation
  };
}
