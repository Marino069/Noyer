import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RevelationTitres } from "./RevelationTitres";

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }));

const racine = join(__dirname, "..");
// Commentaires retirés : ils peuvent citer les propriétés qu'on cherche.
const css = readFileSync(join(racine, "styles/globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Extrait le bloc `{ ... }` qui suit la première occurrence de `debut`. */
function bloc(source: string, debut: string): string {
  const i = source.indexOf(debut);
  if (i < 0) return "";
  const ouvre = source.indexOf("{", i);
  let profondeur = 0;
  for (let j = ouvre; j < source.length; j++) {
    if (source[j] === "{") profondeur++;
    if (source[j] === "}" && --profondeur === 0) {
      return source.slice(ouvre + 1, j);
    }
  }
  return "";
}

function installer(top: number, reduit = false) {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reduit && q.includes("reduce"),
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
  } as DOMRect);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("E9-06 – le texte reste un seul titre dans le DOM", () => {
  it("h1 et h2 sous la ligne de flottaison : un seul élément chacun, sans enfant", () => {
    installer(5000);
    const { container } = render(
      <>
        <main>
          <h1>Lampes artisanales de Genève</h1>
          <h2>Noyer massif, tourné à la main</h2>
        </main>
        <RevelationTitres />
      </>,
    );
    for (const sel of ["h1", "h2"]) {
      const els = container.querySelectorAll(sel);
      expect(els).toHaveLength(1);
      expect(els[0].children).toHaveLength(0);
    }
    expect(container.querySelector("h1")!.textContent).toBe(
      "Lampes artisanales de Genève",
    );
    expect(container.querySelector("h2")!.textContent).toBe(
      "Noyer massif, tourné à la main",
    );
  });

  it("un titre déjà visible n'est jamais masqué", () => {
    installer(100);
    const { container } = render(
      <>
        <main>
          <h1>Visible</h1>
        </main>
        <RevelationTitres />
      </>,
    );
    expect(container.querySelector("h1")!.hasAttribute("data-titre")).toBe(
      false,
    );
  });

  it("ne touche pas aux titres hors de main", () => {
    installer(5000);
    const { container } = render(
      <>
        <header>
          <h2>Hors main</h2>
        </header>
        <main />
        <RevelationTitres />
      </>,
    );
    expect(container.querySelector("h2")!.hasAttribute("data-titre")).toBe(
      false,
    );
  });

  it("retire l'attribut au démontage (le titre redevient visible)", () => {
    installer(5000);
    const { container, unmount } = render(
      <>
        <main>
          <h2>Titre</h2>
        </main>
        <RevelationTitres />
      </>,
    );
    const h2 = container.querySelector("h2")!;
    expect(h2.dataset.titre).toBe("attente");
    unmount();
    expect(h2.hasAttribute("data-titre")).toBe(false);
  });

  it("sans IntersectionObserver, rien n'est masqué", () => {
    installer(5000);
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(
      <>
        <main>
          <h2>Titre</h2>
        </main>
        <RevelationTitres />
      </>,
    );
    expect(container.querySelector("h2")!.hasAttribute("data-titre")).toBe(
      false,
    );
  });

  it("CSS : h1 et h2 sont masqués seulement hors reduced-motion", () => {
    const masque = bloc(css, "@media (prefers-reduced-motion: no-preference)");
    expect(masque).toContain('h1[data-titre="attente"]');
    expect(masque).toContain('h2[data-titre="attente"]');
    expect(css.replace(masque, "")).not.toMatch(
      /\[data-titre="attente"\]\s*[,{]/,
    );
  });
});

describe("E9-06 – parallaxe CSS liée au défilement, off sur mobile et reduced-motion", () => {
  const parallaxe = bloc(
    css,
    "@media (min-width: 900px) and (prefers-reduced-motion: no-preference)",
  );

  it("animation-timeline: view() n'existe que dans le media query desktop + no-preference", () => {
    expect(parallaxe).toContain("animation-timeline: view()");
    expect(css.replace(parallaxe, "")).not.toContain("animation-timeline");
  });

  it("la règle img[data-parallaxe] n'existe que dans ce media query", () => {
    expect(parallaxe).toContain("img[data-parallaxe]");
    expect(css.replace(parallaxe, "")).not.toMatch(
      /img\[data-parallaxe\]\s*\{/,
    );
  });

  it("garde @supports : sans support, l'image reste fixe", () => {
    expect(parallaxe).toMatch(/@supports \(animation-timeline: view\(\)\)/);
  });

  it("pas de JS de défilement pour la parallaxe", () => {
    const src = readFileSync(
      join(racine, "components/RevelationTitres.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/addEventListener\(\s*["']scroll/);
    expect(src).not.toContain("requestAnimationFrame");
  });

  it("l'image du hero porte data-parallaxe", () => {
    const hero = readFileSync(join(racine, "components/Hero.tsx"), "utf8");
    expect(hero).toContain("data-parallaxe");
  });

  it("amplitude ≤ 40 px", () => {
    const keyframes = bloc(css, "@keyframes parallaxe-image");
    const v = [...keyframes.matchAll(/translateY\((-?\d+(?:\.\d+)?)px\)/g)].map(
      (m) => Number(m[1]),
    );
    expect(v.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(40);
  });
});

describe("E9-06 – intégration", () => {
  it("RevelationTitres est monté dans le layout", () => {
    const layout = readFileSync(
      join(racine, "app/[locale]/layout.tsx"),
      "utf8",
    );
    expect(layout).toContain("<RevelationTitres />");
  });
});
