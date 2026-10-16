import { state } from "../../state.js";
import { loadKey, save } from "../../storage.js";
import { listKeybinds } from "../keybinds/registry.js";
import { keybindLabel } from "../keybinds/catalog.js";
import { comparableShortcut, describeShortcut } from "../keybinds/shortcutFormat.js";
import { showToast } from "../dialog/toast.js";

const STORAGE_KEY = "shortcutClashNotices";
const NOTICE_MS = 9000;

// A saved link shortcut can land on a key Switchboard uses (a new default key, a fourth
// tab, a restored backup), and the app key quietly wins. Each link+key clash is told once.
function findClashes() {
  const appKeys = listKeybinds().filter((keybind) => keybind.key);
  return state.links.flatMap((link) => {
    const comparable = comparableShortcut(link.shortcutKey);
    if (!comparable) return [];
    const keybind = appKeys.find((k) => comparableShortcut(k.key) === comparable);
    return keybind ? [{ link, keybind, noticeId: `${link.id}:${comparable}` }] : [];
  });
}

function clashMessage(clashes) {
  if (clashes.length === 1) {
    const [{ link, keybind }] = clashes;
    return `"${link.label}" lost its shortcut ${describeShortcut(link.shortcutKey)} to "${keybindLabel(keybind.id)}". Pick a new one in Update link…`;
  }
  const names = clashes.map(({ link }) => `"${link.label}" (${describeShortcut(link.shortcutKey)})`).join(", ");
  return `These links lost their shortcuts to Switchboard keys: ${names}. Pick new ones in Update link…`;
}

export async function noticeShortcutClashes() {
  const clashes = findClashes();
  if (!clashes.length) return;
  const noticed = new Set((await loadKey(STORAGE_KEY)) ?? []);
  const fresh = clashes.filter((clash) => !noticed.has(clash.noticeId));
  if (!fresh.length) return;
  showToast(clashMessage(fresh), { durationMs: NOTICE_MS });
  await save({ [STORAGE_KEY]: clashes.map((clash) => clash.noticeId) });
}
