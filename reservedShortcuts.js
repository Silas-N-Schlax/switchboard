// Best-effort lists of common OS/browser shortcuts, in the "Ctrl+Shift+Key" canonical
// form produced by js/features/keybinds/shortcutFormat.js. None of this can ever be
// exhaustive — every OS version, browser, window manager, and installed extension
// differs — so it exists to hard-block obviously-colliding link shortcuts, not to
// guarantee nothing else conflicts. Kept in its own file (imported by defaults.js)
// since it's long and rarely touched, unlike the rest of defaults.js.

// macOS system-level shortcuts (Finder, window management, Spotlight, etc.)
export const macOSShortcuts = [
  "Meta+Q", "Meta+W", "Meta+M", "Meta+H", "Meta+Tab", "Meta+Shift+Tab",
  "Meta+Space", "Meta+,", "Meta+Alt+Esc", "Meta+Shift+Q",
  "Meta+Shift+3", "Meta+Shift+4", "Meta+Shift+5",
  "Ctrl+ArrowUp", "Ctrl+ArrowDown", "Ctrl+ArrowLeft", "Ctrl+ArrowRight",
  "Meta+Ctrl+F", "Meta+Alt+D",
];

// Windows system-level shortcuts
export const windowsShortcuts = [
  "Alt+F4", "Alt+Tab", "Alt+Shift+Tab", "Ctrl+Shift+Esc", "Ctrl+Alt+Delete",
  "Meta+D", "Meta+E", "Meta+L", "Meta+Tab", "Meta+R", "Meta+I",
];

// Linux desktop-environment shortcuts (GNOME/KDE defaults vary, these are the most common)
export const linuxShortcuts = [
  "Ctrl+Alt+T", "Alt+F2", "Alt+F4", "Alt+Tab", "Alt+Shift+Tab", "Ctrl+Alt+Delete",
  "Ctrl+Alt+F1", "Ctrl+Alt+F2", "Ctrl+Alt+F3", "Ctrl+Alt+F4",
  "Ctrl+Alt+L", "Ctrl+Alt+D",
];

// Browser shortcuts common across Chrome/Firefox/Safari/Edge (Ctrl on Windows/Linux,
// Meta/Cmd on macOS — both forms listed since a link shortcut isn't tied to one OS).
export const browserShortcuts = [
  "Ctrl+T", "Meta+T", "Ctrl+Shift+T", "Meta+Shift+T",
  "Ctrl+W", "Meta+W", "Ctrl+Shift+W", "Meta+Shift+W",
  "Ctrl+N", "Meta+N", "Ctrl+Shift+N", "Meta+Shift+N",
  "Ctrl+L", "Meta+L", "Ctrl+R", "Meta+R", "Ctrl+Shift+R", "Meta+Shift+R",
  "Ctrl+F", "Meta+F", "Ctrl+G", "Meta+G", "Ctrl+Shift+G", "Meta+Shift+G",
  "Ctrl+P", "Meta+P", "Ctrl+S", "Meta+S", "Ctrl+U", "Meta+Alt+U",
  "Ctrl+D", "Meta+D", "Ctrl+J", "Meta+Alt+L", "Ctrl+H", "Meta+Y",
  "Ctrl+Tab", "Ctrl+Shift+Tab", "Ctrl+PageUp", "Ctrl+PageDown",
  "Ctrl+Shift+I", "Meta+Alt+I", "Ctrl+Shift+J", "Meta+Alt+J", "Ctrl+Shift+C", "Meta+Alt+C",
  "Ctrl+Shift+Delete", "Meta+Shift+Delete", "Ctrl+Shift+B", "Meta+Shift+B",
  "Ctrl+Shift+P", "Meta+Shift+P", "Ctrl+K", "Meta+K",
  "Ctrl+1", "Ctrl+2", "Ctrl+3", "Ctrl+4", "Ctrl+5", "Ctrl+6", "Ctrl+7", "Ctrl+8", "Ctrl+9",
  "Meta+1", "Meta+2", "Meta+3", "Meta+4", "Meta+5", "Meta+6", "Meta+7", "Meta+8", "Meta+9",
  "Alt+ArrowLeft", "Alt+ArrowRight", "Meta+[", "Meta+]",
  "F5", "F6", "F11", "F12",
];

// Universal text-editing shortcuts (copy/paste/undo/etc.) — same on every OS/browser,
// Ctrl on Windows/Linux, Meta/Cmd on macOS.
export const editingShortcuts = [
  "Ctrl+C", "Meta+C", "Ctrl+V", "Meta+V", "Ctrl+X", "Meta+X",
  "Ctrl+Z", "Meta+Z", "Ctrl+Shift+Z", "Meta+Shift+Z", "Ctrl+Y", "Meta+Y",
  "Ctrl+A", "Meta+A",
];

// Reserved regardless of OS/browser — keys with a fixed, universal meaning inside
// Switchboard's own UI (Enter submits/activates, Escape cancels/closes).
export const generalReservedKeys = ["Enter", "Esc"];

export const reservedSystemShortcuts = [
  ...macOSShortcuts,
  ...windowsShortcuts,
  ...linuxShortcuts,
  ...browserShortcuts,
  ...editingShortcuts,
  ...generalReservedKeys,
];
