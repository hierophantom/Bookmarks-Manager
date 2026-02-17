# Active Sessions Panel

**Design System Component - BMG-129**  
Figma: node-id=136-13040

## Overview

Right side panel for viewing and managing active sessions/tabs. Extends the base `side-panel` component with session items, zero state messaging, and session management features.

## Acceptance Criteria

- **States**: Zero state (no sessions), Float, Docked
- **Content**: Session items with open/remove controls
- **Features**: Add/remove sessions, session list management
- **Zero state**: Message when no sessions exist

## Usage

```javascript
// Create active sessions panel
const sessionsPanel = createActiveSessionsPanel({
  docked: true,
  onClose: () => console.log('closed'),
  onViewSession: (session) => console.log('viewing', session)
});

// Add a session
sessionsPanel.addSession({
  id: 'session-1',
  label: 'Work Session - Tab 1',
  onView: () => console.log('opening'),
  onRemove: () => console.log('removed')
});

// Update session
sessionsPanel.updateSession('session-1', {
  label: 'Work - Updated'
});

// Get all sessions
const sessions = sessionsPanel.getSessions();

// Check if has sessions
if (sessionsPanel.hasSessions()) {
  console.log('Sessions active');
}

// Clear all
sessionsPanel.clearSessions();
```

## API

### `createActiveSessionsPanel(options)`

Creates an active sessions panel.

**Parameters:**
- `options.docked` (boolean) - Initial docked state (default: false)
- `options.onClose` (function) - Close handler
- `options.onToggleMode` (function) - Mode toggle handler
- `options.onViewSession` (function) - Session view handler (called for all sessions)
- `options.visible` (boolean) - Initial visibility (default: true)

**Returns:** `Object` Panel (extends Base Side Panel)

### Panel Methods (Inherited from Side Panel)

- `show()` / `hide()` / `toggleMode()` / `setDocked()` / `setFloat()`
- `setTitle()` / `setContent()` / `appendContent()` / `clearContent()`

### Session-Specific Methods

#### `addSession(options)`

Add a session item to the panel.

**Parameters:**
- `options.id` (string, **required**) - Unique session ID
- `options.label` (string) - Session label (default: 'Untitled Session')
- `options.onView` (function) - Open/view handler
- `options.onRemove` (function) - Remove handler

**Returns:** `HTMLElement` The session item element

```javascript
sessionsPanel.addSession({
  id: 'session-abc123',
  label: 'Development - 5 tabs',
  onView: () => restoreSession('abc123'),
  onRemove: () => deleteSession('abc123')
});
```

#### `removeSession(id)`

Remove a session item (also removes from DOM).

```javascript
sessionsPanel.removeSession('session-abc123');
```

#### `updateSession(id, updates)`

Update session properties.

```javascript
sessionsPanel.updateSession('session-abc123', {
  label: 'Development - 6 tabs (updated)'
});
```

**Update fields:**
- `label` - New label text

#### `getSessions()`

Get all session items as array.

```javascript
const sessions = sessionsPanel.getSessions();
// Returns: [{ id, label, ... }, ...]
```

#### `clearSessions()`

Remove all sessions from panel.

```javascript
sessionsPanel.clearSessions();
```

#### `hasSessions()`

Check if panel has any sessions.

```javascript
if (sessionsPanel.hasSessions()) {
  // Show content
} else {
  // Show zero state
}
```

## Design Integration

Inherits from and uses:
- **Base Component**: `side-panel.js/css` - Layout, header, controls
- **No dependency on other components** - Self-contained session items

## Properties

| Property | Value |
|----------|-------|
| **Panel position** | Right |
| **Panel width** | 320px |
| **Panel states** | Zero state (empty), Float, Docked |
| **Item padding** | 12px |
| **Item margin** | 0 8px 8px 8px |
| **Button size** | 20x20px |
| **Icon size** | 16px (open), 14px (close) |

## Zero State

Shows "No active tabs" message when panel is empty.

- **Display**: Centered flex container
- **Message**: "No active tabs"
- **Color**: `rgba(255, 255, 255, 0.5)`
- **Font size**: 14px
- **Min height**: 200px
- **Auto-hidden**: When sessions are added

```javascript
// Zero state is automatic
const panel = createActiveSessionsPanel();
// Shows: "No active tabs"

panel.addSession({ id: '1', label: 'Session 1' });
// Zero state hidden, session shown
```

## Session Item Layout

```
┌─────────────────────┐
│ Session Label    🗗  │  ← Label + Open button + Close button
└─────────────────────┘
```

- **Label**: Session name, ellipsis on overflow
- **Open Icon**: Material Symbol `open_in_new` (16px)
- **Close Button**: ✕ (14px)
- **Background**: `rgba(46, 51, 185, 0.2)`
- **Border**: `1px solid rgba(46, 51, 185, 0.3)`
- **Hover**: Darker background, lighter border

