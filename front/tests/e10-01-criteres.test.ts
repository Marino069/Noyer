// Tests indépendants du ticket #344 [E10-01] Charte sombre et typographie de maison.
// Les valeurs attendues viennent de docs/brief.md, pas du code.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Valeurs lues dans docs/brief.md (§04), la référence : pas de couleur en dur ici.
const briefMd = readFileSync("../docs/brief.md", "utf8");
const brief = (nom: string) => {
  const m = briefMd.match(new RegExp(`--${nom}:\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`--${nom} absent du brief`);
  return m[1].toLowerCase();
};
const BRIEF = {
  bg: brief("bg"),
  bgAlt: brief("bg-alt"),
  text: brief("text"),
  muted: brief("text-muted"),
  walnut: brief("walnut"),
  brass: brief("brass"),
};

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const tokens = readFileSync("styles/tokens.css", "utf8");
const globals = readFileSync("styles/globals.css", "utf8");
const tok = (nom: string) =>
  tokens
    .match(new RegExp(`--${nom}:\\s*([^;]+);`))?.[1]
    .trim()
    .toLowerCase();

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === "node_modules" || f === ".next") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const cssFiles = [
  ...walk("app"),
  ...walk("components"),
  "styles/globals.css",
].filter((f) => f.endsWith(".css"));

describe("E10-01 · tokens sombres conformes au brief", () => {
  it.each([
    ["bg", BRIEF.bg],
    ["bg-alt", BRIEF.bgAlt],
    ["text", BRIEF.text],
    ["text-muted", BRIEF.muted],
    ["brass", BRIEF.brass],
  ])("--%s = %s", (nom, valeur) => {
    expect(tok(nom)).toBe(valeur);
  });

  it("color-scheme: dark et bordure laiton 20 %", () => {
    expect(tokens).toMatch(/color-scheme:\s*dark/);
    expect(tok("border")?.match(/[\d.]+/g)).toEqual([
      "176",
      "141",
      "87",
      "0.2",
    ]);
  });

  it("surtitre en 11 px", () => {
    expect(tok("fs-eyebrow")).toMatch(/^0?\.6875rem/);
  });

  it("pas de bascule vers un registre clair", () => {
    expect(tokens).not.toMatch(/prefers-color-scheme:\s*light/);
  });
});

describe("Critère 1 · textes ≥ 4.5:1 sur les deux fonds sombres", () => {
  it.each([
    [BRIEF.text, BRIEF.bg],
    [BRIEF.text, BRIEF.bgAlt],
    [BRIEF.muted, BRIEF.bg],
    [BRIEF.muted, BRIEF.bgAlt],
    [BRIEF.brass, BRIEF.bg], // surtitres laiton, uniquement sur --bg
    [BRIEF.bg, BRIEF.brass], // texte du bouton principal
    [BRIEF.bg, BRIEF.muted], // bouton principal au survol
  ])("%s sur %s ≥ 4.5:1", (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("le noyer n'est jamais utilisé comme couleur de texte", () => {
    for (const f of cssFiles) {
      const css = readFileSync(f, "utf8");
      expect(css, f).not.toMatch(/[^-]color:\s*var\(--walnut\)/);
      expect(css, f).not.toMatch(
        new RegExp(`(^|[;{\\s])color:\\s*${BRIEF.walnut}`, "i"),
      );
    }
  });
});

describe("Critère 2 · composants lisibles en sombre", () => {
  const btn = readFileSync("components/Button.module.css", "utf8");

  it("bouton principal : fond laiton, texte sombre, hover en texte secondaire", () => {
    expect(btn).toMatch(/--btn-bg:\s*var\(--brass\)/);
    expect(btn).toMatch(/--btn-fg:\s*var\(--(dark-)?bg\)/);
    expect(btn).toMatch(/--btn-hover-bg:\s*var\(--(dark-)?text-muted\)/);
  });

  it("bouton secondaire cerclé de laiton", () => {
    expect(btn).toMatch(
      /\.secondary[^{]*\{[^}]*border-color:\s*var\(--brass\)/,
    );
  });

  it("boutons en petites capitales 11 px", () => {
    expect(btn).toMatch(/text-transform:\s*uppercase/);
    expect(btn).toMatch(/var\(--fs-eyebrow\)/);
  });

  it("aucun composant ne pose une couleur nommée", () => {
    for (const f of cssFiles) {
      const css = readFileSync(f, "utf8");
      expect(css, f).not.toMatch(
        /(color|background)(-color)?:\s*(white|black|red|blue|green|gray|grey)\b/i,
      );
    }
  });

  it("titres Fraunces en graisse 300, filet laiton 1 px", () => {
    expect(globals).toMatch(/font-weight:\s*300/);
    expect(globals).toMatch(/\.filet-laiton/);
  });
});

describe("Critère 3 · aucune couleur hors du brief", () => {
  const permis = new Set(Object.values(BRIEF));

  it("les tokens ne déclarent que des couleurs du brief", () => {
    for (const h of tokens.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
      expect(permis.has(h.toLowerCase()), h).toBe(true);
    }
    for (const c of tokens.match(/rgba?\([^)]*\)/g) ?? []) {
      expect(c.replace(/\s/g, ""), c).toMatch(/^rgba\(176,141,87,0?\.\d+\)$/);
    }
  });

  it("aucun CSS ne code une couleur en dur hors du brief", () => {
    for (const f of cssFiles) {
      const css = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const h of css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        expect(permis.has(h.toLowerCase()), `${f} ${h}`).toBe(true);
      }
      for (const c of css.match(/(rgba?|hsla?)\([^)]*\)/g) ?? []) {
        expect(c.replace(/\s/g, ""), `${f} ${c}`).toMatch(
          /^rgba\((176,141,87|245,241,232|41,37,31|58,48,40),/,
        );
      }
    }
  });

  it("le brief documente les valeurs sombres", () => {
    const brief = readFileSync("../docs/brief.md", "utf8").toLowerCase();
    for (const v of Object.values(BRIEF)) expect(brief).toContain(v);
  });
});
