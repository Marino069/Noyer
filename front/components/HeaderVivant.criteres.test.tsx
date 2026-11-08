import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderVivant } from "./HeaderVivant";

// Critères d'acceptation de #303 (E9-07), écrits indépendamment du code.

function defiler(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  act(() => {
    fireEvent.scroll(window);
  });
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
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

const entete = (c: HTMLElement) => c.querySelector("header") as HTMLElement;

describe("E9-07 critères d'acceptation", () => {
  it("toujours visible tant que le focus est dans l'en-tête, même en descendant", () => {
    const { container } = rendre();
    act(() => screen.getByRole("button", { name: "lien" }).focus());
    defiler(200);
    defiler(600);
    defiler(1200);
    expect(entete(container).dataset.cache).toBe("false");
  });

  it("se recache en descendant une fois le focus parti", () => {
    const { container } = rendre();
    act(() => screen.getByRole("button", { name: "lien" }).focus());
    defiler(300);
    act(() => screen.getByRole("button", { name: "lien" }).blur());
    defiler(500);
    expect(entete(container).dataset.cache).toBe("true");
  });

  it("toujours visible tant que le menu est ouvert (aria-expanded=true)", () => {
    const { container } = rendre();
    defiler(300);
    expect(entete(container).dataset.cache).toBe("true");
    const menu = screen.getByRole("button", { name: "menu" });
    act(() => {
      fireEvent.click(menu);
      menu.setAttribute("aria-expanded", "true");
    });
    defiler(800);
    defiler(1500);
    expect(entete(container).dataset.cache).toBe("false");
  });

  it("le trait de progression est décoratif (aria-hidden), vide et non focalisable", () => {
    const { container } = rendre();
    const trait = entete(container).querySelector('[aria-hidden="true"]');
    expect(trait).not.toBeNull();
    expect(trait?.textContent).toBe("");
    expect(trait?.hasAttribute("tabindex")).toBe(false);
  });

  it("le trait suit la progression dans la page (entre 0 et 1)", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 1000,
      configurable: true,
    });
    const { container } = rendre();
    const trait = entete(container).querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement;
    defiler(500);
    expect(Number(trait.style.getPropertyValue("--progression"))).toBeCloseTo(
      0.5,
    );
    defiler(5000);
    expect(Number(trait.style.getPropertyValue("--progression"))).toBe(1);
  });

  it("pas de CLS : l'en-tête reste sticky et seul transform est animé", () => {
    const css = readFileSync(join(__dirname, "Header.module.css"), "utf8");
    expect(css).toMatch(/\.header\s*\{[^}]*position:\s*sticky/);
    const transitions = [...css.matchAll(/transition:\s*([^;]+);/g)].map(
      (m) => m[1],
    );
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) expect(t).toMatch(/^transform\b/);
    const bloc = css.match(/\[data-cache="true"\]\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(bloc).toMatch(/transform:\s*translateY/);
    expect(bloc).not.toMatch(/height|margin|top|display|position|padding/);
  });

  it("le trait n'occupe pas de place dans le flux (position absolue)", () => {
    const css = readFileSync(join(__dirname, "Header.module.css"), "utf8");
    expect(css).toMatch(/\.progression\s*\{[^}]*position:\s*absolute/);
  });
});
