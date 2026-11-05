import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "@/components/Hero";
import { Matiere } from "@/components/Matiere";
import { ProductCard } from "@/components/ProductCard";
import { heroAccueil, matiereAccueil, produits } from "@/mocks/data";

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

const racine = join(__dirname, "..");
const lhci = JSON.parse(
  readFileSync(join(racine, "lighthouserc.json"), "utf8"),
);
// Seuils de l'accueil (tous bloquants) ; la fiche produit a le LCP simulé en warn (docs/performance.md).
const assertions = lhci.ci.assert.assertMatrix.find(
  (m: { matchingUrlPattern: string }) => m.matchingUrlPattern.endsWith("/fr$"),
).assertions;
const pkg = JSON.parse(readFileSync(join(racine, "package.json"), "utf8"));

describe("[E7-03] Critère : LCP < 2,5 s, CLS < 0,1, INP < 200 ms sur mobile (accueil et fiche produit)", () => {
  it("Lighthouse CI audite l'accueil et une fiche produit existante", () => {
    const urls: string[] = lhci.ci.collect.url;
    expect(urls.some((u) => /\/fr\/?$/.test(u))).toBe(true);
    const fiche = urls.find((u) => u.includes("/produits/"));
    expect(fiche).toBeDefined();
    const slug = fiche!.split("/produits/")[1];
    expect(produits.map((p) => p.slug)).toContain(slug);
  });

  it("l'audit n'est pas passé en desktop (mobile par défaut)", () => {
    const settings = lhci.ci.collect.settings ?? {};
    expect(settings.preset).not.toBe("desktop");
    expect(settings.formFactor ?? "mobile").toBe("mobile");
  });

  it.each([
    ["largest-contentful-paint", 2500],
    ["cumulative-layout-shift", 0.1],
    ["total-blocking-time", 200],
  ])("%s est borné à %d et bloquant", (audit, max) => {
    const [niveau, opts] = assertions[audit];
    expect(niveau).toBe("error");
    expect(opts.maxNumericValue).toBeLessThanOrEqual(max);
  });

  it("le script lhci existe et est exécuté en CI front", () => {
    expect(pkg.scripts.lhci).toMatch(/lhci/);
    const ci = readFileSync(
      join(racine, "..", ".github", "workflows", "ci-front.yml"),
      "utf8",
    );
    expect(ci).toMatch(/run lhci/);
  });
});

describe("[E7-03] Critère : poids de la homepage < 1,5 Mo", () => {
  it("assertion bloquante total-byte-weight ≤ 1 500 000 octets", () => {
    const [niveau, opts] = assertions["total-byte-weight"];
    expect(niveau).toBe("error");
    expect(opts.maxNumericValue).toBeLessThanOrEqual(1_500_000);
  });
});

describe("[E7-03] Optimisation des images (CLS, poids)", () => {
  it("hero : eager, haute priorité, dimensions explicites, srcset", () => {
    const { container } = render(
      <Hero
        contenu={{ ...heroAccueil, mot_italique: null }}
        ctaHref="/fr/produits"
      />,
    );
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img.getAttribute("width")).toBeTruthy();
    expect(img.getAttribute("height")).toBeTruthy();
    expect(img.getAttribute("srcset")).toBeTruthy();
  });

  it("carte produit : lazy, dimensions explicites, srcset et sizes", () => {
    const { container } = render(
      <ProductCard produit={produits[0]} locale="fr" />,
    );
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img.getAttribute("width")).toBeTruthy();
    expect(img.getAttribute("height")).toBeTruthy();
    expect(img.getAttribute("srcset")).toBeTruthy();
    expect(img.getAttribute("sizes")).toBeTruthy();
  });

  it("matière (sous le pli) : lazy et dimensions explicites", () => {
    const { container } = render(<Matiere contenu={matiereAccueil} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
    imgs.forEach((img) => {
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img.getAttribute("width")).toBeTruthy();
      expect(img.getAttribute("height")).toBeTruthy();
    });
  });

  it("next.config : AVIF/WebP et qualité ≥ 80 (grain du bois)", () => {
    const cfg = readFileSync(join(racine, "next.config.ts"), "utf8");
    expect(cfg).toMatch(/image\/avif/);
    expect(cfg).toMatch(/image\/webp/);
    const q = /qualities:\s*\[([^\]]*)\]/
      .exec(cfg)![1]
      .split(",")
      .map((n) => Number(n.trim()));
    expect(Math.min(...q)).toBeGreaterThanOrEqual(80);
  });
});

describe("[E7-03] Critère : comparaison visuelle du grain avant/après (non automatisable)", () => {
  it("la procédure humaine est documentée", () => {
    const doc = readFileSync(
      join(racine, "..", "docs", "performance.md"),
      "utf8",
    );
    expect(doc).toMatch(/grain du bois/);
    expect(doc).toMatch(/validation humaine/i);
  });
});
