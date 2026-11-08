import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderVivant } from "./HeaderVivant";

function mockMM(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function defiler(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => {
    fireEvent.scroll(window);
  });
}

beforeEach(() => {
  mockMM(false);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

const rendre = () =>
  render(
    <HeaderVivant>
      <button>lien</button>
      <button aria-expanded="false">menu</button>
    </HeaderVivant>,
  );

describe("E9-07 en-tête vivant", () => {
  it("se cache en descendant après 120 px et réapparaît en remontant", () => {
    const { container } = rendre();
    const h = container.querySelector("header") as HTMLElement;
    defiler(100);
    expect(h.dataset.cache).toBe("false");
    defiler(300);
    expect(h.dataset.cache).toBe("true");
    defiler(250);
    expect(h.dataset.cache).toBe("false");
  });

  it("reste visible quand un élément a le focus", () => {
    const { container } = rendre();
    const h = container.querySelector("header") as HTMLElement;
    defiler(300);
    expect(h.dataset.cache).toBe("true");
    act(() => screen.getByRole("button", { name: "lien" }).focus());
    expect(h.dataset.cache).toBe("false");
    defiler(400);
    expect(h.dataset.cache).toBe("false");
  });

  it("reste visible quand le menu est ouvert", () => {
    const { container } = rendre();
    const h = container.querySelector("header") as HTMLElement;
    screen
      .getByRole("button", { name: "menu" })
      .setAttribute("aria-expanded", "true");
    defiler(500);
    expect(h.dataset.cache).toBe("false");
  });

  it("ne se cache jamais avec prefers-reduced-motion", () => {
    mockMM(true);
    const { container } = rendre();
    defiler(500);
    expect(
      (container.querySelector("header") as HTMLElement).dataset.cache,
    ).toBe("false");
  });

  it("a un trait de progression décoratif", () => {
    const { container } = rendre();
    const trait = container.querySelector("header > span") as HTMLElement;
    expect(trait).toHaveAttribute("aria-hidden", "true");
    expect(trait.style.getPropertyValue("--progression")).toBe("0");
  });
});
