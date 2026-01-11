# Accessibility Testing Guide - BMG-61

This guide outlines manual testing procedures for the accessibility improvements implemented in Bookmark Manager.

## Overview of Accessibility Features

### ✅ Implemented Features
1. **ARIA Labels & Semantic HTML**
   - Modal dialogs have proper `role="dialog"` and `aria-modal="true"`
   - Modals are labeled with `aria-labelledby` pointing to title
   - Form inputs have `aria-label` and `aria-required` attributes
   - Buttons have descriptive `aria-label` attributes

2. **Keyboard Navigation**
   - Arrow keys (↑/↓) navigate through bookmark lists
   - Home/End keys jump to first/last bookmarks
   - Tab key cycles through focusable elements
   - Shift+Tab goes backward through focus order
   - Enter key activates links and buttons
   - Escape key closes modals

3. **Focus Management**
   - Focus trap in modals prevents tabbing outside
   - Visual focus indicators with high contrast outlines
   - Focus automatically moves to first input when modal opens
   - Keyboard-navigated items show `.bm-focused` style

4. **High Contrast Theme**
   - Pure black/white color scheme
   - Maximum contrast for text and interactive elements
   - Gold accent color for highlights

## Manual Testing Procedures

### 1. Screen Reader Testing (macOS VoiceOver)

#### Prerequisite
- Ensure VoiceOver is enabled: System Preferences → Accessibility → VoiceOver
- Toggle VoiceOver: Cmd+F5

#### Test Cases

**T1.1: Modal Dialog Announcement**
- [ ] Open a modal (Edit Bookmark, Add Folder, etc.)
- [ ] VoiceOver announces "dialog" role
- [ ] VoiceOver announces modal title (e.g., "Edit Bookmark, dialog")
- [ ] VoiceOver announces "modal" to indicate backdrop focus trap

**T1.2: Form Field Labels**
- [ ] Tab into bookmark form
- [ ] VoiceOver announces each field label (Title, URL, Tags)
- [ ] Required fields announced as "required"
- [ ] Input types correct (text, URL, etc.)

**T1.3: Button Descriptions**
- [ ] Navigate to buttons with arrow keys
- [ ] All buttons announced with clear descriptions:
  - "Cancel and close modal"
  - "Save changes"
  - "Add selected tabs to folder"
  - "Edit bookmark"
  - "Delete bookmark"

**T1.4: List Navigation**
- [ ] Navigate to bookmarks list
- [ ] Each bookmark announces as "option"
- [ ] Announces bookmark title and URL
- [ ] Announces current position (e.g., "1 of 15")

**T1.5: Tab Selection Dialog**
- [ ] Open "Add Tabs to Folder" modal
- [ ] VoiceOver announces "Tab selection list"
- [ ] Each tab checkbox announces as option
- [ ] "Select all" functionality announced correctly

---

### 2. Keyboard Navigation Testing

#### Test Cases

**T2.1: Bookmark List Navigation**
- [ ] Click into bookmarks area
- [ ] Press **↓ Down Arrow** → next bookmark highlighted
- [ ] Press **↑ Up Arrow** → previous bookmark highlighted
- [ ] Press **Home** → focus jumps to first bookmark
- [ ] Press **End** → focus jumps to last bookmark
- [ ] Press **Enter** → opens bookmark link
- [ ] Focus indicator (blue outline) clearly visible

**T2.2: Modal Tab Order**
- [ ] Open any modal
- [ ] Focus automatically in first input field
- [ ] Press **Tab** → cycles through: inputs → buttons
- [ ] Press **Tab** on last button → wraps to first input
- [ ] Press **Shift+Tab** on first input → wraps to last button
- [ ] Press **Escape** → modal closes and focus returns to trigger

**T2.3: Modal Button Navigation**
- [ ] Tab to Cancel button
- [ ] Tab to Save button
- [ ] Press **Enter** on Save → form submits
- [ ] Press **Enter** on Cancel → modal closes

**T2.4: Tabs Picker Modal Keyboard**
- [ ] Press **Space** on checkbox → toggles selection
- [ ] Press **Tab** on "Select All" → all items toggle
- [ ] Press **↑/↓** to navigate through checkboxes (if arrow trap added)
- [ ] Press **Enter** on "Add Selected" → applies selection

