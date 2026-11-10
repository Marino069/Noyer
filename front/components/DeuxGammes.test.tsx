import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { produits } from "@/mocks/data";
import { DeuxGammes } from "./DeuxGammes";

const classic = produits.find((p) => p.slug === "lucerne-classic")!;
const premium = produits.find((p) => p.slug === "lucerne-premium")!;

const renderSection = (aPartirDeClassic?: number) =>
  render(
    <DeuxGammes
      classic={{ produit: classic, aPartirDe: aPartirDeClassic }}
      premium={{ produit: premium }}
      locale="fr"
      textes={fr.home.gammes}
    />,
  );

// css: false dans Vitest : la mise en page se vérifie sur les feuilles de style source.
const read = (file: string) => readFileSync(join(__dirname, file), "utf8");
const css = read("DeuxGammes.module.css");
const tsx = read("DeuxGammes.tsx");

describe("[E10-04] Collections : deux panneaux", () => {
  it("affiche Classic puis Premium, avec image, titre et prix « à partir de »", () => {
    renderSection(39000);
    const [c, p] = screen.getAllByRole("article");
    expect(within(c).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Classic",
    );
    expect(within(p).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Premium",
    );
    expect(c.querySelector("img")).not.toBeNull();
    expect(p.querySelector("img")).not.toBeNull();
    expect(c).toHaveTextContent(/À partir de\s+CHF 390\.–/);
    expect(p).toHaveTextContent(/À partir de\s+CHF 1.?240\.–/);
  });

  it("prix venant de l'API : sans « à partir de », prix du produit mis en avant", () => {
    renderSection();
    expect(screen.getAllByRole("article")[0]).toHaveTextContent("CHF 480.–");
  });

  it("section nommée par son titre h2", () => {
    renderSection();
    expect(
      screen.getByRole("region", { name: "Une forme, deux matières" }),
    ).toBeInTheDocument();
  });
});

describe("[E10-04] Collections : panneaux cliquables et clavier", () => {
  it("un seul lien par panneau, vers la fiche du produit", () => {
    renderSection();
    const [c, p] = screen.getAllByRole("article");
    const lc = within(c).getAllByRole("link");
    const lp = within(p).getAllByRole("link");
    expect(lc).toHaveLength(1);
    expect(lp).toHaveLength(1);
    expect(lc[0]).toHaveAttribute("href", "/fr/produits/lucerne-classic");
    expect(lp[0]).toHaveAttribute("href", "/fr/produits/lucerne-premium");
    expect(lc[0]).toHaveAccessibleName("Classic");
  });

  it("le lien couvre le panneau entier (::after) et le focus est visible", () => {
    expect(css).toMatch(/\.lien::after\s*{[^}]*inset:\s*0/);
    expect(css).toMatch(
      /\.panneau:has\(\.lien:focus-visible\)\s*{[^}]*outline:/,
    );
  });
});

describe("[E10-04] Collections : empilées sur mobile, tokens seulement", () => {
  it("une colonne par défaut, deux dès 900 px", () => {
    const base = css.slice(0, css.indexOf("@media"));
    expect(base).toMatch(/\.grille\s*{[^}]*grid-template-columns:\s*1fr;/);
    expect(css.slice(css.indexOf("@media (min-width: 900px)"))).toMatch(
      /repeat\(2,\s*1fr\)/,
    );
  });

  it("aucun prix en dur, ni couleur hexadécimale ni rayon libre", () => {
    expect(tsx).not.toMatch(/\bCHF\b/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/border-radius:\s*\d/);
  });

  it("le comparateur passe sous les panneaux", () => {
    const { container } = renderSection();
    const grille = container.querySelector("article")!.parentElement!;
    const comparateur = screen.getByRole("slider");
    expect(
      grille.compareDocumentPosition(comparateur) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
