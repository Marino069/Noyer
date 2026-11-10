import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Tests du testeur indépendant : critères de l'issue #353 (E10-10).
const root = process.cwd();
const lire = (...p: string[]) => readFileSync(join(root, ...p), "utf8");
const tokens = lire("styles", "tokens.css");
const tok = (n: string) =>
  new RegExp(`${n}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)![1].toLowerCase();

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe("[E10-10] Vérification finale (critères)", () => {
  it("contrastes : texte du registre sombre ≥ 4.5:1 sur les deux fonds sombres", () => {
    for (const fond of ["--dark-bg", "--dark-bg-alt"]) {
      for (const texte of ["--dark-text", "--dark-text-muted"]) {
        expect(
          ratio(tok(texte), tok(fond)),
          `${texte} sur ${fond}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("le jeton --ls-eyebrow est dans la plage 0.22–0.4em de la maquette", () => {
    const v = parseFloat(/--ls-eyebrow:\s*([\d.]+)em/.exec(tokens)![1]);
    expect(v).toBeGreaterThanOrEqual(0.22);
    expect(v).toBeLessThanOrEqual(0.4);
  });

  it.each([
    ["components/Serie.module.css"],
    ["components/Footer.module.css"],
    ["components/FicheProduit.module.css"],
    ["components/Frise.module.css"],
    ["components/atelier/LegendeFigure.module.css"],
  ])("%s : aucun letter-spacing de 0.2em ou 0.08em en dur", (f) => {
    const s = lire(...f.split("/"));
    expect(s).not.toMatch(/letter-spacing:\s*0?\.(2|08)em/);
  });

  it("Lighthouse : seuils 0.9 perf, 0.95 a11y configurés pour accueil et fiche", () => {
    const cfg = JSON.parse(lire("lighthouserc.json"));
    const urls: string[] = cfg.ci.collect.url;
    expect(urls.some((u) => u.endsWith("/fr"))).toBe(true);
    expect(urls.some((u) => u.includes("/produits/"))).toBe(true);
    for (const m of cfg.ci.assert.assertMatrix) {
      expect(
        m.assertions["categories:performance"][1].minScore,
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        m.assertions["categories:accessibility"][1].minScore,
      ).toBeGreaterThanOrEqual(0.95);
    }
  });

  it("le rapport de vérification figure dans docs/a11y-audit.md", () => {
    const doc = readFileSync(join(root, "..", "docs", "a11y-audit.md"), "utf8");
    expect(doc).toMatch(/E10-10/);
    expect(doc).toMatch(/Contrastes/);
    expect(doc).toMatch(/Reduced-motion/i);
  });
});
