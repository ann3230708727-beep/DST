import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const shellRoot = resolve(here, "..");
const repoRoot = resolve(shellRoot, "..", "..");
const dist = resolve(shellRoot, "dist");

const rootFiles = [
  "index.html",
  "styles.css",
  "styles-1.css",
  "styles-2.css",
  "app-core-1.js",
  "app-core-2.js",
  "app-tasks-1.js",
  "app-tasks-2.js",
  "app-tasks-3.js",
  "app-ui-1.js",
  "app-ui-2.js",
  "app-ui-3.js",
  "manifest.webmanifest"
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const name of rootFiles) {
  const src = resolve(repoRoot, name);
  if (existsSync(src)) await cp(src, resolve(dist, name));
}

const icons = resolve(repoRoot, "icons");
if (existsSync(icons)) await cp(icons, resolve(dist, "icons"), { recursive: true });

const indexPath = resolve(dist, "index.html");
let html = await readFile(indexPath, "utf8");
const bridge = await readFile(resolve(shellRoot, "shell-bridge.js"), "utf8");
const bridgeTag = `<script>\n${bridge}\n</script>`;
html = html.replace("</body>", `  ${bridgeTag}\n</body>`);
await writeFile(indexPath, html, "utf8");

console.log("Windows shell web assets synced to desktop/windows/dist (bridge inlined, service worker excluded)");
