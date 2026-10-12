import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dossier = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.BASE_URL || "http://localhost:3000";
const pages = fs
  .readFileSync(path.join(dossier, "pages.txt"), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
const formats = [
  { nom: "desktop", width: 1280, height: 800 },
  { nom: "mobile", width: 390, height: 844 },
];
const sortie = path.join(dossier, "captures");
fs.mkdirSync(sortie, { recursive: true });

const navigateur = await chromium.launch();
for (const f of formats) {
  const contexte = await navigateur.newContext({ viewport: { width: f.width, height: f.height } });
  const page = await contexte.newPage();
  for (const p of pages) {
    const reponse = await page.goto(base + p, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(2500);
    const nom = (p.replace(/\//g, "_").replace(/^_/, "") || "racine") + `-${f.nom}.png`;
    await page.screenshot({ path: path.join(sortie, nom), fullPage: true });
    console.log(`${reponse?.status()}  ${p}  (${f.nom})`);
  }
  await contexte.close();
}
await navigateur.close();
