# Modal Component

Design System Component - BMG-93

## Overview

Modal dialogs for user interactions. Two types: dialog box for yes/no questions, and form modal for form inputs.

## Figma Reference

[View in Figma](https://www.figma.com/design/z1dIOJNnV7Zf0qTeIBp05W/Bookmarks-manager-chrome-extension?node-id=92-9674)

## Acceptance Criteria

- Two types of modals:
  - **Dialog box**: Asking user yes/no questions
  - **Form modal**: Contains form components
- Pressing **ESC** closes modal and discards unsaved changes
- Pressing **Enter** submits form and closes modal

## Anatomy

### Dialog Box
- **Width**: 532px fixed
- **Min-height**: Auto
- **Padding**: 16px
- **Background**: Layered gradient with blur
- **Border radius**: 8px (medium)
- **Shadow**: Multi-layer drop shadow

### Form Modal
- **Width**: Auto (min 500px)
- **Min-height**: 200px
- **Padding**: 16px
- **Layout**: Title, Subtitle, Form content, Action buttons

### Elements
- **Title**: 24px regular weight
- **Subtitle**: 12px light weight
- **Buttons**: 36px height, flex layout
- **Content gap**: 16px between sections

## Usage

### Dialog Box

```javascript
const modal = createModal({
  type: 'dialog',
  title: 'Delete bookmark?',
  subtitle: 'This action cannot be undone',
  buttons: [
    { label: 'Cancel', type: 'common', shortcut: 'ESC' },
    { label: 'Delete', type: 'primary', shortcut: '↵' }
  ],
  onClose: (confirmed) => {
    if (confirmed) {
      deleteBookmark();
    }
  }
});

showModal(modal);
```

### Form Modal

```javascript
const formHTML = `
  <input type="text" placeholder="Bookmark name..." />
  <input type="url" placeholder="URL..." />
`;

const modal = createModal({
  type: 'form',
  title: 'Add bookmark',
  subtitle: 'Enter bookmark details',
  content: formHTML,
  buttons: [
    { label: 'Cancel', type: 'common', shortcut: 'ESC' },
    { label: 'Save', type: 'primary', shortcut: '↵' }
  ],
  onSubmit: () => {
    const data = getFormData();
    saveBookmark(data);
    return true; // Close modal
  }
});

showModal(modal);
```

### Async Confirmation

```javascript
const confirmed = await confirmDialog({
  title: 'Delete all bookmarks?',
  subtitle: 'This will permanently delete all your bookmarks',
  cancelLabel: 'Cancel',
  confirmLabel: 'Delete All'
});

if (confirmed) {
  deleteAll();
}
```

## API

### `createModal(options)`

Creates a modal dialog.

**Parameters:**
- `options.type` (string) - Modal type: 'dialog' or 'form'
- `options.title` (string) - Modal title
- `options.subtitle` (string, optional) - Optional subtitle
- `options.content` (HTMLElement|string, optional) - Content element or HTML string
- `options.buttons` (Array) - Button configurations
- `options.onClose` (function, optional) - Callback when modal closes
- `options.onSubmit` (function, optional) - Callback when form is submitted
- `options.closeOnEscape` (boolean, optional) - Close on ESC key (default: true)
- `options.closeOnBackdrop` (boolean, optional) - Close on backdrop click (default: true)

**Returns:** `HTMLDivElement` - The modal overlay element

### Button Configuration

```javascript
{
  label: 'Button text',
  type: 'common' | 'primary',  // Button style
  shortcut: 'ESC' | '↵',       // Keyboard shortcut hint
  disabled: false,             // Disabled state
  onClick: () => {}            // Click handler
}
```

### `showModal(modal)`

Shows a modal by appending it to the document body.

**Parameters:**
- `modal` (HTMLDivElement) - The modal overlay element

### `confirmDialog(options)`

Creates and shows a confirmation dialog.

**Parameters:**
- `options.title` (string, optional) - Dialog title (default: 'Confirm')
- `options.subtitle` (string, optional) - Dialog subtitle
- `options.cancelLabel` (string, optional) - Cancel button label (default: 'Cancel')
- `options.confirmLabel` (string, optional) - Confirm button label (default: 'Confirm')

**Returns:** `Promise<boolean>` - Resolves to true if confirmed, false if cancelled

## Keyboard Shortcuts

- **ESC**: Closes modal and discards changes
- **Enter**: Submits form (form modals only)
- First button is typically Cancel (ESC)
- Second button is typically Submit/Confirm (Enter)

## Design Tokens

```css
--font-family-sans-serif: 'Lato', sans-serif
--size-medium: 12px
--size-x-large-2: 24px
--weight-regular: 400
--weight-light: 300
--primary-primary-10: rgba(46, 51, 185, 0.4)
--primary-primary-20: rgba(46, 51, 185, 0.8)
--primary-primary-25: #2e33b9
--common-common-bright-05: rgba(255, 255, 255, 0.1)
--common-common-bright-15: rgba(255, 255, 255, 0.6)
--common-common-bright-25: rgba(255, 255, 255, 0.9)
--corner-radius-small: 4px
--corner-radius-medium: 8px
--padding-and-gap-x-large: 16px
```

## Accessibility

- Uses `role="dialog"` and `aria-modal="true"`
- Includes `aria-labelledby` pointing to title
- Keyboard navigation support (ESC, Enter, Tab)
- Auto-focuses first input in form modals
- Traps focus within modal
- Backdrop prevents interaction with underlying content

## Animation

- Fade in/out for overlay (0.2s ease)
- Slide up/down for modal (0.2s ease)
- Smooth transitions for all state changes

## Examples

```javascript
// Simple confirmation
const modal = createModal({
  type: 'dialog',
  title: 'Are you sure?',
  buttons: [
    { label: 'No', type: 'common' },
    { label: 'Yes', type: 'primary' }
  ]
});
showModal(modal);

// Form with validation
const modal = createModal({
  type: 'form',
  title: 'Edit bookmark',
  content: formElement,
  buttons: [
    { label: 'Cancel', type: 'common', shortcut: 'ESC' },
    { label: 'Save', type: 'primary', shortcut: '↵' }
  ],
  onSubmit: () => {
    if (!validateForm()) {
      return false; // Keep modal open
    }
    saveData();
    return true; // Close modal
  }
});

// Single button (info)
const modal = createModal({
  type: 'dialog',
  title: 'Welcome!',
  subtitle: 'Thanks for using our extension',
  buttons: [
    { label: 'Got it', type: 'primary', shortcut: '↵' }
  ]
});
```
