// Uploads a zip to an existing Chrome Web Store listing and submits it for review, using the
// v2 API (https://developer.chrome.com/docs/webstore/using-api). It signs in as a service
// account (https://developer.chrome.com/docs/webstore/service-accounts) whose email is added
// in the developer dashboard's Account section.
// Usage: node scripts/publish-store.mjs <zip> <extension id>
// Needs CWS_SERVICE_ACCOUNT_KEY (the account's JSON key) and CWS_PUBLISHER_ID in the environment.
import crypto from "node:crypto";
import fs from "node:fs";

const [zip, extensionId] = process.argv.slice(2);
const env = Object.fromEntries(["CWS_SERVICE_ACCOUNT_KEY", "CWS_PUBLISHER_ID"].map((key) => [key, process.env[key]]));
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

// Trades a JWT signed with the service account's key for an hour-long access token.
function serviceAccountAssertion({ client_email: email, private_key: key }) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: email,
    scope: "https://www.googleapis.com/auth/chromewebstore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(key, "base64url");
  return `${unsigned}.${signature}`;
}

const { access_token: token } = await call("https://oauth2.googleapis.com/token", {
  method: "POST",
  body: new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: serviceAccountAssertion(JSON.parse(env.CWS_SERVICE_ACCOUNT_KEY)),
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
