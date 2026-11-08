import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { Frise } from "./Frise";

// Critères d'acceptation du ticket E9-05 (#301), vérifiés indépendamment de l'implémentation.
// Vitest tourne avec css: false : les critères CSS se vérifient sur la source.
const css = readFileSync(join(__dirname, "Frise.module.css"), "utf8");

/** Blocs `@media (...) { ... }` de premier niveau, avec leur condition. */
function medias(source: string) {
  const out: { condition: string; corps: string }[] = [];
  const re = /@media\s*([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 1;
    let i = re.lastIndex;
    while (depth > 0 && i < source.length) {
      if (source[i] === "{") depth++;
      if (source[i] === "}") depth--;
      i++;
    }
    out.push({
      condition: m[1].trim(),
      corps: source.slice(re.lastIndex, i - 1),
    });
    re.lastIndex = i;
  }
  return out;
}

/** CSS hors de tout bloc @media / @supports / @keyframes (règles de base = mobile). */
function base(source: string) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (source[i] === "@") {
      i = source.indexOf("{", i);
      let d = 1;
      i++;
      while (d > 0 && i < source.length) {
        if (source[i] === "{") d++;
        if (source[i] === "}") d--;
        i++;
      }
      continue;
    }
    out += source[i++];
  }
  return out;
}

