// Uploads a zip to an existing Chrome Web Store listing and submits it for review, using the
// v2 API (https://developer.chrome.com/docs/webstore/using-api).
// Usage: node scripts/publish-store.mjs <zip> <extension id>
// Needs CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN and CWS_PUBLISHER_ID in the environment.
import fs from "node:fs";

const [zip, extensionId] = process.argv.slice(2);
const env = Object.fromEntries(
  ["CWS_CLIENT_ID", "CWS_CLIENT_SECRET", "CWS_REFRESH_TOKEN", "CWS_PUBLISHER_ID"].map((key) => [key, process.env[key]])
);
const missing = [!zip && "a zip path", !extensionId && "an extension id", ...Object.keys(env).filter((key) => !env[key])].filter(Boolean);
if (missing.length) {
  console.error(`publish-store needs ${missing.join(", ")}`);
  process.exit(1);
}

const item = `publishers/${env.CWS_PUBLISHER_ID}/items/${extensionId}`;
const pollMs = 5000;
const pollLimit = 60;

async function call(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${options.method ?? "GET"} ${url} failed (${res.status}): ${JSON.stringify(body)}`);
  return body;
}

const { access_token: token } = await call("https://oauth2.googleapis.com/token", {
  method: "POST",
  body: new URLSearchParams({
    client_id: env.CWS_CLIENT_ID,
    client_secret: env.CWS_CLIENT_SECRET,
    refresh_token: env.CWS_REFRESH_TOKEN,
    grant_type: "refresh_token",
  }),
});
const auth = { Authorization: `Bearer ${token}` };

const upload = await call(`https://chromewebstore.googleapis.com/upload/v2/${item}:upload`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/zip" },
  body: fs.readFileSync(zip),
});
let state = upload.uploadState;
// Big packages finish processing after the request returns, so wait for that before publishing.
for (let i = 0; String(state).includes("IN_PROGRESS") && i < pollLimit; i++) {
  await new Promise((resolve) => setTimeout(resolve, pollMs));
  state = (await call(`https://chromewebstore.googleapis.com/v2/${item}:fetchStatus`, { headers: auth })).lastAsyncUploadState;
}
if (state !== "SUCCEEDED") throw new Error(`Upload of ${zip} ended as ${state}: ${JSON.stringify(upload)}`);

const published = await call(`https://chromewebstore.googleapis.com/v2/${item}:publish`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
console.log(`${zip} → ${extensionId}: ${published.state}`);
