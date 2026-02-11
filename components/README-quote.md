# Quote Component

**Design System Component** — BMG-90  
**Figma:** [node-id=92-9407](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=92-9407)

## Overview

Displays an inspirational quote with an interactive author name. Quote text can truncate when space is limited, but author name always remains fully visible.

## Anatomy

- **Quote Text**: The quote in quotation marks, truncates with ellipsis when too long
- **Separator**: Dash between quote and author
- **Author**: Clickable author name that never truncates
- **Gap**: 4px between elements

## States

### Idle
- **Quote**: bright-25 color
- **Separator**: bright-25 color
- **Author**: bright-10 color (grayed out), cursor pointer

### Hover (on author)
- **Author**: Changes to primary-25 color (#2e33b9), underlined

## Design Tokens

```css
/* Typography */
--font-family-sans-serif: 'Lato', sans-serif
--size-large: 16px (body-reg)
--weight-regular: 400

/* Colors */
--primary-primary-25: #2e33b9
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--common-common-bright-10: rgba(255, 255, 255, 0.4)
```

## Transitions

All state transitions use `0.2s ease`.

## Behavior

- **Quote truncation**: Quote text truncates with `...` when exceeding max-width
- **Author protection**: Author name never truncates (uses `whitespace: nowrap`)
- **Author interaction**: Only the author name is clickable
- **Text selection**: Disabled with `user-select: none`

## Usage

### HTML

```html
<!-- Basic quote -->
<div class="quote">
  <span class="quote__text">"The only way to do great work is to love what you do."</span>
  <span class="quote__separator">-</span>
  <button class="quote__author" type="button">Steve Jobs</button>
</div>

<!-- With custom max-width -->
<div class="quote">
  <span class="quote__text" style="max-width: 400px;">"Be yourself; everyone else is already taken."</span>
  <span class="quote__separator">-</span>
  <button class="quote__author" type="button">Oscar Wilde</button>
</div>

<!-- No truncation (multi-line) -->
<div class="quote quote--no-truncate">
  <span class="quote__text">"Long quote that wraps to multiple lines..."</span>
  <span class="quote__separator">-</span>
  <button class="quote__author" type="button">Author Name</button>
</div>
```

### JavaScript API

```js
// Create quote with default settings
const quote = createQuote({
  text: 'The only way to do great work is to love what you do.',
  author: 'Steve Jobs',
  onAuthorClick: (author) => {
    window.location.href = `/author/${author}`;
  }
});

// Create with custom max width
const shortQuote = createQuote({
  text: 'Be yourself.',
  author: 'Oscar Wilde',
  maxWidth: 300,
  onAuthorClick: (author) => console.log(author)
});

// Create with no truncation
const wrappingQuote = createQuote({
  text: 'Very long quote...',
  author: 'Some Author',
  noTruncate: true
});

// Update quote text only
updateQuoteText(quote, 'New quote text');

// Update author only
updateQuoteAuthor(quote, 'New Author');

// Update both at once
updateQuote(quote, 'New quote', 'New Author');

// Change max width
setQuoteMaxWidth(quote, 500);

// Toggle truncation
toggleQuoteTruncation(quote, true); // disable truncation
```

## Max Width Variants

Built-in size modifiers:

```html
<!-- Short: 300px -->
<div class="quote quote--short">...</div>

<!-- Medium: 600px (default) -->
<div class="quote quote--medium">...</div>

<!-- Long: 900px -->
<div class="quote quote--long">...</div>

<!-- Full: no max-width -->
<div class="quote quote--full">...</div>
```

## Accessibility

- Author uses semantic `<button>` element
- `aria-label` describes author link purpose
- Keyboard focus visible with outline
- Focus-visible support for modern browsers

## Files

- `quote.css` — Component styles
- `quote.js` — JavaScript API
- `quote.html` — Demo page
