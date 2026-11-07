import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "@/components/ProductCard";
import { vignetteDe } from "@/lib/image";
import type { ProduitResume } from "@/lib/api";

const produit = (image: ProduitResume["image_principale"]): ProduitResume => ({
  slug: "lucerne-classic",
  modele: "Lucerne",
  gamme: "Classic",
  prix_ttc_centimes: 29000,
  image_principale: image,
});

describe("image_principale sans sources (bug 290)", () => {
  it("vignetteDe se replie sur url", () => {
    expect(
      vignetteDe({ url: "https://example.org/a.jpg", alt: "Lampe" }),
    ).toMatchObject({ src: "https://example.org/a.jpg", alt: "Lampe" });
  });

  it("vignetteDe renvoie null sans url ni sources", () => {
    expect(vignetteDe({ alt: "Lampe" })).toBeNull();
    expect(vignetteDe(null)).toBeNull();
  });

  it("vignetteDe privilégie les sources triées quand elles existent", () => {
    const v = vignetteDe({
      alt: "Lampe",
      url: "https://example.org/a.jpg",
      largeur_origine: 1600,
      hauteur_origine: 1000,
      sources: [
        { largeur: 960, url: "/b.webp" },
        { largeur: 480, url: "/a.webp" },
      ],
    });
    expect(v?.src).toBe("/a.webp");
    expect(v?.srcSet).toBe("/a.webp 480w, /b.webp 960w");
  });

  it("ProductCard affiche l'image sans planter", () => {
    const { container } = render(
      <ProductCard
        locale="fr"
        produit={produit({ url: "https://example.org/a.jpg", alt: "Lampe" })}
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.org/a.jpg");
  });
});
