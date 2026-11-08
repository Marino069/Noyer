import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AjoutPanier } from "@/components/AjoutPanier";
import fr from "@/i18n/dictionaries/fr.json";

const rendre = (numeros = [2, 3, 5, 12]) =>
  render(
    <AjoutPanier
      slug="lampe-premium"
      gamme="Premium"
      numeros={numeros}
      total={20}
      panierHref="/fr/panier"
      textes={fr.fiche.cart}
    />,
  );

describe("[E9-08] Grille de la série", () => {
  it("affiche toute la série : libres = boutons, vendues = décrites", () => {
    rendre();
    expect(screen.getAllByRole("button", { name: /^N° \d+$/ })).toHaveLength(4);
    expect(screen.getAllByRole("img", { name: /, vendue$/ })).toHaveLength(16);
    expect(
      screen.getByRole("img", { name: "N° 1, vendue" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "N° 1" })).toBeNull();
  });

  it("flèches : navigation entre pièces libres, les vendues sont sautées", async () => {
    const user = userEvent.setup();
    rendre();
    await user.tab();
    expect(screen.getByRole("button", { name: "N° 2" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("button", { name: "N° 5" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "N° 12" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "N° 5" })).toHaveFocus();
  });

  it("le clic grave le numéro sur la plaque et conserve l'attribution automatique", async () => {
    const user = userEvent.setup();
    rendre();
    expect(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "N° 12" }));
    expect(screen.getByText(/^N° 12/, { selector: "p" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "N° 12" }));
    expect(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    ).toBeInTheDocument();
  });
});
