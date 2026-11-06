import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FicheProduit } from "@/components/FicheProduit";
import fr from "@/i18n/dictionaries/fr.json";
import { detailDe, produits } from "@/mocks/data";

const premium = detailDe(produits[1]);
const classic = detailDe(produits[0]);

const rendre = (produit = premium) =>
  render(
    <FicheProduit
      produit={produit}
      disponibilite={{
        ok: true,
        data: { gamme: "Premium", series: [] },
      }}
      locale="fr"
      shopEnabled
      textes={fr.fiche}
      prix={fr.price}
      badge={fr.badge}
    />,
  );

describe("[E8-07] Galerie empilée", () => {
  it("affiche la grande vue, deux vues carrées et le gros plan matière", () => {
    rendre();
    const galerie = screen.getByRole("group", { name: "Galerie photo" });
    const images = within(galerie).getAllByRole("img");
    expect(images).toHaveLength(4);
    for (const img of images) expect(img).toHaveAttribute("alt");
  });

  it("n'a plus de carrousel ni de vignettes", () => {
    rendre();
    expect(screen.queryByRole("button", { name: /Photo suivante/ })).toBeNull();
    expect(
      screen.queryByRole("list", { name: "Choisir une photo" }),
    ).toBeNull();
  });

  it("affiche la cote sur la grande vue", () => {
    rendre();
    expect(
      screen.getByText(`H ${premium.caracteristiques.hauteur_cm} cm`),
    ).toBeInTheDocument();
  });

  it("charge la grande vue en priorité et les autres en différé", () => {
    rendre();
    const images = within(
      screen.getByRole("group", { name: "Galerie photo" }),
    ).getAllByRole("img");
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });
});

describe("[E8-07] Colonne d'achat", () => {
  it("regroupe titre, prix, caractéristiques (dl) et achat", () => {
    rendre();
    const colonne = screen.getByRole("complementary", { name: "Achat" });
    expect(
      within(colonne).getByRole("heading", { level: 1, name: "Lucerne" }),
    ).toBeInTheDocument();
    expect(
      within(colonne).getByRole("button", { name: /Réserver/ }),
    ).toBeInTheDocument();
    expect(colonne.querySelector("dl")).not.toBeNull();
  });

  it("propose de comparer avec la Classic (Premium) ou la Premium (Classic)", () => {
    const { unmount } = rendre(premium);
    expect(
      screen.getByRole("link", { name: "Comparer avec la Classic" }),
    ).toBeInTheDocument();
    unmount();
    rendre(classic);
    expect(
      screen.getByRole("link", { name: "Comparer avec la Premium" }),
    ).toBeInTheDocument();
  });

  it("n'est sticky qu'au-dessus de 900 px", () => {
    const css = readFileSync(
      join(__dirname, "../components/FicheProduit.module.css"),
      "utf8",
    );
    const sticky = css.indexOf("position: sticky");
    expect(sticky).toBeGreaterThan(-1);
    const avant = css.slice(0, sticky);
    expect(avant.lastIndexOf("@media (min-width: 900px)")).toBeGreaterThan(
      avant.lastIndexOf("\n}\n"),
    );
    expect(css.match(/position: sticky/g)).toHaveLength(1);
  });
});
