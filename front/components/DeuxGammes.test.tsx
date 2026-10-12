import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { produits } from "@/mocks/data";
import { DeuxGammes } from "./DeuxGammes";

const classic = produits.find((p) => p.slug === "lucerne-classic")!;
const premium = produits.find((p) => p.slug === "lucerne-premium")!;

const renderSection = () =>
  render(
    <DeuxGammes
      classic={classic}
      premium={premium}
      locale="fr"
      title={fr.home.gammes.title}
      intro={fr.home.gammes.intro}
    />,
  );

// css: false dans Vitest : la mise en page se vérifie sur les feuilles de style source.
const read = (file: string) => readFileSync(join(__dirname, file), "utf8");
const tsx = read("DeuxGammes.tsx");
const css = read("DeuxGammes.module.css");
const cardCss = read("ProductCard.module.css");

describe("[E3-03] Deux gammes : uniquement ProductCard", () => {
  it("affiche deux ProductCard, Classic puis Premium", () => {
    renderSection();
    const cartes = screen.getAllByRole("article");
    expect(cartes).toHaveLength(2);
    expect(cartes[0]).toHaveAttribute("data-tone", "light");
    expect(cartes[1]).toHaveAttribute("data-tone", "dark");
    expect(within(cartes[0]).getAllByText("Classic")[0]).toBeInTheDocument();
    expect(within(cartes[1]).getAllByText("Premium")[0]).toBeInTheDocument();
  });

  it("montre le même modèle dans les deux cartes, avec un lien chacune", () => {
    renderSection();
    const liens = screen.getAllByRole("link");
    expect(liens).toHaveLength(2);
    for (const lien of liens) expect(lien).toHaveTextContent("Lucerne");
  });

  it("n'importe que ProductCard / ProductCardGrid comme carte (aucune variante locale)", () => {
    const imports = [...tsx.matchAll(/from "(\.\/[^"]+)"/g)].map((m) => m[1]);
    expect(imports).toContain("./ProductCard");
    expect(tsx).not.toMatch(/<article/);
    expect(tsx).not.toMatch(/<img/);
  });

  it("le CSS local ne redéfinit pas l'apparence des cartes", () => {
    expect(css).not.toMatch(/\.(card|premium|classic)\b/);
    expect(css).not.toMatch(/\b(background|border|border-radius):/);
    expect(cardCss).toMatch(/\.card\b/);
  });
});

describe("[E3-03] Deux gammes : message « mêmes formes, matières différentes »", () => {
  it("le dictionnaire contient la phrase", () => {
    expect(fr.home.gammes.intro.toLowerCase()).toContain(
      "mêmes formes, matières différentes",
    );
  });

  it("affiche le titre (h2) et la phrase d'explication", () => {
    renderSection();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Deux gammes, une même forme",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/mêmes formes, matières différentes/i),
    ).toBeVisible();
  });

  it("la section est nommée par son titre", () => {
    renderSection();
    expect(
      screen.getByRole("region", { name: "Deux gammes, une même forme" }),
    ).toBeInTheDocument();
  });
});

describe("[E3-03] Deux gammes : empilement mobile (feuille de style)", () => {
  const base = (source: string) => source.slice(0, source.indexOf("@media"));

  it("la grille de base est à 1 colonne (empilées sous 600 px)", () => {
    expect(base(cardCss)).toMatch(
      /\.grid\s*{[^}]*grid-template-columns:\s*1fr;/,
    );
  });

  it("DeuxGammes ne modifie les colonnes qu'à partir de 900 px", () => {
    expect(base(css)).not.toMatch(/grid-template-columns/);
    const media = css.slice(css.indexOf("@media (min-width: 900px)"));
    expect(media).toMatch(/repeat\(2,\s*1fr\)/);
    expect(css.match(/@media/g)).toHaveLength(1);
  });
});
