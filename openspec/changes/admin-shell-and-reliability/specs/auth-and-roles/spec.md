## ADDED Requirements

### Requirement: Admin form dialogs keep input focus across keystrokes

A modal form dialog SHALL keep the focused field focused while the user types.
Focusing the dialog panel MUST happen only when the dialog opens, never on
incidental re-renders (e.g. a new inline `onClose` identity), so a state update
per keystroke does not steal focus back to the panel.

#### Scenario: Typing in a create/edit dialog

- **WHEN** a user types several characters into a field in an open form dialog
- **THEN** every character is captured in the same field without the cursor
  leaving it (no re-click per character)

### Requirement: A render crash never shows a blank screen

A render-phase error SHALL be caught by an application error boundary that shows
a recoverable card (with Reload) instead of unmounting to a blank white page.

#### Scenario: A component throws while rendering

- **WHEN** a component throws during render
- **THEN** the app shows the error card with a Reload action, not a blank page
