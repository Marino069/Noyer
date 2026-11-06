import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { produits } from "@/mocks/data";
import { Selection } from "./Selection";

const read = (file: string) => readFileSync(join(__dirname, file), "utf8");

const renderSelection = () =>
  render(
    <Selection
      locale="fr"
      title="À l'atelier en ce moment"
      empty="Bientôt"
      errorTitle="Indisponible"
      errorMessage="Rechargez la page."
      produits={{
        ok: true,
        data: {
          count: produits.length,
          next: null,
          previous: null,
          results: produits,
        },
      }}
      tous={{ libelle: "Toutes les lampes", href: "/fr/produits" }}
    />,
  );

describe("[E8-06] Sélection : critères d'acceptation", () => {
  it("les cartes sont accessibles au clavier : un seul lien focusable par carte, nommé par le produit", () => {
    renderSelection();
    const cartes = screen.getAllByRole("article");
    expect(cartes).toHaveLength(produits.length);
    cartes.forEach((carte, i) => {
      const liens = carte.querySelectorAll("a, button, [tabindex]");
      expect(liens).toHaveLength(1);
      expect(liens[0]).toHaveAccessibleName(new RegExp(produits[i].modele));
      expect(liens[0]).not.toHaveAttribute("tabindex", "-1");
    });
  });

  it("le focus clavier est visible sur la carte entière", () => {
    const css = read("Selection.module.css");
    expect(css).toMatch(/\.carte:has\(\.lien:focus-visible\)\s*{[^}]*outline:/);
  });

  it("propose le lien « Toutes les lampes »", () => {
    renderSelection();
    expect(
      screen.getByRole("link", { name: "Toutes les lampes" }),
    ).toHaveAttribute("href", "/fr/produits");
  });

  it("le titre de la section vient du dictionnaire", () => {
    expect(fr.home.selection.title).toBe("À l'atelier en ce moment");
  });

  it("aucun prix ni stock écrit en dur, aucune couleur hors tokens", () => {
    const tsx = read("Selection.tsx");
    expect(tsx).not.toMatch(/\bCHF\b/);
    expect(tsx).not.toMatch(/quantite_disponible\s*[=:]\s*\d/);
    expect(read("Selection.module.css")).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