**T2.5: Widget Picker Shortcuts**
- [ ] Open Widget Picker modal
- [ ] Press **1** → selects Clock widget
- [ ] Press **2** → selects Quick Links widget
- [ ] Press **3** → selects Notes widget

---

### 3. Focus Indicator Testing

#### Test Cases

**T3.1: Visual Focus Indicators**
- [ ] Tab through interactive elements
- [ ] Focus outline (2px blue border) clearly visible
- [ ] Outline has sufficient contrast against backgrounds
- [ ] Outline not obscured by other elements

**T3.2: Keyboard-Navigated Item Focus**
- [ ] Navigate bookmark list with arrow keys
- [ ] Focused item has:
  - [ ] Solid border (not dashed)
  - [ ] Blue outline (2px)
  - [ ] Light background color (.bm-focused)
  - [ ] Box shadow for depth
- [ ] Focus clearly distinguishable from hover state

**T3.3: Modal Focus Trap**
- [ ] Open modal and tab repeatedly
- [ ] Focus never leaves modal dialog
- [ ] Focus cycles back to first element after last button
- [ ] Shift+Tab cycles backward correctly

---

### 4. High Contrast Theme Testing

#### Test Cases

**T4.1: Theme Activation**
- [ ] Click 🎨 Personalize button
- [ ] Scroll to theme selector
- [ ] Select "High Contrast (Accessible)" theme
- [ ] [ ] Page refreshes with high contrast colors
- [ ] [ ] All text has 7:1+ contrast ratio

**T4.2: Visual Contrast**
- [ ] Text on background: **Black on White** (maximum contrast)
- [ ] Buttons: **Black text on white** with black border
- [ ] Links: **Black text** (not standard blue)
- [ ] Focus indicators: **Gold outline** on white background
- [ ] Disabled elements clearly marked with reduced opacity

**T4.3: Color-Blind Safe**
- [ ] All interactive states rely on shape/pattern, not color alone
- [ ] Focus indicators use outline + color (not color only)
- [ ] Use color blindness simulator: https://www.color-blindness.com/coblis-color-blindness-simulator/
- [ ] All UI elements distinguishable in all color blindness modes:
  - [ ] Protanopia (Red-Blind)
  - [ ] Deuteranopia (Green-Blind)
  - [ ] Tritanopia (Blue-Yellow Blind)

---

### 5. Form Accessibility Testing

#### Test Cases

**T5.1: Required Fields**
- [ ] Open "Add Bookmark" modal
- [ ] Title field marked with red asterisk (*)
- [ ] Try submitting empty Title
- [ ] [ ] Alert message: "Title is required"
- [ ] Check `aria-required="true"` in devtools

**T5.2: URL Validation**
- [ ] Open bookmark form
- [ ] Enter invalid URL (e.g., "not a url")
- [ ] Submit form
- [ ] [ ] Alert: "URL appears invalid"

**T5.3: Tags Input (Tagify)**
- [ ] Open bookmark form with tags input
- [ ] Type tag name
- [ ] Tab to next field → tag saved
- [ ] Tags announce as items in list
- [ ] Each tag has keyboard-accessible remove button

---

### 6. List Accessibility Testing

#### Test Cases

**T6.1: Drag & Drop Keyboard Alternative**
- [ ] Navigate to bookmark with arrow keys
- [ ] (Future enhancement: Alt+↑/↓ to reorder)
- [ ] For now, use Edit button as alternative
- [ ] [ ] Edit functionality available for all items

**T6.2: Context Menu / Actions**
- [ ] Navigate to bookmark
- [ ] Edit button accessible via Tab
- [ ] Delete button accessible via Tab
- [ ] All actions keyboard-triggerable

**T6.3: Filtering with Tags**
- [ ] Click tag chip on bookmark
- [ ] List filters to only bookmarks with that tag
- [ ] Filter announcement clear for screen readers
- [ ] Keyboard navigation works on filtered list

---

## Testing Checklist Summary

