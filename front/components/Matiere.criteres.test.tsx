/**
 * Tests indépendants du ticket E8-04 (#259), écrits à partir de ses critères
 * d'acceptation et de la maquette docs/maquette-atelier/accueil.html.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { matiereAccueil } from "@/mocks/data";
import { Matiere } from "./Matiere";

const css = readFileSync(join(__dirname, "Matiere.module.css"), "utf8");
const props = frDict.home.matiere;

/** Contenu d'une règle @media (prefers-reduced-motion: reduce), accolades équilibrées. */
function bloc(source: string, debut: string): string {
  const i = source.indexOf(debut);
  if (i < 0) return "";
  let profondeur = 0;
  for (let j = source.indexOf("{", i); j < source.length; j++) {
    if (source[j] === "{") profondeur++;
    if (source[j] === "}" && --profondeur === 0) {
      return source.slice(source.indexOf("{", i) + 1, j);
    }
  }
  return "";
}

describe("E8-04 — Conforme à la maquette", () => {
  it("texte d'introduction identique à celui de la maquette, à côté du titre", () => {
    const { container } = render(
      <Matiere contenu={matiereAccueil} {...props} />,
    );
    const intro = screen.getByText(
      "Deux matières, choisies pour vieillir ensemble. Le noyer fonce et se patine, le laiton se voile doucement.",
    );
    const titre = screen.getByRole("heading", { level: 2 });
    expect(intro.parentElement).toBe(titre.parentElement?.parentElement);
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-labelledby",
      titre.id,
    );
  });

  it("les trois gros plans sont frères, dans une même liste ordonnée", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    const figures = screen.getAllByRole("figure");
    expect(figures).toHaveLength(3);
    const [premiere, deuxieme, troisieme] = figures;
    expect(within(premiere).getByRole("img")).toHaveAttribute(
      "alt",
      "Grain de noyer huilé, gros plan",
    );
    const liste = premiere.closest("ol");
    expect(liste).not.toBeNull();
    expect(deuxieme.closest("ol")).toBe(liste);
    expect(troisieme.closest("ol")).toBe(liste);
  });

  it("n'affiche que 3 figures même si l'API en renvoie 4", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    expect(matiereAccueil.gros_plans).toHaveLength(4);
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.queryByText("Finition")).not.toBeInTheDocument();
  });

  it("légendes numérotées I à III, nom latin en italique sur le I seulement", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    const [grande, petite1, petite2] = screen.getAllByRole("figure");
    const legende = (f: HTMLElement) =>
      f.querySelector("figcaption")?.textContent;
    expect(legende(grande)).toBe("I · Noyer — Juglans regia");
    expect(legende(petite1)).toBe("II · Laiton");
    expect(legende(petite2)).toBe("III · Assemblage");

    const latin = within(grande).getByText("Juglans regia");
    expect(latin.tagName).toBe("EM");
    expect(within(petite1).queryByText("Juglans regia")).toBeNull();
    expect(within(petite2).queryByText("Juglans regia")).toBeNull();
  });

  it("la légende de chaque figure reprend celle fournie par l'API", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    const figures = screen.getAllByRole("figure");
    ["Noyer", "Laiton", "Assemblage"].forEach((legende, i) => {
      expect(figures[i]).toHaveTextContent(legende);
    });
  });

  it("la mise en page reprend la maquette (3 colonnes égales, 520 px de haut) et s'empile sur mobile", () => {
    expect(css).toMatch(/repeat\(3, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/height:\s*32\.5rem/);
    expect(css.split("@media")[0]).toMatch(
      /\.grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/,
    );
  });

  it("n'utilise que des tokens du brief : pas de couleur ou de police en dur", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|hsl)a?\(/);
    expect(css).not.toMatch(/font-family:\s*(?!var\()\S/);
    expect(css).not.toMatch(/border-radius:\s*(?!var\()\S/);
  });
});

describe("E8-04 — Effet de survol et prefers-reduced-motion", () => {
  it("zoome le grain au survol ET au focus clavier", () => {
    expect(css).toMatch(
      /\.figure:hover \.image,\s*\.figure:focus-within \.image\s*\{[^}]*transform:\s*scale\(1\.\d+\)/,
    );
  });

  it("les figures sont focusables pour que le zoom suive le clavier", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    for (const figure of screen.getAllByRole("figure")) {
      expect(figure).toHaveAttribute("tabindex", "0");
    }
  });

  it("le zoom reste léger (échelle ≤ 1.1)", () => {
    const echelle = Number(/scale\((\d+(?:\.\d+)?)\)/.exec(css)?.[1]);
    expect(echelle).toBeGreaterThan(1);
    expect(echelle).toBeLessThanOrEqual(1.1);
  });

  it("avec prefers-reduced-motion: reduce, plus de transition ni de transformation au survol/focus", () => {
    const reduit = bloc(css, "@media (prefers-reduced-motion: reduce)");
    expect(reduit).not.toBe("");
    expect(reduit).toMatch(/\.image\s*\{[^}]*transition:\s*none/);
    expect(reduit).toMatch(
      /\.figure:hover \.image,\s*\.figure:focus-within \.image\s*\{[^}]*transform:\s*none/,
    );
  });

  it("le zoom n'est pas conditionné par prefers-reduced-motion: no-preference à l'envers (règle de base présente hors media)", () => {
    const horsMedia = css.replace(
      bloc(css, "@media (prefers-reduced-motion: reduce)"),
      "",
    );
    expect(horsMedia).toMatch(/\.figure:hover \.image/);
  });
});

describe("E8-04 — Alt descriptifs sur chaque image", () => {
  it("chaque image rendue a un alt non vide, descriptif et distinct", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    const alts = screen.getAllByRole("img").map((i) => i.getAttribute("alt"));
    for (const alt of alts) {
      expect(alt).toBeTruthy();
      expect((alt ?? "").trim().split(/\s+/).length).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(alts).size).toBe(alts.length);
  });

  it("les alts viennent de l'API, pas de la légende", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    for (const { legende, image } of matiereAccueil.gros_plans.slice(0, 3)) {
      expect(image.alt).not.toBe(legende);
      expect(screen.getByAltText(image.alt)).toBeInTheDocument();
    }
  });

  it("les données de démonstration (mocks) ont un alt descriptif pour les 4 gros plans", () => {
    for (const { image } of matiereAccueil.gros_plans) {
      expect(image.alt.trim().split(/\s+/).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("les fichiers WebP référencés par les mocks existent", () => {
    for (const { image } of matiereAccueil.gros_plans) {
      for (const source of image.sources) {
        expect(existsSync(join(__dirname, "..", "public", source.url))).toBe(
          true,
        );
      }
    }
  });
});

describe("E8-04 — Intégration à l'accueil", () => {
  it("la page d'accueil passe les textes du dictionnaire à Matiere", () => {
    const page = readFileSync(
      join(__dirname, "..", "app", "[locale]", "page.tsx"),
      "utf8",
    );
    expect(page).toMatch(
      /<Matiere\s+contenu=\{matiere\.data\}\s+\{\.\.\.home\.matiere\}/,
    );
  });
});