describe("E9-05 Frise : critères d'acceptation", () => {
  describe("mobile (< 800 px) : frise verticale sans sticky", () => {
    const mobile = base(css);

    it("aucun position: sticky dans les règles de base (mobile)", () => {
      expect(mobile).not.toMatch(/position:\s*sticky/);
    });

    it("aucune hauteur de piste imposée en mobile", () => {
      expect(mobile).not.toMatch(/\.piste\s*\{[^}]*height:/);
    });

    it("étapes empilées et filet vertical par défaut", () => {
      expect(mobile).toMatch(/\.etapes\s*\{[^}]*flex-direction:\s*column/);
      expect(mobile).toMatch(/\.filet\s*\{[^}]*width:\s*1px/);
    });

    it("le sticky n'existe que dans une media query min-width: 800px", () => {
      const avecSticky = medias(css).filter((m) =>
        /position:\s*sticky/.test(m.corps),
      );
      expect(avecSticky.length).toBeGreaterThan(0);
      for (const m of avecSticky) {
        expect(m.condition).toMatch(/min-width:\s*800px/);
        expect(m.condition).not.toMatch(/max-width/);
      }
    });

    it("le sticky est désactivé sous prefers-reduced-motion", () => {
      const avecSticky = medias(css).filter((m) =>
        /position:\s*sticky/.test(m.corps),
      );
      for (const m of avecSticky) {
        expect(m.condition).toMatch(/prefers-reduced-motion:\s*no-preference/);
      }
    });

    it("aucun point de rupture à 900 px ne subsiste dans la frise", () => {
      expect(css).not.toMatch(/900px/);
    });

    it("étapes révélées une à une : un état « à venir » est défini pour le repli", () => {
      expect(css).toMatch(/data-etat="a-venir"/);
    });

    it("étapes révélées une à une : animation d'entrée par étape (view())", () => {
      expect(css).toMatch(/animation-timeline:\s*view\(\)/);
    });
  });

  describe("liste ordonnée inchangée pour les lecteurs d'écran", () => {
    it("un seul ol, nommé, avec quatre li dans l'ordre du dictionnaire", () => {
      const { container } = render(<Frise textes={frDict.home.frise} />);
      expect(container.querySelectorAll("ol")).toHaveLength(1);
      const liste = screen.getByRole("list", {
        name: frDict.home.frise.etapesLabel,
      });
      const items = within(liste).getAllByRole("listitem");
      expect(items).toHaveLength(4);
      items.forEach((item, i) => {
        expect(
          within(item).getByRole("heading", {
            level: 3,
            name: frDict.home.frise.etapes[i].titre,
          }),
        ).toBeInTheDocument();
      });
    });

    it("les li sont les seuls enfants directs de l'ol (pas de jalon dans la liste)", () => {
      const { container } = render(<Frise textes={frDict.home.frise} />);
      const ol = container.querySelector("ol");
      expect(ol).not.toBeNull();
      for (const enfant of Array.from(ol!.children)) {
        expect(enfant.tagName).toBe("LI");
      }
    });

    it("trait, puces et jalons décoratifs sont masqués aux lecteurs d'écran", () => {
      const { container } = render(<Frise textes={frDict.home.frise} />);
      const jalons = container.querySelectorAll("[data-jalon]");
      expect(jalons.length).toBeGreaterThan(0);
      for (const j of Array.from(jalons)) {
        expect(j).toHaveAttribute("aria-hidden", "true");
        expect(j).toBeEmptyDOMElement();
      }
      const puces = container.querySelectorAll("ol > li > span");
      expect(puces).toHaveLength(4);
      for (const p of Array.from(puces)) {
        expect(p).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("le contenu texte des étapes reste présent et lisible (rien n'est retiré du DOM)", () => {
      render(<Frise textes={frDict.home.frise} />);
      for (const etape of frDict.home.frise.etapes) {
        expect(screen.getByText(etape.texte)).toBeInTheDocument();
        expect(screen.getByText(etape.duree)).toBeInTheDocument();
      }
    });
  });

  describe("pas de CLS", () => {
    const proprietesAutorisees = new Set(["transform", "opacity"]);

    it("les keyframes ne touchent que transform et opacity", () => {
      const re = /@keyframes\s+[\w-]+\s*\{/g;
      let compte = 0;
      while (re.exec(css)) {
        let depth = 1;
        let i = re.lastIndex;
        while (depth > 0 && i < css.length) {
          if (css[i] === "{") depth++;
          if (css[i] === "}") depth--;
          i++;
        }
        const corps = css.slice(re.lastIndex, i - 1);
        const props = Array.from(corps.matchAll(/([\w-]+)\s*:/g)).map(
          (x) => x[1],
        );
        for (const p of props) expect(proprietesAutorisees).toContain(p);
        compte++;
      }
      expect(compte).toBeGreaterThan(0);
    });

    it("les transitions ne portent que sur transform et opacity", () => {
      const transitions = Array.from(
        css.matchAll(/transition:\s*([^;]+);/g),
      ).map((x) => x[1]);
      expect(transitions.length).toBeGreaterThan(0);
      for (const t of transitions) {
        const props = t
          .split(",")
          .map((part) => part.trim().split(/\s+/)[0])
          .filter(Boolean);
        for (const p of props) expect(proprietesAutorisees).toContain(p);
      }
      expect(css).not.toMatch(/transition:\s*all/);
      expect(css).not.toMatch(/transition-property:\s*(?!transform|opacity)/);
    });

    it("la hauteur de la piste est fixée par le CSS dès le premier rendu (pas de saut)", () => {
      const avecHauteur = medias(css).filter((m) =>
        /\.piste\s*\{[^}]*height:\s*\d+vh/.test(m.corps),
      );
      expect(avecHauteur.length).toBeGreaterThan(0);
    });

    it("le composant client ne pose que des attributs et variables CSS, jamais de dimensions", () => {
      const src = readFileSync(join(__dirname, "FriseDefilement.tsx"), "utf8");
      expect(src).not.toMatch(
        /style\.(height|width|top|left|margin|padding|minHeight)\s*=/,
      );
      expect(src).not.toMatch(/setProperty\(\s*["'](height|width|top|left)/);
    });

    it("état initial sans JS : tout allumé (aucune étape masquée ni décalée)", () => {
      const mobile = base(css);
      expect(mobile).not.toMatch(/^\.etape\s*\{[^}]*opacity:/m);
      expect(mobile).not.toMatch(
        /^\.etape\s*\{[^}]*(display:\s*none|visibility:\s*hidden)/m,
      );
    });
  });

  it("charte : aucune couleur en dur dans la frise", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });
});
