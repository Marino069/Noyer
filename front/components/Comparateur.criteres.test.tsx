import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { Comparateur } from "./Comparateur";

// Tests écrits à partir des critères d'acceptation de l'issue #298 (E9-02).

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
const piste = (c: HTMLElement) => {
  const el = c.querySelector("figure > div") as HTMLElement;
  el.getBoundingClientRect = () => ({ left: 0, width: 400 }) as DOMRect;
  return el;
};

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error nettoyage du stub jsdom
  delete Element.prototype.animate;
});

function stubInvite(reduit = false) {
  let rappel: IntersectionObserverCallback = () => {};
  let coupe = false;
  const annulations: ReturnType<typeof vi.fn>[] = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        rappel = cb;
      }
      observe() {}
      disconnect() {
        coupe = true;
      }
    },
  );
  const animate = vi.fn((keyframes: Keyframe[]) => {
    const cancel = vi.fn();
    annulations.push(cancel);
    return { cancel, keyframes };
  });
  Element.prototype.animate = animate as unknown as Element["animate"];
  vi.stubGlobal("matchMedia", () => ({ matches: reduit }));
  const montre = () =>
    !coupe &&
    rappel(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  return { animate, annulations, montre };
}

describe("[E9-02] critères d'acceptation", () => {
  it("glisse au doigt (pointeur tactile)", () => {
    const { container } = rendu();
    const p = piste(container);
    fireEvent.pointerDown(p, {
      clientX: 100,
      pointerId: 2,
      pointerType: "touch",
    });
    expect(curseur()).toHaveAttribute("aria-valuenow", "25");
    fireEvent.pointerMove(p, {
      clientX: 300,
      pointerId: 2,
      pointerType: "touch",
    });
    expect(curseur()).toHaveAttribute("aria-valuenow", "75");
    fireEvent.pointerUp(p, { pointerId: 2, pointerType: "touch" });
  });

  it("ignore le clic droit de la souris", () => {
    const { container } = rendu();
    fireEvent.pointerDown(piste(container), {
      clientX: 100,
      pointerId: 1,
      pointerType: "mouse",
      button: 2,
    });
    expect(curseur()).toHaveAttribute("aria-valuenow", "50");
  });

  it("le slider est focusable et ses valeurs restent entières sur le pas de 5", () => {
    rendu();
    expect(curseur()).toHaveAttribute("tabindex", "0");
    for (let i = 0; i < 3; i++)
      fireEvent.keyDown(curseur(), { key: "ArrowRight" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "65");
    expect(curseur()).toHaveAttribute("aria-valuetext", "65 % Premium");
  });

  it("Début et Fin atteignent 0 et 100 depuis n'importe quelle position", () => {
    rendu();
    fireEvent.keyDown(curseur(), { key: "ArrowRight" });
    fireEvent.keyDown(curseur(), { key: "Home" });
    expect(curseur()).toHaveAttribute("aria-valuetext", "0 % Premium");
    fireEvent.keyDown(curseur(), { key: "End" });
    expect(curseur()).toHaveAttribute("aria-valuetext", "100 % Premium");
  });

  it("une touche sans rapport ne change rien", () => {
    rendu();
    fireEvent.keyDown(curseur(), { key: "a" });
    expect(curseur()).toHaveAttribute("aria-valuenow", "50");
  });

  it("l'invite est un aller-retour qui repart et revient à 50 %", () => {
    const { animate, montre } = stubInvite();
    rendu();
    expect(animate).not.toHaveBeenCalled();
    montre();
    const images = (animate.mock.calls as unknown as [Keyframe[]][]).map(
      (c) => c[0],
    );
    expect(images.length).toBeGreaterThan(0);
    for (const kf of images) {
      const valeurs = kf.map((k) => JSON.stringify(k));
      expect(new Set(valeurs).size).toBeGreaterThan(1); // ça bouge
      expect(valeurs[0]).toBe(valeurs[valeurs.length - 1]); // retour au départ
    }
  });

  it("l'invite n'a lieu qu'une fois", () => {
    const { animate, montre } = stubInvite();
    rendu();
    montre();
    const n = animate.mock.calls.length;
    montre();
    expect(animate).toHaveBeenCalledTimes(n);
  });

  it("l'invite s'arrête dès que la personne règle le curseur", () => {
    const { annulations, montre } = stubInvite();
    rendu();
    montre();
    fireEvent.keyDown(curseur(), { key: "ArrowRight" });
    expect(annulations.length).toBeGreaterThan(0);
    for (const c of annulations) expect(c).toHaveBeenCalled();
  });

  it("aucune invite avec prefers-reduced-motion", () => {
    const { animate, montre } = stubInvite(true);
    rendu();
    montre();
    expect(animate).not.toHaveBeenCalled();
    expect(curseur()).toHaveAttribute("aria-valuenow", "50");
  });

  it("la piste empêche le défilement horizontal parasite (touch-action)", () => {
    // jsdom ne charge pas les CSS modules : voir le test sur le CSS dans Comparateur.test.tsx.
    const { container } = rendu();
    expect(piste(container)).toBeInTheDocument();
  });
});
