const RENAMED = {
  "link-delete": ["Meta+Backspace", "Mod+Backspace"],
  "link-open-new-tab": ["Meta+Enter", "Mod+Enter"],
};

// Settings are saved with every default keybind merged in, so the old Meta defaults sit
// in storage and would shadow the new platform-aware ones.
export function platformModifierKeybinds(raw) {
  const keybinds = raw.settings?.keybinds;
  if (!keybinds) return raw;
  const stale = Object.entries(RENAMED).filter(([id, [old]]) => keybinds[id] === old);
  if (!stale.length) return raw;
  const next = { ...keybinds };
  stale.forEach(([id, [, renamed]]) => {
    next[id] = renamed;
  });
  return { ...raw, settings: { ...raw.settings, keybinds: next } };
}
