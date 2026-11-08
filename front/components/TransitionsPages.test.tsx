/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- liens et images bruts : on teste l'écouteur de clic global */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/fr/produits",
}));

import { TransitionsPages } from "./TransitionsPages";

const doc = document as unknown as Record<string, unknown>;

function reducedMotion(reduit: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduit && q.includes("reduce"),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function Carte() {
  return (
    <article>
      <img data-vt-photo="" alt="" />
      <a href="/fr/produits/lampe">Lampe</a>
    </article>
  );
}

describe("TransitionsPages", () => {
  beforeEach(() => {
    push.mockReset();
    reducedMotion(false);
  });
  afterEach(() => {
    delete doc.startViewTransition;
  });

  it("sans View Transitions, laisse la navigation normale", () => {
    const { container } = render(
      <>
        <TransitionsPages />
        <Carte />
      </>,
    );
    expect(fireEvent.click(container.querySelector("a")!)).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("en reduced-motion, ne lance aucune transition", () => {
    reducedMotion(true);
    const start = vi.fn();
    doc.startViewTransition = start;
    const { container } = render(
      <>
        <TransitionsPages />
        <Carte />
      </>,
    );
    expect(fireEvent.click(container.querySelector("a")!)).toBe(true);
    expect(start).not.toHaveBeenCalled();
  });

  it("nomme la photo de la carte et navigue dans la transition", () => {
    const start = vi.fn((cb: () => Promise<void>) => {
      void cb();
      return { finished: new Promise(() => {}) };
    });
    doc.startViewTransition = start;
    const { container } = render(
      <>
        <TransitionsPages />
        <Carte />
      </>,
    );
    expect(fireEvent.click(container.querySelector("a")!)).toBe(false);
    expect(start).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/fr/produits/lampe");
    expect(
      container.querySelector<HTMLElement>("img")!.style.viewTransitionName,
    ).toBe("photo-produit");
  });

  it("ignore les liens externes et les clics modifiés", () => {
    const start = vi.fn();
    doc.startViewTransition = start;
    const { container } = render(
      <>
        <TransitionsPages />
        <a href="https://exemple.org/">externe</a>
        <a href="/fr/contact">contact</a>
      </>,
    );
    const [externe, contact] = Array.from(container.querySelectorAll("a"));
    expect(fireEvent.click(externe)).toBe(true);
    expect(fireEvent.click(contact, { ctrlKey: true })).toBe(true);
    expect(start).not.toHaveBeenCalled();
  });
});
