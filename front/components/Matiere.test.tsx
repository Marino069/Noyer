import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import type { MatiereAccueil } from "@/lib/api/types";
import { Matiere } from "./Matiere";

const image = (alt: string, n: number) => ({
  alt,
  largeur_origine: 1600,
  hauteur_origine: 2000,
  sources: [
    { largeur: 960 as const, url: `/m/${n}-960.webp` },
    { largeur: 480 as const, url: `/m/${n}-480.webp` },
    { largeur: 1600 as const, url: `/m/${n}-1600.webp` },
  ],
});

const contenu: MatiereAccueil = {
  titre: "La matière",
  gros_plans: [
    { legende: "Noyer", image: image("Grain de noyer huilé, gros plan", 1) },
    { legende: "Laiton", image: image("Laiton brossé, gros plan", 2) },
    { legende: "Assemblage", image: image("Assemblage, gros plan", 3) },
    { legende: "Finition", image: image("Finition huilée, gros plan", 4) },
  ],
};

const props = frDict.home.matiere;

// css: false dans Vitest : la mise en page se vérifie sur la feuille de style source.
const css = readFileSync(join(__dirname, "Matiere.module.css"), "utf8");

describe("Matiere", () => {
  it("affiche le titre et le texte d'introduction", () => {
    render(<Matiere contenu={contenu} {...props} />);
    expect(
      screen.getByRole("heading", { name: "La matière" }),
    ).toBeInTheDocument();
    expect(screen.getByText(props.intro)).toBeInTheDocument();
  });

  it("affiche le surtitre et trois gros plans dans une liste ordonnée", () => {
    render(<Matiere contenu={contenu} {...props} />);
    expect(screen.getByText("La matière", { selector: "p" })).toBeVisible();
    const liste = screen.getByRole("list");
    expect(liste.tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("figure")).toHaveLength(3);
  });

  it("affiche trois figures", () => {
    render(<Matiere contenu={contenu} {...props} />);
    expect(screen.getAllByRole("figure")).toHaveLength(3);
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("numérote les légendes et affiche le nom latin du noyer", () => {
    render(<Matiere contenu={contenu} {...props} />);
    const legendes = screen
      .getAllByRole("figure")
      .map((f) => f.querySelector("figcaption")?.textContent);
    expect(legendes).toEqual([
      "I · Noyer — Juglans regia",
      "II · Laiton",
      "III · Assemblage",
    ]);
    expect(screen.getByText("Juglans regia")).toBeInTheDocument();
  });

  it("donne à chaque image l'alt descriptif fourni par l'API", () => {
    render(<Matiere contenu={contenu} {...props} />);
    for (const { image: img } of contenu.gros_plans.slice(0, 3)) {
      expect(screen.getByAltText(img.alt)).toBeInTheDocument();
    }
    for (const img of screen.getAllByRole("img")) {
      expect(img.getAttribute("alt")?.length).toBeGreaterThan(10);
    }
  });

  it("charge les images en lazy loading, avec srcset trié et dimensions", () => {
    render(<Matiere contenu={contenu} {...props} />);
    for (const img of screen.getAllByRole("img")) {
      expect(img).toHaveAttribute("loading", "lazy");
    }
    const img = screen.getByAltText("Grain de noyer huilé, gros plan");
    expect(img.getAttribute("srcset")).toBe(
      "/m/1-480.webp 480w, /m/1-960.webp 960w, /m/1-1600.webp 1600w",
    );
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "2000");
  });

  describe("feuille de style", () => {
    it("empile les gros plans sur mobile, trois colonnes égales dès 900 px", () => {
      const base = css.split("@media")[0];
      expect(base).toMatch(
        /\.grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s*;/,
      );
      expect(css).toMatch(
        /@media \(min-width: 900px\)\s*\{\s*\.grid\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/,
      );
    });

    it("zoome le grain au survol et au focus", () => {
      expect(css).toMatch(/\.figure:hover \.image/);
      expect(css).toMatch(/\.figure:focus-within \.image/);
      expect(css).toMatch(/transform:\s*scale\(/);
    });

    it("désactive le zoom avec prefers-reduced-motion", () => {
      const bloc = css.slice(css.indexOf("@media (prefers-reduced-motion"));
      expect(bloc).toMatch(/transition:\s*none/);
      expect(bloc).toMatch(/\.figure:hover \.image/);
      expect(bloc).toMatch(/transform:\s*none/);
    });
  });
});
