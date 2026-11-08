import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { Frise } from "./Frise";

// css: false dans Vitest : la mise en page se vérifie sur la feuille de style source.
const css = readFileSync(join(__dirname, "Frise.module.css"), "utf8");

describe("Frise", () => {
  it("affiche le titre et les quatre étapes dans une liste ordonnée", () => {
    render(<Frise textes={frDict.home.frise} />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Quatre gestes/ }),
    ).toBeInTheDocument();
    const liste = screen.getByRole("list");
    expect(liste.tagName).toBe("OL");
    const items = within(liste).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("01");
    expect(items[3]).toHaveTextContent("04");
    for (const item of items) {
      expect(
        within(item).getByRole("heading", { level: 3 }),
      ).toBeInTheDocument();
    }
  });

  it("garde les durées en placeholders tant que le client ne les a pas données", () => {
    render(<Frise textes={frDict.home.frise} />);
    expect(screen.getByText("[DURÉE DE SÉCHAGE]")).toBeInTheDocument();
    expect(screen.getByText("[HEURES AU TOUR]")).toBeInTheDocument();
    expect(screen.getByText("[NOMBRE DE COUCHES]")).toBeInTheDocument();
  });

  it("affiche la lampe allumée et la citation", () => {
    render(<Frise textes={frDict.home.frise} />);
    expect(screen.getByRole("img", { name: /allumée/ })).toBeInTheDocument();
    expect(
      screen.getByText(/prend la couleur de la flamme/),
    ).toBeInTheDocument();
  });

  it("empile les étapes verticalement sur mobile, en ligne dès 800 px", () => {
    const base = css.split("@media")[0];
    expect(base).toMatch(/\.etapes\s*{[^}]*flex-direction:\s*column/);
    expect(css).toMatch(
      /@media \(min-width: 800px\)[\s\S]*\.etapes\s*{[^}]*flex-direction:\s*row/,
    );
  });
});
