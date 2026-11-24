import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Exercise the actual emitted Vercel function, rather than the Vite dev server.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, ".vercel/output");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const deployment = await readJson(resolve(output, "config.json"));
const nitro = await readJson(resolve(output, "nitro.json"));
assert.equal(deployment.version, 3, "Expected Vercel Build Output API v3");
assert.equal(nitro.preset, "vercel", "Build must use the Vercel preset");

const entry = resolve(output, nitro.serverEntry);
assert.ok(entry.startsWith(output + sep), "Function entry must be inside the build output");
const functionConfig = await readJson(resolve(dirname(entry), ".vc-config.json"));
assert.equal(functionConfig.runtime, "nodejs24.x", "Build and function must use Node.js 24");
assert.equal(functionConfig.supportsResponseStreaming, true);
const functionRoute =
  "/" +
  dirname(nitro.serverEntry)
    .split(/[\\/]/)
    .at(-1)
    .replace(/\.func$/, "");
assert.ok(
  deployment.routes.some((route) => route.src === "/(.*)" && route.dest === functionRoute),
  "Nested URLs need an SSR fallback",
);

const handler = (await import(pathToFileURL(entry).href)).default;
assert.equal(typeof handler.fetch, "function");
const pending = [];
const context = { waitUntil: (promise) => pending.push(promise) };
const assets = new Set();
const pages = [
  ["/", "Overview"],
  ["/schools", "Schools"],
  ["/schools/SCH101", "GHSS No. 1 Bannu City"],
  ["/health", "Health facilities"],
  ["/health/HF201", "DHQ Teaching Hospital Bannu"],
  ["/staff", "Staff"],
  ["/staff/ST0145", "Shabana Khan"],
  ["/staff?tab=posts", "Staff"],
  ["/staff?tab=exceptions", "Staff"],
  ["/map", "Facilities &amp; map"],
  ["/inbox", "Reports inbox"],
  ["/inbox?report=RPT-SCH102-20261123-012", "Reports inbox"],
  ["/review", "Review queue"],
  ["/complaints", "Complaints"],
  ["/complaints?facility=HF204&complaint=CMP-1002", "Complaints"],
  ["/review?item=RV-1022", "Review queue"],
  ["/field-app", "Field app"],
  ["/field-app?facility=SCH108&view=app", "Field app"],
  ["/field-app?facility=HF204&view=app", "Field app"],
];

for (const [path, title] of pages) {
  const response = await handler.fetch(
    new Request(`https://dcms-bannu.test${path}`, { headers: { accept: "text/html" } }),
    context,
  );
  const html = await response.text();
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.ok(
    html.includes(`<h1`) && html.includes(title),
    `${path} must include server-rendered page content`,
  );
  assert.ok(html.includes('lang="ur"'), `${path} must include the Urdu header`);
  assert.doesNotMatch(
    html,
    /window is not defined|Something went wrong on our end|This page didn't load/,
  );
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)(?:[?#][^"]*)?"/g))
    assets.add(match[1]);
  console.log(`200 ${path}`);
}

assert.ok(assets.size > 0, "Pages must reference bundled assets");
for (const asset of assets) {
  const assetPath = resolve(output, nitro.publicDir, "." + decodeURIComponent(asset));
  assert.ok(assetPath.startsWith(resolve(output, nitro.publicDir) + sep));
  await access(assetPath);
}
const missing = await handler.fetch(
  new Request("https://dcms-bannu.test/no-such-page", { headers: { accept: "text/html" } }),
  context,
);
assert.equal(missing.status, 404, "Unknown URLs must return 404");
assert.match(await missing.text(), /Page not found/);
await Promise.all(pending);
console.log(
  `Production smoke check passed: ${pages.length} page URLs, ${assets.size} bundled assets, 404 handling, Node.js 24 and Vercel routing.`,
);
