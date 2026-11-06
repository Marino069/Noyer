import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { Frise } from "./Frise";

// Critères d'acceptation du ticket E8-05 (#260), vérifiés indépendamment de l'implémentation.
const css = readFileSync(join(__dirname, "Frise.module.css"), "utf8");
const base = css.split("@media")[0];

describe("E8-05 Frise : critères d'acceptation", () => {
  it("liste ordonnée sémantique : un seul ol, quatre li, nommé", () => {
    const { container } = render(<Frise textes={frDict.home.frise} />);
    expect(container.querySelectorAll("ol")).toHaveLength(1);
    expect(container.querySelectorAll("ol > li")).toHaveLength(4);
    expect(
      screen.getByRole("list", { name: frDict.home.frise.etapesLabel }),
    ).toBeInTheDocument();
  });

  it("chaque étape a un numéro, un titre, un texte et une ligne de durée", () => {
    render(<Frise textes={frDict.home.frise} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    items.forEach((item, i) => {
      expect(item).toHaveTextContent(`0${i + 1}`);
      const etape = frDict.home.frise.etapes[i];
      expect(item).toHaveTextContent(etape.titre);
      expect(item).toHaveTextContent(etape.texte);
      expect(item).toHaveTextContent(etape.duree);
    });
  });

  it("durées en placeholders [DURÉE…] : aucune durée chiffrée inventée", () => {
    const durees = frDict.home.frise.etapes.slice(0, 3).map((e) => e.duree);
    for (const d of durees) expect(d).toMatch(/^\[[A-ZÉ ]+\]$/);
    render(<Frise textes={frDict.home.frise} />);
    for (const d of durees) expect(screen.getByText(d)).toBeInTheDocument();
  });

  it("mobile : étapes empilées et filet vertical par défaut", () => {
    expect(base).toMatch(/\.etapes\s*\{[^}]*flex-direction:\s*column/);
    expect(base).toMatch(/\.filet\s*\{[^}]*width:\s*1px/);
    expect(base).toMatch(/\.filet\s*\{[^}]*bottom:\s*0/);
  });

  it("desktop : filet horizontal dès 900 px", () => {
    const desktop = css.slice(css.indexOf("@media (min-width: 900px)"));
    expect(desktop).toMatch(/\.filet\s*\{[^}]*height:\s*1px/);
  });

  it("le composant prend ses textes en props (réutilisable)", () => {
    const textes = { ...frDict.home.frise, titre: "Autre titre," };
    render(<Frise textes={textes} />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Autre titre,/ }),
    ).toBeInTheDocument();
  });

  it("n'utilise aucune couleur en dur (tokens du brief uniquement)", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
