import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync("styles/tokens.css", "utf8");
const globals = readFileSync("styles/globals.css", "utf8");

describe("[E8-01] tokens d'échelle, grille et rythme", () => {
  it("définit les tokens d'échelle fluide (clamp) et d'espacement", () => {
    for (const nom of ["fs-display", "fs-h2", "fs-h3"]) {
      expect(tokens).toMatch(new RegExp(`--${nom}:\\s*clamp\\(`));
    }
    expect(tokens).toMatch(/--fs-body:\s*1\.0625rem/);
    expect(tokens).toMatch(/--container:\s*82\.5rem/);
    expect(tokens).toMatch(/--gutter:\s*2\.5rem/);
    expect(tokens).toMatch(/--space-section:\s*10rem/);
    expect(tokens).toMatch(/--space-section:\s*7\.5rem/);
  });

  it("h1 ≈ 104 px et h2 ≈ 64 px au maximum du clamp", () => {
    expect(tokens).toMatch(/--fs-display:[^;]*6\.5rem\)/);
    expect(tokens).toMatch(/--fs-h2:[^;]*4rem\)/);
  });

  it("les titres et les surtitres utilisent les tokens", () => {
    expect(globals).toMatch(/h1\s*\{[^}]*var\(--fs-display\)/);
    expect(globals).toMatch(/h2\s*\{[^}]*var\(--fs-h2\)/);
    expect(globals).toMatch(/\.eyebrow\s*\{[^}]*text-transform:\s*uppercase/);
  });

  it("les composants n'utilisent plus de clamp() ni de conteneur en dur", () => {
    const dir = "components";
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".css"))) {
      const css = readFileSync(join(dir, f), "utf8");
      expect(css, f).not.toMatch(/clamp\(/);
      expect(css, f).not.toMatch(/max-width:\s*72rem/);
    }
  });

  it("n'ajoute aucune couleur hors du brief (6 couleurs hex, aucune dans les tokens d'échelle)", () => {
    const hex = new Set(tokens.match(/#[0-9a-fA-F]{6}/g));
    expect(hex.size).toBe(6);
    const echelle = tokens.slice(tokens.indexOf("--fs-display"));
    expect(echelle).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
  });
});
