import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

const lhci = JSON.parse(readFileSync("lighthouserc.json", "utf8")).ci;
const assertions = lhci.assert.assertions;

describe("[E7-03] Budget Lighthouse", () => {
  it("audite la homepage et la fiche produit sur mobile", () => {
    expect(lhci.collect.settings.formFactor).toBe("mobile");
    const urls: string[] = lhci.collect.url;
    expect(urls.some((u) => u.endsWith("/fr"))).toBe(true);
    expect(urls.some((u) => u.includes("/produits/"))).toBe(true);
  });

  it("impose LCP < 2,5 s, CLS < 0,1 et TBT/INP < 200 ms", () => {
    expect(assertions["largest-contentful-paint"][1].maxNumericValue).toBe(
      2500,
    );
    expect(assertions["cumulative-layout-shift"][1].maxNumericValue).toBe(0.1);
    expect(assertions["total-blocking-time"][1].maxNumericValue).toBe(200);
    expect(assertions["interaction-to-next-paint"][1].maxNumericValue).toBe(
      200,
    );
  });

  it("limite le poids de la page à 1,5 Mo", () => {
    expect(assertions["total-byte-weight"][0]).toBe("error");
    expect(assertions["total-byte-weight"][1].maxNumericValue).toBe(
      1.5 * 1024 * 1024,
    );
  });
});

describe("[E7-03] Optimisation des images", () => {
  it("sert AVIF puis WebP sans descendre sous la qualité 80 (grain du bois)", () => {
    expect(nextConfig.images?.formats).toEqual(["image/avif", "image/webp"]);
    expect(
      Math.min(...(nextConfig.images?.qualities ?? [0])),
    ).toBeGreaterThanOrEqual(80);
  });

  it("garde les images statiques sous le budget", () => {
    const dir = "public/mocks";
    const total = readdirSync(dir).reduce(
      (n, f) => n + statSync(join(dir, f)).size,
      0,
    );
    expect(total).toBeLessThan(1.5 * 1024 * 1024);
  });
});
