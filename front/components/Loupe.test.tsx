import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APPUI_LONG_MS, GROSSISSEMENT, Loupe } from "./Loupe";

const SRC = "/mocks/matiere-noyer-1600.webp";

function rendu(source: string | undefined | null = SRC) {
  const { container } = render(
    <Loupe source={source ?? undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mocks/matiere-noyer-960.webp"
        alt="Grain de noyer, gros plan"
      />
    </Loupe>,
  );
  const zone = container.firstElementChild as HTMLElement;
  const lentille = () => container.querySelector('[aria-hidden="true"]');
  const grain = () => container.querySelector(`img[src="${SRC}"]`);
  return { zone, lentille, grain };
}

const css = readFileSync(join(__dirname, "Loupe.module.css"), "utf8");

describe("[E9-03] Loupe d'atelier", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("grossit ×2,5", () => {
    expect(GROSSISSEMENT).toBe(2.5);
  });

  it("n'affiche aucune loupe et ne charge pas l'image 1600 sans souris ni appui", () => {
    const { grain, lentille } = rendu();
    expect(grain()).toBeNull();
    expect(lentille()).toHaveAttribute("data-visible", "false");
  });

  it("charge l'image 1600 à la première interaction souris, et l'affiche", () => {
    const { zone, grain, lentille } = rendu();
    fireEvent.pointerEnter(zone, {
      pointerType: "mouse",
      clientX: 5,
      clientY: 5,
    });
    expect(grain()).not.toBeNull();
    expect(lentille()).toHaveAttribute("data-visible", "true");
    fireEvent.pointerLeave(zone, { pointerType: "mouse" });
    expect(lentille()).toHaveAttribute("data-visible", "false");
  });

  it("est décorative : aria-hidden, alt vide, l'alt de l'image reste la description", () => {
    const { zone, lentille, grain } = rendu();
    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    expect(lentille()).toHaveAttribute("aria-hidden", "true");
    expect(grain()).toHaveAttribute("alt", "");
    expect(grain()).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(
      screen.getByAltText("Grain de noyer, gros plan"),
    ).toBeInTheDocument();
  });

  it("tactile : n'affiche rien au simple toucher, affiche après un appui long", () => {
    const { zone, grain, lentille } = rendu();
    fireEvent.pointerDown(zone, {
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    act(() => vi.advanceTimersByTime(APPUI_LONG_MS - 50));
    expect(grain()).toBeNull();
    act(() => vi.advanceTimersByTime(100));
    expect(grain()).not.toBeNull();
    expect(lentille()).toHaveAttribute("data-visible", "true");
    fireEvent.pointerUp(zone, { pointerType: "touch" });
    expect(lentille()).toHaveAttribute("data-visible", "false");
  });

  it("tactile : un tap rapide ou un défilement n'ouvre pas la loupe", () => {
    const { zone, grain } = rendu();
    fireEvent.pointerDown(zone, {
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(zone, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(APPUI_LONG_MS * 2));
    expect(grain()).toBeNull();

    fireEvent.pointerDown(zone, {
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(zone, {
      pointerType: "touch",
      clientX: 10,
      clientY: 80,
    });
    act(() => vi.advanceTimersByTime(APPUI_LONG_MS * 2));
    expect(grain()).toBeNull();
  });

  it("tactile : glisser déplace la loupe", () => {
    const { zone, lentille } = rendu();
    fireEvent.pointerDown(zone, {
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    act(() => vi.advanceTimersByTime(APPUI_LONG_MS + 10));
    const avant = (lentille() as HTMLElement).style.getPropertyValue("--x");
    fireEvent.pointerMove(zone, {
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
    });
    const apres = (lentille() as HTMLElement).style.getPropertyValue("--x");
    expect(avant).not.toBe("");
    expect(apres).toBe("0px");
  });

  it("sans image 1600, ne rend aucune loupe", () => {
    const { zone, lentille } = rendu(null);
    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    expect(lentille()).toBeNull();
  });

  describe("feuille de style", () => {
    it("anime seulement opacity/transform, cerclée de laiton, ronde", () => {
      expect(css).toMatch(/border:\s*2px solid var\(--brass\)/);
      expect(css).toMatch(/border-radius:\s*50%/);
      expect(css).toMatch(/transition:\s*opacity/);
      expect(css).not.toMatch(/transition:[^;]*(top|left|width|height)/);
    });

    it("désactive la transition avec prefers-reduced-motion", () => {
      const bloc = css.slice(css.indexOf("@media (prefers-reduced-motion"));
      expect(bloc).toMatch(/transition:\s*none/);
    });

    it("ne capte pas les clics et reste une cible ≥ 44 px", () => {
      expect(css).toMatch(/pointer-events:\s*none/);
      expect(css).toMatch(/--d:\s*(\d+(\.\d+)?)rem/);
      const rem = Number(css.match(/--d:\s*(\d+(?:\.\d+)?)rem/)?.[1]);
      expect(rem * 16).toBeGreaterThanOrEqual(44);
    });

    it("n'utilise que les couleurs de la charte (pas de hex hors tokens)", () => {
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    });
  });
});
