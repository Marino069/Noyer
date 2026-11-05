import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (chemin: string) => readFileSync(chemin, "utf8");

describe("E7-07 · test e2e navigateur clavier + axe", () => {
  const spec = lire("e2e/parcours-clavier.spec.ts");

  it("le parcours accueil → fiche → panier → paiement est couvert", () => {
    expect(existsSync("playwright.config.ts")).toBe(true);
    for (const etape of [
      '"/fr"',
      "lucerne-classic",
      "Ajouter au panier",
      "/fr\\/panier$/",
      "/fr\\/panier\\/paiement",
    ]) {
      expect(spec).toContain(etape);
    }
  });

  it("tout se fait au clavier, avec focus visible à chaque étape", () => {
    expect(spec).toContain('keyboard.press("Tab")');
    expect(spec).toContain("focusVisible");
    expect(spec).not.toMatch(/\.click\(|\.fill\(/);
  });

  it("axe vérifie critique et sérieux, contrastes inclus", () => {
    expect(spec).toContain("@axe-core/playwright");
    expect(spec).toContain('"critical"');
    expect(spec).toContain('"serious"');
    expect(spec).not.toMatch(/color-contrast/);
  });

  it("le test tourne avec les mocks MSW et dans la CI front (npm test)", () => {
    const config = lire("playwright.config.ts");
    expect(config).toContain('NEXT_PUBLIC_API_MOCKS: "true"');
    const pkg = JSON.parse(lire("package.json"));
    expect(pkg.scripts.test).toMatch(/vitest run/);
    expect(pkg.scripts.test).toContain("test:e2e");
    expect(pkg.scripts["test:e2e"]).toContain("playwright test");
  });

  it("vitest n'exécute pas les specs Playwright", () => {
    expect(lire("vitest.config.mts")).toContain("e2e/**");
  });
});
