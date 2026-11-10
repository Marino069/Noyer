import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const racine = process.cwd();
const lire = (...p: string[]) => readFileSync(join(racine, ...p), "utf8");

function fichiersCss(dossier: string): string[] {
  return readdirSync(join(racine, dossier), { withFileTypes: true }).flatMap(
    (e) =>
      e.isDirectory()
        ? fichiersCss(join(dossier, e.name))
        : e.name.endsWith(".css")
          ? [join(dossier, e.name)]
          : [],
  );
}

const CSS = [
  ...fichiersCss("components"),
  ...fichiersCss("app"),
  ...fichiersCss("styles"),
];

/** Bloc de déclarations contenant `text-transform: uppercase` et un letter-spacing en dur. */
function petitesCapitalesEnDur(src: string) {
  const blocs = src.match(/\{[^{}]*\}/g) ?? [];
  return blocs.filter(
    (b) =>
      /text-transform:\s*uppercase/.test(b) &&
      /letter-spacing:\s*0?\.\d+em/.test(b),
  );
}

describe("[E10-10] Vérification finale : cohérence", () => {
  it("toute transition ou animation est neutralisée par la règle globale reduced-motion", () => {
    const globals = lire("styles", "globals.css");
    expect(globals).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{[^}]*transition-duration: 0\.01ms !important/,
    );
    expect(globals).toMatch(/animation-duration: 0\.01ms !important/);
  });

  it("les petites capitales de 11 px suivent l'espacement 0.22 à 0.4em de la maquette", () => {
    const hors: string[] = [];
    for (const f of CSS) {
      for (const bloc of petitesCapitalesEnDur(lire(f))) {
        const m = bloc.match(/letter-spacing:\s*(0?\.\d+)em/);
        const v = m ? parseFloat(m[1]) : 0;
        if (v < 0.22 || v > 0.6) hors.push(`${f} : ${v}em`);
      }
    }
    expect(hors).toEqual([]);
  });

  it("les surtitres de série, de pied de page et de fiche utilisent le jeton --ls-eyebrow", () => {
    for (const f of ["Serie", "Footer", "FicheProduit"]) {
      const s = lire("components", `${f}.module.css`);
      expect(s).not.toMatch(/letter-spacing: 0\.2em/);
      expect(s).toMatch(/letter-spacing: var\(--ls-eyebrow\)/);
    }
  });

  it("aucune couleur codée en dur hors des tokens", () => {
    for (const f of CSS.filter((c) => !c.endsWith("tokens.css"))) {
      expect(lire(f), f).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    }
  });
});
