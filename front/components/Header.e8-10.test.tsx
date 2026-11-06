import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { Header } from "./Header";
import { RevealObserver } from "./RevealObserver";
import { Section } from "./Section";

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }));
vi.mock("@/lib/mocks", () => ({ startMocks: () => new Promise(() => {}) }));

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => mockMatchMedia(false));

describe("E8-10 En-tête : bandeau, liens, panier", () => {
  it("affiche le bandeau d'atelier et les liens", () => {
    render(<Header locale="fr" dictionary={frDict.header} />);
    expect(screen.getByText(frDict.header.bandeau[1])).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Classic", hidden: true }),
    ).toBeInTheDocument();
  });
});

describe("E8-10 Menu mobile", () => {
  it("ouvre, piège le focus et se ferme avec Échap en rendant le focus", () => {
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      },
    });
    render(<Header locale="fr" dictionary={frDict.header} />);
    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const header = document.querySelector("header") as HTMLElement;
    const items = Array.from(
      header.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    const last = items[items.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(toggle);
  });
});

describe("E8-10 Apparitions", () => {
  it("masque une section hors écran puis la révèle à l'intersection", () => {
    let callback: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 5000,
    } as DOMRect);
    const { container } = render(
      <>
        <Section>x</Section>
        <RevealObserver />
      </>,
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.getAttribute("data-reveal")).toBe("pending");
    act(() =>
      callback(
        [
          {
            isIntersecting: true,
            target: section,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      ),
    );
    expect(section.getAttribute("data-reveal")).toBe("shown");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("ne masque rien avec prefers-reduced-motion", () => {
    mockMatchMedia(true);
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 5000,
    } as DOMRect);
    const { container } = render(
      <>
        <Section>x</Section>
        <RevealObserver />
      </>,
    );
    expect(
      container.querySelector("section")?.getAttribute("data-reveal"),
    ).toBe("");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

describe("E8-10 prefers-reduced-motion et CLS", () => {
  it("coupe le trait laiton, le menu et les apparitions", () => {
    const nav = read("SiteNav.module.css");
    expect(nav).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.link::after\s*\{\s*transition: none/,
    );
    expect(nav).toMatch(/\.menu\s*\{\s*animation: none/);
    expect(read("Section.module.css")).toMatch(
      /prefers-reduced-motion: no-preference[\s\S]*data-reveal="pending"/,
    );
  });

  it("n'anime que opacity et transform (CLS 0)", () => {
    const section = read("Section.module.css");
    const reveal = section.slice(section.indexOf("no-preference"));
    expect(reveal).not.toMatch(/\b(height|margin|top|width|padding)\s*:/);
    expect(read("SiteNav.module.css")).toMatch(/transform: scaleX\(0\)/);
  });
});
