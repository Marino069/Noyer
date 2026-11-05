import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const rc = JSON.parse(
  readFileSync(join(__dirname, "..", "lighthouserc.json"), "utf8"),
).ci;
const a = rc.assertions ?? rc.assert.assertions;

describe("[E7-03] Budget performance", () => {
  it("audite l'accueil et la fiche produit en profil mobile", () => {
    const urls: string[] = rc.collect.url;
    expect(urls.some((u) => u.endsWith("/fr"))).toBe(true);
    expect(urls.some((u) => u.includes("/produits/"))).toBe(true);
    // Lighthouse mesure en mobile par défaut ; « mobile » n'est pas un preset valide de lhci.
    expect(rc.collect.settings?.preset).toBeUndefined();
  });

  it("LCP < 2,5 s, CLS < 0,1, TBT (proxy INP) < 200 ms", () => {
    expect(
      a["largest-contentful-paint"][1].maxNumericValue,
    ).toBeLessThanOrEqual(2500);
    expect(a["cumulative-layout-shift"][1].maxNumericValue).toBeLessThanOrEqual(
      0.1,
    );
    expect(a["total-blocking-time"][1].maxNumericValue).toBeLessThanOrEqual(
      200,
    );
  });

  it("poids de la page < 1,5 Mo", () => {
    expect(a["total-byte-weight"][1].maxNumericValue).toBeLessThanOrEqual(
      1_500_000,
    );
  });

  it("les seuils bloquent la CI (niveau error)", () => {
    for (const k of [
      "largest-contentful-paint",
      "cumulative-layout-shift",
      "total-blocking-time",
      "total-byte-weight",
    ]) {
      expect(a[k][0]).toBe("error");
    }
  });

  it("la procédure de comparaison du grain est documentée", () => {
    const doc = readFileSync(
      join(__dirname, "..", "..", "docs", "performance.md"),
      "utf8",
    );
    expect(doc).toMatch(/grain du bois/);
  });
});
