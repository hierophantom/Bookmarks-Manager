# Design System Components

Component library for Bookmark Manager Chrome Extension, built with vanilla HTML, CSS, and JavaScript.

## Overview

This design system provides reusable UI components following the Figma design specifications. All components are implemented in vanilla web technologies without framework dependencies.

## Components

### Navigation & Controls

#### [Navigation Bar Button](README-navigation-bar-button.md) (BMG-87)
Pagination navigation buttons with current/other types and idle/hover/pressed states.
- **Files**: `navigation-bar-button.css`, `navigation-bar-button.js`, `navigation-bar-button.html`
- **States**: Current (selected), Other (unselected), Icon-only
- **Use cases**: Pagination, page navigation

#### [Pagination](README-pagination.md) (BMG-88)
Pill-shaped pagination control composed of current and icon-only buttons.
- **Files**: `pagination.css`, `pagination.js`, `pagination.html`
- **States**: Current, Other (icon-only)
- **Use cases**: Page navigation, section switching

#### [Search Bar](README-search-bar.md) (BMG-89)
Button-styled search trigger with keyboard shortcut hint.
- **Files**: `search-bar.css`, `search-bar.js`, `search-bar.html`
- **Features**: Hover state, keyboard shortcut display, disabled state
- **Use cases**: Global search, command palette trigger

#### [Search Component](README-search-comp.md) (BMG-99)
Input-style search field with shortcut hint support.
- **Files**: `search-comp.css`, `search-comp.js`, `search-comp.html`
- **Features**: Low/high contrast, focus state, optional shortcuts
- **Use cases**: Inline search, filter panels

#### [Action Button](README-action-button.md) (BMG-96)
Icon-only action button for toolbars and quick actions.
- **Files**: `action-button.css`, `action-button.js`, `action-button.html`
- **States**: Idle, hover, active, disabled
- **Use cases**: Quick actions, toolbars

#### [Cube Action Button](README-cube-action-button.md) (BMG-97)
Compact 16x16 icon-only action button.
- **Files**: `cube-action-button.css`, `cube-action-button.js`, `cube-action-button.html`
- **States**: Idle, hover, active, disabled
- **Use cases**: Inline actions, tag controls

#### [Cube Action Button with Label](README-cube-action-button-with-label.md) (BMG-98)
Compact button with icon and text label.
- **Files**: `cube-action-button-with-label.css`, `cube-action-button-with-label.js`, `cube-action-button-with-label.html`
- **States**: Idle, hover, active, disabled
- **Use cases**: Compact toolbars, filter rows

#### [Text Field](README-text-field.md) (BMG-100)
Standard text input field with contrast variants.
- **Files**: `text-field.css`, `text-field.js`, `text-field.html`
- **Features**: Low/high contrast, focus state
- **Use cases**: Forms, settings, inline inputs

#### [Selection Menu](README-selection-menu.md) (BMG-102)
Selection list for tag or sort options.
- **Files**: `selection-menu.css`, `selection-menu.js`, `selection-menu.html`
- **Features**: Multi/single select, low/high contrast
- **Use cases**: Dropdown menus, filters

#### [Selection Field](README-selection-field.md) (BMG-101)
Dropdown trigger for selection menus.
- **Files**: `selection-field.css`, `selection-field.js`, `selection-field.html`
- **Features**: 4 states, low/high contrast
- **Use cases**: Filters, sorting, tag selection

#### [Tab](README-tab.md) (BMG-91)
Navigation tabs with label, subtitle, and active state.
- **Files**: `tab.css`, `tab.js`, `tab.html`
- **Features**: Active/inactive states, subtitle support, chevron icon
- **Use cases**: Content switching, section navigation

### Content Display

#### [Quote](README-quote.md) (BMG-90)
Quote display with truncating text and clickable author.
- **Files**: `quote.css`, `quote.js`, `quote.html`
- **Features**: Text truncation, author hover state, max-width control
- **Use cases**: Daily quotes, testimonials

### Data & Tags

#### [Tag](README-tag.md) (BMG-94)
Pill-shaped tags for categorization and filtering.
- **Files**: `tag.css`, `tag.js`, `tag.html`
- **Features**: Low/high contrast, removable, clickable, custom colors
- **Use cases**: Filters, categories, labels

### Feedback & Interaction

#### [Tooltip](README-tooltip.md) (BMG-95)
Contextual tooltips appearing 4px from target element.
- **Files**: `tooltip.css`, `tooltip.js`, `tooltip.html`
- **Features**: 4 positions, show delays, auto-positioning
- **Use cases**: Icon explanations, help text, hints

#### [Modal](README-modal.md) (BMG-93)
Dialog boxes and form modals with keyboard shortcuts.
- **Files**: `modal.css`, `modal.js`, `modal.html`
- **Types**: Dialog box, Form modal
- **Features**: ESC to close, Enter to submit, backdrop blur
- **Use cases**: Confirmations, forms, dialogs

### Utilities

