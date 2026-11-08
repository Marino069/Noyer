import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { Comparateur } from "./Comparateur";

const vignette = (alt: string) => ({ src: `/${alt}.webp`, alt });
const rendu = () =>
  render(
    <Comparateur
      classic={{ vignette: vignette("Classic"), prix: "CHF 480.–" }}
      premium={{ vignette: vignette("Premium"), prix: "CHF 1240.–" }}
      textes={fr.home.gammes.comparateur}
    />,
  );
const curseur = () => screen.getByRole("slider");
const css = readFileSync(join(__dirname, "Comparateur.module.css"), "utf8");

afterEach(() => vi.unstubAllGlobals());

describe("[E9-02] Comparateur Classic / Premium", () => {
  it("expose un slider à 50 % au départ avec aria-valuetext", () => {
    rendu();
    expect(curseur()).toHaveAttribute("aria-valuenow", "50");
    expect(curseur()).toHaveAttribute("aria-valuemin", "0");
    expect(curseur()).toHaveAttribute("aria-valuemax", "100");
    expect(curseur()).toHaveAttribute("aria-valuetext", "50 % Premium");
    expect(curseur()).toHaveAccessibleName(fr.home.gammes.comparateur.label);
  });

  it("affiche libellés et prix de chaque côté", () => {
    rendu();
    expect(screen.getByText("CHF 480.–")).toBeInTheDocument();
    expect(screen.getByText("CHF 1240.–")).toBeInTheDocument();
    expect(screen.getByText("Classic", { selector: "span" })).toBeVisible();
    expect(screen.getByText("Premium", { selector: "span" })).toBeVisible();
  });

  it("se règle au clavier : flèches par pas de 5, Début, Fin, bornes", () => {
    rendu();
    fireEvent.keyDown(curseur(), { key: "ArrowRight" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "55");
    expect(curseur()).toHaveAttribute("aria-valuetext", "55 % Premium");
    fireEvent.keyDown(curseur(), { key: "ArrowLeft" });
    fireEvent.keyDown(curseur(), { key: "ArrowLeft" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "45");
    fireEvent.keyDown(curseur(), { key: "End" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "100");
    fireEvent.keyDown(curseur(), { key: "ArrowRight" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "100");
    fireEvent.keyDown(curseur(), { key: "Home" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(curseur(), { key: "ArrowLeft" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "0");
  });

  it("se règle en glissant selon la largeur de la piste", () => {
    const { container } = rendu();
    const piste = container.querySelector("figure > div") as HTMLElement;
    piste.getBoundingClientRect = () => ({ left: 100, width: 200 }) as DOMRect;
    fireEvent.pointerDown(piste, { clientX: 160, pointerId: 1 });
    expect(curseur()).toHaveAttribute("aria-valuenow", "30");
    fireEvent.pointerMove(piste, { clientX: 220, pointerId: 1 });
    expect(curseur()).toHaveAttribute("aria-valuenow", "60");
    fireEvent.pointerUp(piste, { pointerId: 1 });
    fireEvent.pointerMove(piste, { clientX: 100, pointerId: 1 });
    expect(curseur()).toHaveAttribute("aria-valuenow", "60");
    fireEvent.pointerDown(piste, { clientX: 900, pointerId: 1 });
    expect(curseur()).toHaveAttribute("aria-valuenow", "100");
  });

  it("applique la position par clip-path sur la couche Premium", () => {
    const { container } = rendu();
    fireEvent.keyDown(curseur(), { key: "ArrowRight" });
    const couche = container.querySelector("img[alt='Premium']")
      ?.parentElement as HTMLElement;
    expect(couche.style.clipPath).toBe("inset(0 0 0 55%)");
  });

  it("lance l'invite au premier affichage", () => {
    let rappel: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          rappel = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    Element.prototype.animate = animate as unknown as Element["animate"];
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    rendu();
    rappel(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("n'anime pas avec prefers-reduced-motion, mais reste réglable", () => {
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe;
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    rendu();
    expect(observe).not.toHaveBeenCalled();
    fireEvent.keyDown(curseur(), { key: "ArrowRight" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "55");
  });

  it("évite le défilement parasite sur la poignée (touch-action) et garde 44 px", () => {
    expect(css).toMatch(/\.curseur\s*\{[^}]*touch-action:\s*none/);
    expect(css).toMatch(/\.curseur\s*\{[^}]*width:\s*44px/);
  });
});
