export function withAmbientMode(raw, ambientMode) {
  return { ...raw, settings: { ...raw.settings, ambientMode } };
}

export function withoutUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}