#### [Keyboard Shortcut Hint](README-keyboard-shortcut-hint.md) (BMG-92)
Pill-shaped keyboard shortcut indicators.
- **Files**: `keyboard-shortcut-hint.css`, `keyboard-shortcut-hint.js`, `keyboard-shortcut-hint.html`
- **Features**: Symbol or text display, preset shortcuts, size variants
- **Use cases**: Button shortcuts, command hints

## Design Tokens

### Typography

```css
--font-family-sans-serif: 'Lato', sans-serif;

/* Sizes */
--size-medium: 12px;
--size-large: 16px;
--size-x-large-2: 24px;

/* Weights */
--weight-light: 300;
--weight-regular: 400;
```

### Colors

```css
/* Primary */
--primary-primary-10: rgba(46, 51, 185, 0.4);
--primary-primary-20: rgba(46, 51, 185, 0.8);
--primary-primary-25: #2e33b9;

/* Bright (white with opacity) */
--common-common-bright-05: rgba(255, 255, 255, 0.1);
--common-common-bright-10: rgba(255, 255, 255, 0.2);
--common-common-bright-15: rgba(255, 255, 255, 0.6);
--common-common-bright-20: rgba(255, 255, 255, 0.8);
--common-common-bright-25: rgba(255, 255, 255, 0.9);

/* Dark (black with opacity) */
--common-common-dark-05: rgba(0, 0, 0, 0.15);
--common-common-dark-10: rgba(0, 0, 0, 0.4);
--common-common-dark-25: rgba(0, 0, 0, 0.8);
```

### Spacing & Layout

```css
/* Border Radius */
--corner-radius-small: 4px;
--corner-radius-medium: 8px;
--corner-radius-pill: 999px;

/* Padding & Gap */
--padding-and-gap-small: 2px;
--padding-and-gap-medium: 4px;
--padding-and-gap-large: 8px;
--padding-and-gap-x-large: 16px;
```

### Effects

```css
/* Transitions */
transition: all 0.2s ease;

/* Shadows */
box-shadow: 
  0px 2px 4px 0px rgba(0, 0, 0, 0.1),
  0px 7px 7px 0px rgba(0, 0, 0, 0.09),
  0px 15px 9px 0px rgba(0, 0, 0, 0.05);

/* Blur */
backdrop-filter: blur(7px);
```

## Usage Guidelines

### Importing Components

Each component consists of:
1. **CSS file**: Styles and visual appearance
2. **JS file**: Component API and functionality
3. **HTML file**: Interactive demo
4. **README**: Documentation and examples

```html
<!-- In your HTML -->
<link rel="stylesheet" href="components/[component].css">
<script src="components/[component].js"></script>
```

### Consistency Rules

1. **user-select: none** - All interactive components
2. **0.2s ease transitions** - All state changes
3. **Design tokens** - Use CSS variables, not hard-coded values
4. **Accessibility** - Include ARIA labels and keyboard support
5. **Module exports** - All JS files support CommonJS modules

### Component States

- **Idle**: Default state
- **Hover**: Mouse over (with 0.2s transition)
- **Active/Pressed**: Click or selected state
- **Disabled**: Non-interactive with reduced opacity

## File Structure

```
components/
├── navigation-bar-button.*    # BMG-87
├── search-bar.*               # BMG-89
├── search-comp.*              # BMG-99
├── quote.*                    # BMG-90
├── tab.*                      # BMG-91
├── keyboard-shortcut-hint.*   # BMG-92
├── modal.*                    # BMG-93
├── tag.*                      # BMG-94
├── tooltip.*                  # BMG-95
├── action-button.*            # BMG-96
├── cube-action-button.*       # BMG-97
├── cube-action-button-with-label.* # BMG-98
├── text-field.*               # BMG-100
├── selection-menu.*           # BMG-102
├── selection-field.*          # BMG-101
└── README.md                  # This file
```

Each component has 4 files:
- `.css` - Styles
- `.js` - JavaScript API
- `.html` - Demo page
- `README-*.md` - Documentation

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Modern browsers with ES6+ support

## Quick Start

```javascript
// Navigation button
const button = createNavigationButton({
  type: 'current',
  label: '1'
});

// Search bar
const search = createSearchBar({
  text: 'Search',
  shortcut: ['⌘', 'K']
});

// Tag
const tag = createTag({
  text: 'JavaScript',
  removable: true,
  onRemove: () => console.log('removed')
});

// Modal
const modal = createModal({
  type: 'dialog',
  title: 'Confirm',
  buttons: [
    { label: 'Cancel', type: 'common' },
    { label: 'OK', type: 'primary' }
  ]
});

// Tooltip
createTooltip({
  text: 'Delete',
  target: buttonElement,
  position: 'top'
});
```

## Figma Reference

[View complete design system in Figma](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension)

## Linear Tasks

All components tracked in Linear with "Design system" label:
- BMG-87: Navigation bar buttons
- BMG-89: Search-bar
- BMG-90: Quote
- BMG-91: Tabs
- BMG-92: Keyboard-shortcut-hint
- BMG-93: Modals
- BMG-94: Tag
- BMG-95: Tooltip

## Contributing

When creating or modifying components:
1. Follow design token system
2. Maintain consistent API patterns
3. Include accessibility features
4. Add comprehensive documentation
5. Create interactive demo
6. Test across browsers
