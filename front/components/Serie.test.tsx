import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { Serie } from "./Serie";

const serie = {
  id: 1,
  taille_serie: 50,
  pieces_restantes: 12,
  numeros_disponibles: [3, 8, 15, 16, 21, 22, 30, 34, 41, 44, 47, 50],
};

describe("Serie", () => {
  it("décrit la série pour les lecteurs d'écran", () => {
    render(
      <Serie
        serie={serie}
        href="/fr/produits/lucerne-premium"
        textes={frDict.home.serie}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: /Cinquante pièces/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("12 pièces libres sur 50")).toBeVisible();
  });

  it("masque la grille décorative et dessine 50 points", () => {
    const { container } = render(
      <Serie serie={serie} href="/x" textes={frDict.home.serie} />,
    );
    const grille = container.querySelector('[aria-hidden="true"]');
    expect(grille?.children).toHaveLength(50);
  });

  it("renvoie vers la fiche Premium", () => {
    render(
      <Serie
        serie={serie}
        href="/fr/produits/lucerne-premium"
        textes={frDict.home.serie}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Choisir ma pièce" }),
    ).toHaveAttribute("href", "/fr/produits/lucerne-premium");
  });

  it("accorde le singulier", () => {
    render(
      <Serie
        serie={{ ...serie, pieces_restantes: 1, numeros_disponibles: [7] }}
        href="/x"
        textes={frDict.home.serie}
      />,
    );
    expect(screen.getByText("1 pièce libre sur 50")).toBeInTheDocument();
  });
});
