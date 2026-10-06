#!/bin/sh
set -eu

root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$root/manifest.json")"
name="switchboard-$version"
staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

mkdir -p "$staging/$name"
cd "$root"
cp -R manifest.json newtab.html background.js defaults.js reservedShortcuts.js js styles graphics \
  "$staging/$name/"
rm -f "$staging/$name"/graphics/extension/chrome-store-*
find "$staging/$name" -name .DS_Store -delete

cat > "$staging/$name/INSTALL.txt" <<'TXT'
Switchboard: install in Brave, Chrome, Edge, or Vivaldi

1. Unzip this file and move the folder somewhere permanent (e.g. Documents).
   The browser loads it from that folder, so don't delete or move it afterwards.
2. Open brave://extensions (chrome://extensions in Chrome, edge://extensions in Edge).
3. Turn on "Developer mode" (top right).
4. Click "Load unpacked" and choose this folder (the one containing manifest.json).
5. Open a new tab. If the browser asks whether to keep the extension's new tab page,
   choose Keep.

Brave notes
- Changing Brave's theme can switch the extension off. If your new tab goes back to
  Brave's default, re-enable Switchboard in brave://extensions.
- Brave's own new-tab settings (background images, widgets) stop applying while
  Switchboard is on.

Everything stays on your computer. Settings > Data > Export makes a backup file.

Updating: replace this folder with the new version, then click the reload icon on
Switchboard in the extensions page. Your tabs and links are kept.
TXT

mkdir -p "$root/dist"
rm -f "$root/dist/$name.zip"
(cd "$staging" && zip -qr "$root/dist/$name.zip" "$name")
echo "$root/dist/$name.zip"
