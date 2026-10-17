// The home tab showed its own links before Settings › Layout had a switch for them, so
// anyone who keeps links there gets the switch on. Fresh installs have no saved settings
// and start with it off.
export function homeLinks(raw) {
  if (!raw.settings || Object.hasOwn(raw.settings, "showHomeLinks")) return raw;
  const home = [...(raw.tabs ?? [])].sort((a, b) => a.order - b.order)[0];
  const showHomeLinks = !!home && (raw.links ?? []).some((link) => link.tabId === home.id);
  return { ...raw, settings: { ...raw.settings, showHomeLinks } };
}
