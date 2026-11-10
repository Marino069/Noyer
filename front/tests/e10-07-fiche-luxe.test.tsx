import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FicheProduit } from "@/components/FicheProduit";
import fr from "@/i18n/dictionaries/fr.json";
import { detailDe, produits } from "@/mocks/data";

const lire = (f: string) => readFileSync(f, "utf8");

function rendre(gamme: "Classic" | "Premium") {
  const produit = detailDe(produits.find((p) => p.gamme === gamme)!);
  const disponibilite =
    gamme === "Premium"
      ? {
          ok: true,
          data: {
            gamme,
            series: [{ taille_serie: 50, numeros_disponibles: [3, 7, 8] }],
          },
        }
      : { ok: true, data: { gamme, stock: 4 } };
  return render(
    <FicheProduit
      produit={produit}
      disponibilite={disponibilite as never}
      locale="fr"
      shopEnabled
      textes={fr.fiche}
      prix={fr.price}
      badge={fr.badge}
      interrupteur={fr.interrupteur}
    />,
  );
}

describe("[E10-07] Fiche produit Maison de luxe", () => {
  it("deux colonnes 7/5 en registre sombre", () => {
    expect(lire("components/FicheProduit.module.css")).toMatch(
      /minmax\(0,\s*7fr\)\s*minmax\(0,\s*5fr\)/,
    );
    const { container } = rendre("Premium");
    expect(container.querySelector("section")).toHaveAttribute(
      "data-tone",
      "dark",
    );
  });

  it("Premium : surtitre, nom, gamme, plaque, réservation et rendez-vous", async () => {
    rendre("Premium");
    expect(screen.getByText(fr.fiche.eyebrow.premium)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Réserver/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(fr.fiche.cart.plateLabel)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: fr.fiche.visit })).toHaveAttribute(
      "href",
      "/fr/contact",
    );
  });

  it("Classic : ni grille ni plaque, bouton atelier présent", () => {
    rendre("Classic");
    expect(screen.queryByText(fr.fiche.cart.plateLabel)).toBeNull();
    expect(screen.queryByRole("group", { name: /Choisissez/ })).toBeNull();
    expect(
      screen.getByRole("link", { name: fr.fiche.visit }),
    ).toBeInTheDocument();
  });

  it("panier latéral et vol vers le panier conservés", () => {
    const src = lire("components/AjoutPanier.tsx");
    expect(src).toContain("<PanierLateral");
    expect(src).toContain("voler(");
  });
});
