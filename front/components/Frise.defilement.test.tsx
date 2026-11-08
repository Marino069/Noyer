import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { Frise } from "./Frise";

// E9-05 : critères d'acceptation. css: false dans Vitest, le CSS se vérifie sur la source.
const css = readFileSync(join(__dirname, "Frise.module.css"), "utf8");

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let callbacks: Callback[] = [];
let observed: Element[] = [];

function installer({
  reduit = false,
  large = false,
  timeline = false,
}: {
  reduit?: boolean;
  large?: boolean;
  timeline?: boolean;
}) {
  callbacks = [];
  observed = [];
  class FauxObserver {
    constructor(cb: Callback) {
      callbacks.push(cb);
    }
    observe(el: Element) {
      observed.push(el);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", FauxObserver);
  vi.stubGlobal(
    "matchMedia",
    (q: string): MediaQueryList =>
      ({
        matches: q.includes("reduce") ? reduit : large,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
  vi.stubGlobal("CSS", { supports: () => timeline });
}

beforeEach(() => installer({}));
afterEach(() => vi.unstubAllGlobals());

describe("E9-05 Frise qui avance avec le défilement", () => {
  it("liste ordonnée inchangée pour les lecteurs d'écran", () => {
    const { container } = render(<Frise textes={frDict.home.frise} />);
    expect(container.querySelectorAll("ol")).toHaveLength(1);
    const items = within(
      screen.getByRole("list", { name: frDict.home.frise.etapesLabel }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    // Les jalons et le trait sont décoratifs : cachés aux lecteurs d'écran.
    for (const j of container.querySelectorAll("[data-jalon]")) {
      expect(j).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("mobile : les étapes sont observées et révélées une à une", () => {
    const { container } = render(<Frise textes={frDict.home.frise} />);
    const piste = container.querySelector<HTMLElement>("[data-mode]")!;
    expect(piste.dataset.mode).toBe("io");
    const items = container.querySelectorAll<HTMLElement>("ol > li");
    expect(observed).toEqual(Array.from(items));
    expect(items[0].dataset.etat).toBe("a-venir");

    vi.stubGlobal("innerHeight", 800);
    act(() =>
      callbacks[0]([
        { target: items[0], boundingClientRect: { top: 100 } as DOMRect },
        { target: items[1], boundingClientRect: { top: 900 } as DOMRect },
      ]),
    );
    expect(items[0].dataset.etat).toBe("actif");
    expect(items[1].dataset.etat).toBe("a-venir");
    expect(piste.style.getPropertyValue("--avancee")).toBe("0.25");

    act(() =>
      callbacks[0]([
        { target: items[1], boundingClientRect: { top: 300 } as DOMRect },
      ]),
    );
    expect(items[0].dataset.etat).toBe("atteint");
    expect(items[1].dataset.etat).toBe("actif");
    expect(piste.style.getPropertyValue("--avancee")).toBe("0.5");
  });

  it("grand écran : les jalons de la piste sticky pilotent l'étape active", () => {
    installer({ large: true });
    const { container } = render(<Frise textes={frDict.home.frise} />);
    const jalons = container.querySelectorAll<HTMLElement>("[data-jalon]");
    expect(jalons).toHaveLength(4);
    expect(observed).toEqual(Array.from(jalons));
    const items = container.querySelectorAll<HTMLElement>("ol > li");
    vi.stubGlobal("innerHeight", 800);
    act(() =>
      callbacks[0](
        Array.from(jalons).map((target, i) => ({
          target,
          boundingClientRect: { top: i < 3 ? 0 : 700 } as DOMRect,
        })),
      ),
    );
    expect(items[2].dataset.etat).toBe("actif");
    expect(items[1].dataset.etat).toBe("atteint");
    expect(items[3].dataset.etat).toBe("a-venir");
  });

  it("reduced-motion : aucun observateur, état final affiché", () => {
    installer({ reduit: true });
    const { container } = render(<Frise textes={frDict.home.frise} />);
    expect(observed).toHaveLength(0);
    expect(container.querySelector("[data-mode]")).toBeNull();
    expect(container.querySelector("[data-etat]")).toBeNull();
  });

  it("animation-timeline supportée : le CSS seul fait le travail", () => {
    installer({ timeline: true });
    const { container } = render(<Frise textes={frDict.home.frise} />);
    expect(observed).toHaveLength(0);
    expect(container.querySelector("[data-mode]")).toBeNull();
  });

  it("CSS : sticky dès 800 px seulement, hors reduced-motion", () => {
    expect(css).toMatch(
      /@media \(min-width: 800px\) and \(prefers-reduced-motion: no-preference\)\s*{[\s\S]*position:\s*sticky/,
    );
    // Pas de sticky dans la feuille de base (mobile).
    expect(css.split("@media")[0]).not.toMatch(/position:\s*sticky/);
  });

  it("CSS : animation liée au défilement avec repli, uniquement sans reduced-motion", () => {
    expect(css).toMatch(
      /@supports \(animation-timeline: view\(\)\)\s*{\s*@media \(prefers-reduced-motion: no-preference\)/,
    );
    expect(css).toContain("animation-timeline: --piste");
    expect(css).toContain('.piste[data-mode="io"]');
  });

  it("CSS : seulement transform et opacity animés, pas de CLS (aucune dimension animée)", () => {
    const keyframes = css.match(/@keyframes[\s\S]*?\n}\n/g) ?? [];
    expect(keyframes.length).toBeGreaterThan(0);
    for (const k of keyframes) {
      expect(k).not.toMatch(
        /\b(width|height|top|left|margin|padding|background|color)\s*:/,
      );
    }
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
