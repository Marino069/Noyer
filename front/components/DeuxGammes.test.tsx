import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { detailDe, produits } from "@/mocks/data";
import { DeuxGammes } from "./DeuxGammes";

const classic = produits.find((p) => p.slug === "lucerne-classic")!;
const premium = produits.find((p) => p.slug === "lucerne-premium")!;

const renderSection = (tirage: number | null = 50) =>
  render(
    <DeuxGammes
      classic={{ produit: classic, detail: detailDe(classic), tirage: null }}
      premium={{ produit: premium, detail: detailDe(premium), tirage }}
      locale="fr"
      textes={fr.home.gammes}
    />,
  );

// css: false dans Vitest : la mise en page se vérifie sur les feuilles de style source.
const read = (file: string) => readFileSync(join(__dirname, file), "utf8");
const css = read("DeuxGammes.module.css");
const tsx = read("DeuxGammes.tsx");

describe("[E8-06] Comparaison des gammes : cartes", () => {
  it("affiche Classic en clair puis Premium en sombre", () => {
    renderSection();
    const cartes = screen.getAllByRole("article");
    expect(cartes).toHaveLength(2);
    expect(cartes[0]).toHaveAttribute("data-tone", "light");
    expect(cartes[1]).toHaveAttribute("data-tone", "dark");
    expect(within(cartes[0]).getByText("CLASSIC")).toBeInTheDocument();
    expect(within(cartes[1]).getByText("PREMIUM")).toBeInTheDocument();
  });

  it("titre h2 et section nommée par son titre", () => {
    renderSection();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Une forme, deux matières",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Une forme, deux matières" }),
    ).toBeInTheDocument();
  });

  it("affiche les prix venant des données (centimes)", () => {
    renderSection();
    const [c, p] = screen.getAllByRole("article");
    expect(c).toHaveTextContent("CHF 480.–");
    expect(p).toHaveTextContent(/CHF 1.?240\.–/);
  });
});

describe("[E8-06] Comparaison des gammes : liste de définitions", () => {
  it("chaque carte porte un dl avec pied, finition, tirage, dimensions", () => {
    renderSection();
    for (const carte of screen.getAllByRole("article")) {
      const termes = [...carte.querySelectorAll("dl > div > dt")].map(
        (dt) => dt.textContent,
      );
      expect(termes).toEqual(["Pied", "Finition", "Tirage", "Dimensions"]);
      expect(carte.querySelectorAll("dl > div > dd")).toHaveLength(4);
    }
  });

  it("valeurs issues des données : matières, dimensions, tirage", () => {
    renderSection();
    const [c, p] = screen.getAllByRole("article");
    expect(c).toHaveTextContent("Noyer");
    expect(c).toHaveTextContent("Production continue");
    expect(c).toHaveTextContent("H 42 · Ø 28 cm · E27");
    expect(p).toHaveTextContent("Série numérotée de 50");
  });

  it("masque la ligne Tirage Premium si la taille de série est inconnue", () => {
    renderSection(null);
    const p = screen.getAllByRole("article")[1];
    expect(p).not.toHaveTextContent("Série numérotée");
  });

  it("sans fiche détaillée, pas de dl vide", () => {
    render(
      <DeuxGammes
        classic={{ produit: classic, detail: null, tirage: null }}
        premium={{ produit: premium, detail: null, tirage: null }}
        locale="fr"
        textes={fr.home.gammes}
      />,
    );
    // Seule la ligne Tirage Classic ne dépend pas de la fiche.
    expect(screen.getAllByRole("article")[1].querySelector("dl")).toBeNull();
  });
});

describe("[E8-06] Comparaison des gammes : cartes cliquables et clavier", () => {
  it("un seul lien par carte, vers la fiche du produit", () => {
    renderSection();
    const [c, p] = screen.getAllByRole("article");
    const lc = within(c).getAllByRole("link");
    const lp = within(p).getAllByRole("link");
    expect(lc).toHaveLength(1);
    expect(lp).toHaveLength(1);
    expect(lc[0]).toHaveAttribute("href", "/fr/produits/lucerne-classic");
    expect(lp[0]).toHaveAttribute("href", "/fr/produits/lucerne-premium");
    expect(lc[0]).toHaveAccessibleName(/Voir la Classic.*Lucerne Classic/);
    expect(lp[0]).toHaveAccessibleName(/Choisir ma pièce.*Lucerne Premium/);
  });

  it("le lien couvre la carte entière (::after) et le focus est visible", () => {
    expect(css).toMatch(/\.cta::after\s*{[^}]*inset:\s*0/);
    expect(css).toMatch(/\.carte:has\(\.cta:focus-visible\)\s*{[^}]*outline:/);
  });
});

describe("[E8-06] Comparaison des gammes : aucune valeur en dur, tokens seulement", () => {
  it("le composant n'écrit ni prix ni stock", () => {
    expect(tsx).not.toMatch(/\bCHF\b/);
    for (const montant of ["480", "1240", "124000", "48000"]) {
      expect(tsx).not.toContain(montant);
    }
  });

  it("le CSS n'utilise que des tokens (pas de couleur hexadécimale ni de rayon libre)", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/border-radius:\s*\d/);
  });

  it("deux colonnes dès 900 px, empilées en dessous", () => {
    const base = css.slice(0, css.indexOf("@media"));
    expect(base).toMatch(/\.grille\s*{[^}]*grid-template-columns:\s*1fr;/);
    expect(css.slice(css.indexOf("@media (min-width: 900px)"))).toMatch(
      /repeat\(2,\s*1fr\)/,
    );
  });
});