### Screen Reader (VoiceOver/NVDA)
- [ ] Dialogs announced as "dialog"
- [ ] Form labels associated with inputs
- [ ] Button purposes announced
- [ ] List items announced with context
- [ ] No orphaned text without labels

### Keyboard Navigation
- [ ] All features accessible via keyboard
- [ ] No keyboard traps (except modals)
- [ ] Tab order logical and visible
- [ ] Arrow key navigation in lists works
- [ ] Escape closes modals
- [ ] Enter submits forms

### Focus Management
- [ ] Focus indicators always visible
- [ ] Focus indicators have sufficient contrast
- [ ] Focus moves logically
- [ ] Focus trap in modals works
- [ ] Initial focus in modal on first input

### Color Contrast
- [ ] All text meets WCAG AA (4.5:1) minimum
- [ ] High contrast theme available
- [ ] Interactive elements distinguishable
- [ ] Color-blind safe design verified

### Forms & Inputs
- [ ] Labels properly associated
- [ ] Required fields marked
- [ ] Error messages announced
- [ ] Placeholder text not used as labels
- [ ] Input types appropriate (url, email, etc.)

---

## Tools for Testing

### Screen Readers
- **macOS**: VoiceOver (Cmd+F5) - built-in
- **Windows**: NVDA (free) - https://www.nvaccess.org/
- **Browser**: WAVE browser extension

### Contrast Checking
- Accessible Colors: https://accessible-colors.com/
- Color Blindness Simulator: https://www.color-blindness.com/coblis-color-blindness-simulator/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

### Keyboard Testing
- Tab Key Inspector (DevTools)
- Keyboard navigation mode (browser developer tools)

---

## Known Limitations & Future Improvements

### Current Implementation
- ✅ ARIA labels on modals and buttons
- ✅ Keyboard navigation for lists (arrow keys)
- ✅ Focus trap in modals
- ✅ High contrast theme
- ✅ Semantic HTML roles

### Future Enhancements (Phase 2)
- [ ] Aria-live announcements for filter changes
- [ ] Reorder items with Alt+↑/↓ keyboard shortcuts
- [ ] Drag & drop with keyboard alternative
- [ ] Notification announcements for actions
- [ ] Skip links for page navigation
- [ ] Heading hierarchy improvements
- [ ] Form validation with inline error messages

---

## WCAG 2.1 Compliance

This implementation addresses the following WCAG 2.1 criteria:

- **2.1.1 Keyboard (Level A)**: All functionality available via keyboard
- **2.1.3 Keyboard (No Exception) (Level AAA)**: Keyboard access throughout
- **2.4.3 Focus Order (Level A)**: Logical focus order maintained
- **2.4.7 Focus Visible (Level AA)**: Clear focus indicators
- **3.2.4 Consistent Identification (Level AA)**: Consistent UI patterns
- **4.1.2 Name, Role, Value (Level A)**: Proper ARIA labels and roles
- **1.4.11 Non-text Contrast (Level AA)**: Focus indicators have sufficient contrast
- **1.4.3 Contrast (Minimum) (Level AA)**: High contrast theme meets standards

---

## Notes for Testing

1. **Screen Reader Testing is Critical**
   - Simulated testing (reading markup) is not sufficient
   - Actual screen reader usage reveals real-world issues
   - Test with both Windows (NVDA) and macOS (VoiceOver)

2. **Real User Testing**
   - Consider getting feedback from users with disabilities
   - Beta testing with actual screen reader users recommended

3. **Automated Testing Gaps**
   - Automated tools can't verify all accessibility features
   - Manual testing remains essential
   - Test with actual assistive technologies

4. **Continuous Testing**
   - Re-test after any UI changes
   - Include accessibility in regression testing
   - Document any issues found

---

## Reporting Issues

If you find accessibility issues during testing:

1. Document the issue clearly:
   - Feature tested
   - Steps to reproduce
   - Expected vs actual behavior
   - Assistive technology used

2. Create a Linear issue with:
   - Label: `accessibility`
   - Title: Specific accessibility concern
   - Description: Testing steps and observations

3. Reference: BMG-61
