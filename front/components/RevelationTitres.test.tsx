import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RevelationTitres } from "./RevelationTitres";

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }));

const css = readFileSync(join(__dirname, "../styles/globals.css"), "utf8");

let callback: (e: Partial<IntersectionObserverEntry>[]) => void = () => {};

function installer(reduit: boolean) {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: typeof callback) {
        callback = cb;
      }
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
  // Titres sous la ligne de flottaison.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 5000,
  } as DOMRect);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RevelationTitres (E9-06)", () => {
  it("garde un seul titre dans le DOM, texte intact", () => {
    installer(false);
    const { container } = render(
      <>
        <main>
          <h2>Un titre sur plusieurs lignes</h2>
        </main>
        <RevelationTitres />
      </>,
    );
    const h2 = container.querySelector("h2")!;
    expect(container.querySelectorAll("h2")).toHaveLength(1);
    expect(h2.children).toHaveLength(0);
    expect(h2.textContent).toBe("Un titre sur plusieurs lignes");
    expect(h2.dataset.titre).toBe("attente");
    callback([{ target: h2, isIntersecting: true }]);
    expect(h2.dataset.titre).toBe("montre");
    expect(h2.children).toHaveLength(0);
  });

  it("ne masque rien en reduced-motion", () => {
    installer(true);
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

  it("CSS : masque hors reduced-motion, animations limitées à clip-path et transform", () => {
    expect(css).toMatch(
      /prefers-reduced-motion: no-preference\) \{\s*h1\[data-titre="attente"\]/,
    );
    expect(css).toMatch(/transition:\s*clip-path[^;]*,\s*transform/);
  });

  it("CSS : parallaxe liée au défilement, desktop seulement, ≤ 40 px, sans reduced-motion", () => {
    expect(css).toMatch(
      /@media \(min-width: 900px\) and \(prefers-reduced-motion: no-preference\)/,
    );
    expect(css).toContain("animation-timeline: view()");
    const valeurs = [...css.matchAll(/translateY\((-?\d+)px\) scale/g)].map(
      (m) => Number(m[1]),
    );
    expect(valeurs).toHaveLength(2);
    expect(Math.max(...valeurs) - Math.min(...valeurs)).toBeLessThanOrEqual(40);
  });
});