## Example: Complete Session Management

```javascript
const sessionsPanel = createActiveSessionsPanel({
  docked: true,
  onViewSession: async (session) => {
    // Parent-level handler for all sessions
    await restoreSession(session.id);
  }
});

// Load sessions from storage
const savedSessions = await loadSessions();
savedSessions.forEach(s => {
  sessionsPanel.addSession({
    id: s.id,
    label: `${s.name} - ${s.tabCount} tabs`,
    onView: async () => {
      await restoreSession(s.id);
      await logSession('viewed', s.id);
    },
    onRemove: async () => {
      await deleteSession(s.id);
      await logSession('removed', s.id);
    }
  });
});

// Add new session
saveButton.addEventListener('click', async () => {
  const session = await createSession(currentTabs);
  sessionsPanel.addSession({
    id: session.id,
    label: session.name,
    onView: () => restoreSession(session.id),
    onRemove: () => deleteSession(session.id)
  });
});
```

## Item States

### Idle
- Background: `rgba(46, 51, 185, 0.2)`
- Border: `rgba(46, 51, 185, 0.3)`

### Hover
- Background: `rgba(46, 51, 185, 0.3)`
- Border: `rgba(46, 51, 185, 0.5)`

## Button Interactions

### Open Button
- Icon: Material Symbol `open_in_new`
- Action: Restores session to browser
- Handler: `onView` + `onViewSession`
- Tooltip: "Open session"

### Close Button
- Icon: ✕
- Action: Removes session from panel
- Handler: `onRemove` + removes from DOM
- Tooltip: "Remove session"
- Also updates zero state visibility

## Accessibility

- **ARIA role**: Panel inherited from side-panel
- **Button labels**: "Open session" and "Remove session"
- **Keyboard support**: Tab focuses buttons, Enter/Space activates
- **Focus indicators**: Standard browser outline
- **Color contrast**: White text on blue backgrounds (WCAG AA)

## Styling

Item-specific styling:

```css
/* Item container */
.active-sessions-panel__item {
  padding: 12px;
  margin: 0 8px 8px 8px;
  background: rgba(46, 51, 185, 0.2);
  border: 1px solid rgba(46, 51, 185, 0.3);
  border-radius: 4px;
}

/* Hover state */
.active-sessions-panel__item:hover {
  background: rgba(46, 51, 185, 0.3);
  border-color: rgba(46, 51, 185, 0.5);
}

/* Label text */
.active-sessions-panel__item-label {
  font-size: 12px;
  color: #ffffffe5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Buttons */
.active-sessions-panel__item-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  color: inherit;
  transition: background-color 0.15s ease;
}

.active-sessions-panel__item-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

## Error Handling

```javascript
// Missing required ID
sessionsPanel.addSession({ label: 'Session' }); // Logs error, returns null

// Non-existent session
sessionsPanel.removeSession('nonexistent'); // Silently does nothing
sessionsPanel.updateSession('nonexistent', {}); // Silently does nothing
```

## Examples

### Persistent Session Manager
```javascript
const panel = createActiveSessionsPanel({
  docked: true
});

// Load on startup
window.addEventListener('load', async () => {
  const sessions = await chrome.storage.local.get('sessions');
  sessions.forEach(s => panel.addSession({
    id: s.id,
    label: s.name,
    onView: () => chrome.tabs.update(s.tabIds[0], { active: true }),
    onRemove: () => deleteSessionFromStorage(s.id)
  }));
});

// Save current session
saveButton.addEventListener('click', () => {
  const tabIds = getCurrentTabIds();
  const session = { id: generateId(), name: 'Session', tabIds };
  saveSessionToStorage(session);
  
  panel.addSession({
    id: session.id,
    label: session.name,
    onView: () => openSession(session),
    onRemove: () => deleteSession(session.id)
  });
});
```

### Floating Sessions Picker
```javascript
const picker = createActiveSessionsPanel({
  docked: false,
  onViewSession: (session) => {
    openSession(session.id);
    picker.hide();
  }
});

// Show picker
showSessionsButton.addEventListener('click', () => {
  const active = getActiveSessions();
  picker.clearSessions();
  active.forEach(s => {
    picker.addSession({
      id: s.id,
      label: s.name
    });
  });
  picker.show();
});
```

## Notes

- **Zero state automatic**: Shows/hides automatically based on session count
- **Remove action**: Calls both `onRemove` handler and updates zero state
- **Panel-level handler**: `onViewSession` called after item's `onView`
- **Label only**: Items show label and two buttons, no additional metadata display
- **Responsive**: Items wrap and resize on mobile, buttons remain accessible
- **Material Icons**: Uses `open_in_new` icon from Material Symbols
