import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Manifeste } from "@/components/Manifeste";
import frDict from "@/i18n/dictionaries/fr.json";

// Le hero de l'accueil a été refait par E10-03 (voir e10-03-criteres.test.tsx).
const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("[E8-03] Critère 3 : placeholders conservés tels quels", () => {
  it("garde [PRÉNOM] littéral dans la signature du manifeste", () => {
    expect(frDict.home.manifeste.signature).toContain("[PRÉNOM]");
    render(<Manifeste {...frDict.home.manifeste} />);
    expect(screen.getByText(/\[PRÉNOM\]/)).toBeInTheDocument();
  });

  it("rend la citation complète de la maquette, accent en italique", () => {
    render(<Manifeste {...frDict.home.manifeste} />);
    const quote = screen.getByRole("blockquote");
    expect(quote).toHaveTextContent(
      "On ne fabrique pas une lampe plus vite que le bois ne sèche. Chaque pièce garde la trace de la main qui l'a tournée.",
    );
    expect(quote.querySelector("em")?.textContent).toBe(
      frDict.home.manifeste.accent,
    );
  });

  it("n'altère pas un placeholder passé en prop", () => {
    render(<Manifeste texte="Texte" accent="accent" signature="[PRÉNOM], X" />);
    expect(screen.getByText(/\[PRÉNOM\], X/)).toBeInTheDocument();
  });
});

describe("[E8-03] Homepage et règles du projet", () => {
  it("place le Manifeste juste après le Hero dans la homepage", () => {
    const page = read("app/[locale]/page.tsx");
    const hero = page.indexOf("<Hero");
    const manifeste = page.indexOf("<Manifeste");
    const next = page.indexOf("<Matiere", hero);
    expect(hero).toBeGreaterThan(-1);
    expect(manifeste).toBeGreaterThan(hero);
    expect(manifeste).toBeLessThan(next);
  });

  it("n'utilise ni clamp() ni couleur en dur dans le Manifeste (tokens)", () => {
    const css = read("components/Manifeste.module.css");
    expect(css).not.toMatch(/clamp\(/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(read("styles/tokens.css")).toMatch(/--fs-quote:/);
  });
});
