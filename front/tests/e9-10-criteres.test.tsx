/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- photos brutes : on teste l'écouteur de clic global */
import { act, fireEvent, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let chemin = "/fr/produits";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => chemin,
}));

import { TransitionsPages } from "@/components/TransitionsPages";

const doc = document as unknown as Record<string, unknown>;
const racine = join(import.meta.dirname, "..");

function reducedMotion(reduit: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduit && q.includes("reduce"),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function Page() {
  return (
    <>
      <TransitionsPages />
      <article>
        <img data-vt-photo="" alt="" />
        <a href="/fr/produits/lampe">Lampe</a>
      </article>
    </>
  );
}

describe("E9-10 : transitions entre les pages", () => {
  beforeEach(() => {
    push.mockReset();
    chemin = "/fr/produits";
    reducedMotion(false);
  });
  afterEach(() => {
    delete doc.startViewTransition;
  });

  it("Reduced-motion : aucune transition, aucun nom posé, navigation normale", () => {
    reducedMotion(true);
    const start = vi.fn();
    doc.startViewTransition = start;
    const { container } = render(<Page />);
    expect(fireEvent.click(container.querySelector("a")!)).toBe(true);
    expect(start).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(
      container.querySelector<HTMLElement>("img")!.style.viewTransitionName,
    ).toBeFalsy();
  });

  it("Reduced-motion : le CSS coupe toutes les animations de transition", () => {
    const css = readFileSync(join(racine, "styles/globals.css"), "utf8");
    const debut = css.indexOf("::view-transition");
    const bloc = css.slice(
      css.indexOf("@media (prefers-reduced-motion: reduce)", debut),
    );
    expect(bloc).toMatch(/::view-transition-group\(\*\)/);
    expect(bloc).toMatch(/::view-transition-old\(\*\)/);
    expect(bloc).toMatch(/::view-transition-new\(\*\)/);
    expect(bloc).toMatch(/animation:\s*none/);
  });

  it("Bouton Retour : popstate n'est pas intercepté (ni transition ni push)", () => {
    const start = vi.fn();
    doc.startViewTransition = start;
    render(<Page />);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(start).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("un lien vers la page courante n'est pas intercepté", () => {
    const start = vi.fn();
    doc.startViewTransition = start;
    const { container } = render(
      <>
        <TransitionsPages />
        <a href={window.location.pathname + "#haut"}>ici</a>
      </>,
    );
    expect(fireEvent.click(container.querySelector("a")!)).toBe(true);
    expect(start).not.toHaveBeenCalled();
  });

  it("la grande photo de la fiche reçoit le nom partagé, retiré en fin de transition", async () => {
    let fin: () => void = () => {};
    const termine = new Promise<void>((r) => (fin = r));
    doc.startViewTransition = vi.fn((cb: () => Promise<void>) => {
      void cb();
      return { finished: termine };
    });
    const Site = ({ fiche }: { fiche: boolean }) => (
      <>
        <TransitionsPages />
        {fiche ? (
          <img data-vt-photo="" alt="grande" />
        ) : (
          <article>
            <img data-vt-photo="" alt="" />
            <a href="/fr/produits/lampe">Lampe</a>
          </article>
        )}
      </>
    );
    const { container, rerender } = render(<Site fiche={false} />);
    fireEvent.click(container.querySelector("a")!);
    expect(
      container.querySelector<HTMLElement>("img")!.style.viewTransitionName,
    ).toBe("photo-produit");

    chemin = "/fr/produits/lampe";
    rerender(<Site fiche />);
    expect(
      container.querySelector<HTMLElement>("img")!.style.viewTransitionName,
    ).toBe("photo-produit");

    await act(async () => {
      fin();
      await termine;
    });
    expect(
      container.querySelector<HTMLElement>("img")!.style.viewTransitionName,
    ).toBeFalsy();
  });

  it("fondu doux de 0,25 s pour les autres pages", () => {
    const css = readFileSync(join(racine, "styles/globals.css"), "utf8");
    expect(css).toMatch(
      /::view-transition-old\(root\),\s*::view-transition-new\(root\)\s*\{[^}]*animation-duration:\s*0?\.25s/,
    );
  });

  it("le composant est monté dans le layout", () => {
    const layout = readFileSync(
      join(racine, "app/[locale]/layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/<TransitionsPages\s*\/>/);
  });

  it("carte produit et galerie de la fiche portent data-vt-photo", () => {
    expect(
      readFileSync(join(racine, "components/ProductCard.tsx"), "utf8"),
    ).toMatch(/data-vt-photo/);
    expect(
      readFileSync(join(racine, "components/GalerieEmpilee.tsx"), "utf8"),
    ).toMatch(/data-vt-photo/);
  });
});
