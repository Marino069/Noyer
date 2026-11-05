import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Complète e7-07-e2e.test.ts. Le parcours lui-même a été exécuté dans Chromium
// (npm run test:e2e : 1 passed). Ici, on garde les garde-fous qui empêcheraient
// le test e2e de devenir complaisant ou de sortir de la CI.
const lire = (chemin: string) => readFileSync(chemin, "utf8");

describe("E7-07 · garde-fous des critères d'acceptation", () => {
  const spec = lire("e2e/parcours-clavier.spec.ts");

  it("axe n'écarte ni règle ni zone de la page", () => {
    expect(spec).not.toMatch(/disableRules|\.exclude\(|\.include\(/);
  });

  it("axe est lancé sur chaque page du parcours (5 pages)", () => {
    expect(
      spec.match(/await violations\(page\)/g)?.length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("axe échoue sur les violations critiques et sérieuses, niveau WCAG AA", () => {
    expect(spec).toMatch(/wcag2aa/);
    expect(spec).toMatch(/impact === "critical" \|\| v\.impact === "serious"/);
    expect(spec).toMatch(/expect\(await violations\(page\)\)\.toEqual\(\[\]\)/);
  });

  it("le focus visible est exigé à chaque Tab", () => {
    const tab = spec.slice(spec.indexOf("async function tabJusqua"));
    expect(tab).toMatch(
      /keyboard\.press\("Tab"\);\s*await focusVisible\(page\)/,
    );
  });

  it("aucune souris ni saisie programmatique : seulement le clavier", () => {
    expect(spec).not.toMatch(/\.(click|dblclick|fill|check|hover|tap)\(/);
    expect(spec).not.toMatch(/\.focus\(\)/);
  });

  it("la CI front exécute le script test, qui lance Playwright", () => {
    const ci = lire("../.github/workflows/ci-front.yml");
    expect(ci).toMatch(/npm --prefix front run test\b/);
    expect(lire("package.json")).toContain("playwright test");
  });
});
