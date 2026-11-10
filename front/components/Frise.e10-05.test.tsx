/**
 * Tests indépendants du ticket E10-05 (#348), écrits à partir de ses critères :
 * liste ordonnée sémantique, chiffres romains I à IV, reduced-motion, empilé sur mobile.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { Frise } from "./Frise";

const css = readFileSync(join(__dirname, "Frise.module.css"), "utf8");
const textes = frDict.home.frise;

afterEach(() => vi.unstubAllGlobals());

describe("E10-05 — Frise : liste ordonnée sémantique", () => {
  it("les étapes sont les items d'un unique <ol> nommé", () => {
    const { container } = render(<Frise textes={textes} />);
    expect(container.querySelectorAll("ol")).toHaveLength(1);
    expect(container.querySelectorAll("ol > li")).toHaveLength(
      textes.etapes.length,
    );
    expect(screen.getByRole("list", { name: textes.etapesLabel })).toBe(
      container.querySelector("ol"),
    );
  });

  it("chaque étape garde un titre de niveau 3", () => {
    render(<Frise textes={textes} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(
      textes.etapes.length,
    );
  });

  it("numéros en chiffres romains I à IV, dans l'ordre", () => {
    const { container } = render(<Frise textes={textes} />);
    const items = Array.from(container.querySelectorAll("ol > li"));
    expect(items).toHaveLength(4);
    items.forEach((li, i) => {
      expect(li.querySelector("p")?.textContent).toBe(
        ["I", "II", "III", "IV"][i],
      );
    });
  });

  it("le numéro décoratif est masqué aux lecteurs d'écran (la liste porte déjà l'ordre)", () => {
    const { container } = render(<Frise textes={textes} />);
    expect(container.querySelector("ol > li p")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("E10-05 — Frise : reduced-motion respecté", () => {
  it("les animations liées au défilement ne s'appliquent que sans reduced-motion", () => {
    const debut = css.indexOf("@supports (animation-timeline: view())");
    expect(debut).toBeGreaterThan(-1);
    const bloc = css.slice(debut, css.indexOf("@keyframes"));
    const horsMedia = bloc.replace(
      /@media \(prefers-reduced-motion: no-preference\)[\s\S]*$/,
      "",
    );
    expect(bloc).toMatch(/@media \(prefers-reduced-motion: no-preference\)/);
    expect(horsMedia).not.toMatch(/animation(-name)?:/);
  });

  it("le mode sticky n'est actif que sans reduced-motion", () => {
    expect(css).toMatch(
      /@media \(min-width: 800px\) and \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*?position:\s*sticky/,
    );
    const avant = css.slice(
      0,
      css.indexOf(
        "@media (min-width: 800px) and (prefers-reduced-motion: no-preference)",
      ),
    );
    expect(avant).not.toMatch(/position:\s*sticky/);
  });

  it("état final statique par défaut : trait plein, étapes pleinement opaques", () => {
    const base = css.split("@media")[0];
    expect(base).toMatch(/\.trait\s*\{[^}]*background:\s*var\(--brass\)/);
    expect(base).not.toMatch(/\.etape\s*\{[^}]*opacity:\s*0/);
  });

  it("avec reduced-motion, le repli JS ne masque aucune étape", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));
    const { container } = render(<Frise textes={textes} />);
    expect(container.querySelector("[data-mode]")).toBeNull();
    for (const li of container.querySelectorAll("ol > li")) {
      expect(li).not.toHaveAttribute("data-etat");
    }
  });
});

describe("E10-05 — Frise : empilé sur mobile", () => {
  it("étapes en colonne et filet vertical par défaut", () => {
    const base = css.split("@media")[0];
    expect(base).toMatch(/\.etapes\s*\{[^}]*flex-direction:\s*column/);
    expect(base).toMatch(/\.filet\s*\{[^}]*width:\s*1px/);
  });

  it("la disposition en ligne n'arrive qu'à partir de 800 px", () => {
    const apres = css.slice(css.indexOf("@media (min-width: 800px)"));
    expect(apres).toMatch(/\.etapes\s*\{[^}]*flex-direction:\s*row/);
  });
});
