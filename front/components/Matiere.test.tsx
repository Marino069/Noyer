import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
    { legende: "Huile", image: image("Finition huilée, gros plan", 3) },
    { legende: "Lin", image: image("Câble gainé de lin, gros plan", 4) },
  ],
};

// css: false dans Vitest : la mise en page se vérifie sur la feuille de style source.
const css = readFileSync(join(__dirname, "Matiere.module.css"), "utf8");
const mediaBlock = (minWidth: number) => {
  const start = css.indexOf(`@media (min-width: ${minWidth}px)`);
  return start === -1 ? "" : css.slice(start);
};

describe("Matiere", () => {
  it("affiche le titre et 4 gros plans", () => {
    render(<Matiere contenu={contenu} />);
    expect(
      screen.getByRole("heading", { name: "La matière" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("list")).getAllByRole("listitem"),
    ).toHaveLength(4);
  });

  it("donne à chaque image l'alt descriptif fourni par l'API", () => {
    render(<Matiere contenu={contenu} />);
    for (const { image: img } of contenu.gros_plans) {
      expect(screen.getByAltText(img.alt)).toBeInTheDocument();
    }
    expect(
      screen.getByAltText("Grain de noyer huilé, gros plan"),
    ).toBeInTheDocument();
  });

  it("charge toutes les images en lazy loading", () => {
    render(<Matiere contenu={contenu} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(4);
    for (const img of imgs) expect(img).toHaveAttribute("loading", "lazy");
  });

  it("fournit un srcset trié et des dimensions (pas de décalage de mise en page)", () => {
    render(<Matiere contenu={contenu} />);
    const img = screen.getByAltText("Grain de noyer huilé, gros plan");
    expect(img.getAttribute("srcset")).toBe(
      "/m/1-480.webp 480w, /m/1-960.webp 960w, /m/1-1600.webp 1600w",
    );
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "2000");
  });

  it("affiche une légende par gros plan", () => {
    render(<Matiere contenu={contenu} />);
    for (const { legende } of contenu.gros_plans) {
      expect(screen.getByText(legende)).toBeInTheDocument();
    }
  });

  describe("grille responsive (feuille de style)", () => {
    it("4 colonnes dès 900 px", () => {
      expect(mediaBlock(900)).toMatch(/repeat\(4,\s*1fr\)/);
    });

    it("2 colonnes dès 600 px", () => {
      expect(mediaBlock(600)).toMatch(/repeat\(2,\s*1fr\)/);
    });

    it("défilement horizontal avec accroche en dessous de 600 px", () => {
      const base = css.slice(0, css.indexOf("@media"));
      expect(base).toMatch(/overflow-x:\s*auto/);
      expect(base).toMatch(/scroll-snap-type:\s*x mandatory/);
    });
  });
});
