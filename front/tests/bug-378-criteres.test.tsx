import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { Galerie } from "@/components/Galerie";
import { GalerieEmpilee } from "@/components/GalerieEmpilee";
import { HeroLampe } from "@/components/HeroLampe";
import { FicheProduit } from "@/components/FicheProduit";
import type { Media } from "@/lib/api";
import { ogImage, productJsonLd } from "@/lib/seo";
import { detailDe, heroAccueil, produits } from "@/mocks/data";

// Contrat docs/api.md : un média non téléversé vaut { url, alt } (ni sources ni dimensions).
const sansSources: Media = { url: "/media/x.webp", alt: "Lucerne" };
const produit = produits.find((p) => p.slug === "lucerne-premium")!;
const detail = { ...detailDe(produit), medias: [sansSources] };

describe("[Bug 378] média sans sources", () => {
  it("ogImage ignore un média sans sources", () => {
    expect(ogImage(sansSources)).toEqual([]);
  });

  it("productJsonLd ne plante pas et ignore le média sans sources", () => {
    const ld = productJsonLd({
      produit: detail,
      disponibilite: null,
      url: "/fr/produits/lucerne-premium",
      description: "d",
      brand: "Noyer",
    });
    expect(ld.image).toEqual([]);
  });

  it("Galerie se rabat sur url", () => {
    const { container } = render(
      <Galerie medias={[sansSources]} textes={fr.fiche.gallery} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/media/x.webp",
    );
  });

  it("GalerieEmpilee se rabat sur url", () => {
    const { container } = render(
      <GalerieEmpilee
        medias={[sansSources, sansSources]}
        vide="vide"
        label="g"
      />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/media/x.webp",
    );
  });

  it("HeroLampe tolère une image allumée sans sources", () => {
    const { container } = render(
      <HeroLampe
        jour={heroAccueil.image!}
        allumee={sansSources}
        sizes="100vw"
        libelleAllumer="Allumer"
        libelleEteindre="Éteindre"
      />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/media/x.webp",
    );
  });

  it("FicheProduit s'affiche avec un média sans sources", () => {
    const { container } = render(
      <FicheProduit
        produit={detail}
        disponibilite={{
          ok: false,
          error: { status: 500, message: "x" } as never,
        }}
        locale="fr"
        shopEnabled
        textes={fr.fiche}
        prix={fr.price}
        badge={fr.badge}
        interrupteur={fr.interrupteur}
      />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/media/x.webp",
    );
  });
});
