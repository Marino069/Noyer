import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Tests écrits à partir des critères d'acceptation de l'issue #256 (E8-01).
const tokens = readFileSync("styles/tokens.css", "utf8");
const globals = readFileSync("styles/globals.css", "utf8");
const brief = readFileSync("../docs/brief.md", "utf8");

const cssComposants = readdirSync("components")
  .filter((f) => f.endsWith(".css"))
  .map((f) => ({ f, css: readFileSync(join("components", f), "utf8") }));

/** Valeur en px d'un token clamp(min, a + b·vw, max) pour une largeur donnée. */
function clampPx(token: string, largeur: number): number {
  const m = tokens.match(new RegExp(`--${token}:\\s*clamp\\(([^;]*?)\\);`));
  if (!m) throw new Error(`token ${token} introuvable`);
  const [min, pref, max] = m[1].split(",").map((s) => s.trim());
  const rem = (s: string) => parseFloat(s) * 16;
  const p = pref.match(/([\d.]+)rem\s*\+\s*([\d.]+)vw/)!;
  const v = parseFloat(p[1]) * 16 + (parseFloat(p[2]) * largeur) / 100;
  return Math.min(Math.max(v, rem(min)), rem(max));
}

describe("[E8-01] critère 1 : tokens d'échelle et d'espacement, utilisés partout", () => {
  it("h1 vaut ≈ 104 px à 1440 px, h2 ≈ 64 px, corps 17 px", () => {
    expect(clampPx("fs-display", 1440)).toBe(104);
    expect(clampPx("fs-h2", 1440)).toBe(64);
    expect(tokens).toMatch(/--fs-body:\s*1\.0625rem/);
  });

  it("l'échelle est fluide : plus petite à 390 px qu'à 1440 px, titres lisibles", () => {
    expect(clampPx("fs-display", 390)).toBeLessThan(
      clampPx("fs-display", 1440),
    );
    expect(clampPx("fs-h2", 390)).toBeLessThan(clampPx("fs-h2", 1440));
    expect(clampPx("fs-display", 390)).toBeGreaterThanOrEqual(40);
    expect(clampPx("fs-h2", 390)).toBeGreaterThanOrEqual(28);
  });

  it("conteneur 1320 px et gouttières 40 px sur desktop", () => {
    expect(tokens).toMatch(/--container:\s*82\.5rem/);
    const bloc = tokens.slice(tokens.indexOf("min-width: 900px"));
    expect(bloc.split("}")[0]).toMatch(/--gutter:\s*2\.5rem/);
  });

  it("sections espacées de 120 px à 160 px selon la largeur", () => {
    const valeurs = [...tokens.matchAll(/--space-section:\s*([\d.]+)rem/g)].map(
      (m) => parseFloat(m[1]) * 16,
    );
    expect(valeurs).toContain(120);
    expect(valeurs).toContain(160);
    expect(Math.max(...valeurs)).toBe(160);
  });

  it("le conteneur Section et le Header utilisent les tokens de grille", () => {
    const section = readFileSync("components/Section.module.css", "utf8");
    expect(section).toMatch(/padding-block:\s*var\(--space-section\)/);
    expect(section).toMatch(/max-width:\s*var\(--container\)/);
    expect(section).toMatch(/padding-inline:\s*var\(--gutter\)/);
    const header = readFileSync("components/Header.module.css", "utf8");
    expect(header).toMatch(/max-width:\s*var\(--container\)/);
    expect(header).toMatch(/padding-inline:\s*var\(--gutter\)/);
  });

  it("aucun composant ne garde de clamp() ni de conteneur large en dur", () => {
    for (const { f, css } of cssComposants) {
      expect(css, f).not.toMatch(/clamp\(/);
      expect(css, f).not.toMatch(/max-width:\s*(72|82\.5)rem/);
    }
  });

  it("h1, h2, h3 globaux lisent les tokens", () => {
    expect(globals).toMatch(/h1\s*\{[^}]*font-size:\s*var\(--fs-display\)/);
    expect(globals).toMatch(/h2\s*\{[^}]*font-size:\s*var\(--fs-h2\)/);
    expect(globals).toMatch(/h3\s*\{[^}]*font-size:\s*var\(--fs-h3\)/);
  });

  it("surtitres : petites capitales espacées (.eyebrow)", () => {
    const eyebrow = globals.match(/\.eyebrow\s*\{([^}]*)\}/)![1];
    expect(eyebrow).toMatch(/text-transform:\s*uppercase/);
    expect(eyebrow).toMatch(/letter-spacing:\s*var\(--ls-eyebrow\)/);
    expect(tokens).toMatch(/--ls-eyebrow:\s*0\.\d+em/);
  });
});

describe("[E8-01] critère 3 : aucune couleur, police ou rayon hors du brief", () => {
  const hexBrief = new Set(
    brief.match(/#[0-9a-fA-F]{6}/g)!.map((h) => h.toLowerCase()),
  );

  it("toutes les couleurs hex du code CSS figurent dans le brief", () => {
    const fichiers = [
      { f: "tokens.css", css: tokens },
      { f: "globals.css", css: globals },
      ...cssComposants,
    ];
    for (const { f, css } of fichiers) {
      for (const h of css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        expect(hexBrief.has(h.toLowerCase()), `${f} : ${h}`).toBe(true);
      }
    }
  });

  it("aucune couleur fonctionnelle littérale dans les composants", () => {
    for (const { f, css } of cssComposants) {
      expect(css, f).not.toMatch(
        new RegExp(`\\b(${["rgb", "hsl"].join("|")})a?\\(`),
      );
    }
  });

  it("aucune font-family littérale dans les composants et globals", () => {
    for (const { f, css } of [
      ...cssComposants,
      { f: "globals.css", css: globals },
    ]) {
      for (const m of css.matchAll(/font-family:\s*([^;]+);/g)) {
        expect(m[1], f).toMatch(/var\(--(serif|sans)\)/);
      }
    }
  });

  it("le rayon vient du token --radius (2 px), sauf pastilles rondes", () => {
    expect(tokens).toMatch(/--radius:\s*2px/);
    for (const { f, css } of cssComposants) {
      for (const m of css.matchAll(/border-radius:\s*([^;]+);/g)) {
        expect(m[1].trim(), f).toMatch(/^(var\(--radius\)|0|50%)$/);
      }
    }
  });

  it("les tokens d'échelle n'introduisent ni couleur ni police", () => {
    const echelle = tokens.slice(tokens.indexOf("--fs-display"));
    expect(echelle).not.toMatch(
      /#[0-9a-fA-F]{3,8}|rgba?\(|font-family|--font-/,
    );
  });
});
