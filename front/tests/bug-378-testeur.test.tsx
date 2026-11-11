import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "@/components/Hero";
import { LampeAllumable } from "@/components/LampeAllumable";
import type { Media } from "@/lib/api";
import { ogImage, productJsonLd } from "@/lib/seo";
import { detailDe, heroAccueil, produits } from "@/mocks/data";

const sansSources: Media = { url: "/media/x.webp", alt: "Lucerne" };
const produit = produits.find((p) => p.slug === "lucerne-premium")!;

describe("[Bug 378] critères (testeur indépendant)", () => {
  it("Hero ne plante pas avec une image sans sources", () => {
    expect(() =>
      render(
        <Hero
          contenu={{
            titre: "Titre",
            mot_italique: null,
            cta_libelle: "Voir",
            image: sansSources as never,
          }}
          ctaHref="/fr/produits"
        />,
      ),
    ).not.toThrow();
  });

  it("Hero ne plante pas avec une version allumée sans sources", () => {
    expect(() =>
      render(
        <Hero
          contenu={{
            titre: "Titre",
            mot_italique: null,
            cta_libelle: "Voir",
            image: heroAccueil.image,
          }}
          ctaHref="/fr/produits"
          interrupteur={{
            allumee: sansSources,
            libelleAllumer: "Allumer",
            libelleEteindre: "Éteindre",
          }}
        />,
      ),
    ).not.toThrow();
  });

  it("LampeAllumable ignore une image allumée sans sources, même après clic", () => {
    const { container, getByRole } = render(
      <LampeAllumable
        allumee={sansSources}
        sizes="100vw"
        libelleAllumer="Allumer"
        libelleEteindre="Éteindre"
      />,
    );
    expect(() => fireEvent.click(getByRole("button"))).not.toThrow();
    expect(container.querySelector("img")).toBeNull();
  });

  it("JSON-LD ne garde que les médias avec sources (mélange)", () => {
    const base = detailDe(produit);
    const avec = base.medias.find((m) => (m.sources ?? []).length > 0);
    const ld = productJsonLd({
      produit: { ...base, medias: [sansSources, ...(avec ? [avec] : [])] },
      disponibilite: null,
      url: "/fr/produits/lucerne-premium",
      description: "d",
      brand: "Noyer",
    });
    expect(ld.image).toHaveLength(avec ? 1 : 0);
    expect(ld.image.every((u) => !u.includes("/media/x.webp"))).toBe(true);
  });

  it("ogImage reste fonctionnel pour un média avec sources", () => {
    const avec = detailDe(produit).medias.find(
      (m) => (m.sources ?? []).length > 0,
    );
    if (avec) expect(ogImage(avec)).toHaveLength(1);
  });
});
