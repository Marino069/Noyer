import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { Header } from "@/components/Header";
import { RevealObserver } from "@/components/RevealObserver";
import { Section } from "@/components/Section";

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  SHOP_ENABLED: true,
}));
vi.mock("@/lib/mocks", () => ({ startMocks: () => new Promise(() => {}) }));

const css = (f: string) =>
  readFileSync(join(__dirname, "..", "components", f), "utf8");
const globals = readFileSync(
  join(__dirname, "..", "styles", "globals.css"),
  "utf8",
);

function mockMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduce : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/** Contenus des blocs @media dont l'en-tête commence par `header` (accolades équilibrées). */
function mediaBlocks(source: string, header: string): string[] {
  const blocks: string[] = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf(header, from);
    if (start === -1) return blocks;
    let depth = 0;
    let i = source.indexOf("{", start);
    const begin = i;
    for (; i < source.length; i++) {
      if (source[i] === "{") depth++;
      if (source[i] === "}" && --depth === 0) break;
    }
    blocks.push(source.slice(begin + 1, i));
    from = i;
  }
}

beforeEach(() => {
  mockMedia(false);
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get() {
      return document.body;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

function stubObserver(top: number) {
  const observe = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = observe;
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
  } as DOMRect);
  return observe;
}

describe("E8-10 : critère « Toutes les animations coupées avec prefers-reduced-motion »", () => {
  function setup(reduce: boolean) {
    mockMedia(reduce);
    const observe = stubObserver(5000);
    const view = render(
      <>
        <Section>a</Section>
        <Section>b</Section>
        <RevealObserver />
      </>,
    );
    return { ...view, observe };
  }

  it("sans préférence, les sections hors écran sont masquées en attente", () => {
    const { container } = setup(false);
    for (const s of container.querySelectorAll("section")) {
      expect(s.getAttribute("data-reveal")).toBe("pending");
    }
  });

  it("avec reduced-motion, aucune section n'est masquée ni observée", () => {
    const { container, observe } = setup(true);
    for (const s of container.querySelectorAll("section")) {
      expect(s.getAttribute("data-reveal")).not.toBe("pending");
    }
    expect(observe).not.toHaveBeenCalled();
  });

  it("le masquage des sections n'existe en CSS que hors reduced-motion", () => {
    const section = css("Section.module.css");
    const blocks = mediaBlocks(
      section,
      "@media (prefers-reduced-motion: no-preference)",
    );
    expect(blocks.join("\n")).toMatch(/data-reveal="pending"/);
    let outside = section;
    for (const b of blocks) outside = outside.replace(b, "");
    expect(outside).not.toMatch(/data-reveal/);
    expect(outside).not.toMatch(/transition\s*:/);
  });

  it("le trait laiton et le menu sont coupés en reduced-motion", () => {
    const reduce = mediaBlocks(
      css("SiteNav.module.css"),
      "@media (prefers-reduced-motion: reduce)",
    ).join("\n");
    expect(reduce).toMatch(/\.menu\s*\{[^}]*animation:\s*none/);
    expect(reduce).toMatch(/\.link::after[^{]*\{[^}]*transition:\s*none/);
  });

  it("la règle reduced-motion du trait vient après le bloc desktop", () => {
    const nav = css("SiteNav.module.css");
    const desktop = nav.indexOf("@media (min-width: 800px)");
    const lastReduce = nav.lastIndexOf(
      "@media (prefers-reduced-motion: reduce)",
    );
    expect(lastReduce).toBeGreaterThan(desktop);
  });

  it("une règle globale coupe aussi transitions et animations", () => {
    const reduce = mediaBlocks(
      globals,
      "@media (prefers-reduced-motion: reduce)",
    ).join("\n");
    expect(reduce).toMatch(/animation-duration:\s*0\.01ms/);
    expect(reduce).toMatch(/transition-duration:\s*0\.01ms/);
  });
});

describe("E8-10 : critère « Menu mobile : focus piégé, fermeture par Échap »", () => {
  function open() {
    render(<Header locale="fr" dictionary={frDict.header} />);
    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    fireEvent.click(toggle);
    const header = document.querySelector("header") as HTMLElement;
    const items = Array.from(
      header.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    return { toggle, items };
  }

  it("le bouton burger indique l'état ouvert et le menu n'est plus caché", () => {
    const { toggle } = open();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector("nav[hidden]")).toBeNull();
  });

  it("Tab sur le dernier élément revient au premier", () => {
    const { items } = open();
    items[items.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(items[0]);
  });

  it("Maj+Tab sur le premier élément va au dernier", () => {
    const { items } = open();
    items[0].focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("si le focus est hors de l'en-tête, Tab le ramène dedans", () => {
    const { items } = open();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(items).toContain(document.activeElement as HTMLElement);
  });

  it("Échap ferme le menu, rend le focus au bouton et libère le scroll", () => {
    const { toggle } = open();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(toggle);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("le piège de focus est retiré une fois le menu fermé", () => {
    const { toggle, items } = open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(items.length).toBeGreaterThan(1);
    const notPrevented = fireEvent.keyDown(document, { key: "Tab" });
    expect(notPrevented).toBe(true);
  });

  it("le panier est dans l'en-tête", () => {
    render(<Header locale="fr" dictionary={frDict.header} />);
    expect(
      document.querySelector('header a[href="/fr/panier"]'),
    ).not.toBeNull();
  });
});

describe("E8-10 : critère « CLS toujours à 0 » (vérifiable par construction)", () => {
  it("les apparitions n'animent que opacity et transform", () => {
    const block = mediaBlocks(
      css("Section.module.css"),
      "@media (prefers-reduced-motion: no-preference)",
    ).join("\n");
    const props = [...block.matchAll(/^\s*([a-z-]+)\s*:/gm)].map((m) => m[1]);
    const allowed = new Set(["opacity", "transform", "transition"]);
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) expect(allowed.has(p)).toBe(true);
    const transition = block.match(/transition:([^;]+);/)?.[1] ?? "";
    expect(transition).toMatch(/opacity/);
    expect(transition).toMatch(/transform/);
    expect(transition).not.toMatch(/\ball\b/);
  });

  it("le trait laiton se dessine par transform seul", () => {
    const desktop = mediaBlocks(
      css("SiteNav.module.css"),
      "@media (min-width: 800px)",
    ).join("\n");
    const after = desktop.match(/\.link::after\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(after).toMatch(/transform:\s*scaleX\(0\)/);
    expect(after).toMatch(/transition:\s*transform/);
    expect(after).toMatch(/position:\s*absolute/);
    const hover =
      desktop.match(/\.link:hover::after[^{]*\{([^}]*)\}/)?.[1] ?? "";
    expect(hover).toMatch(/transform:\s*scaleX\(1\)/);
    expect(hover).not.toMatch(/width|height|margin|padding/);
  });

  it("une section déjà à l'écran n'est jamais masquée", () => {
    stubObserver(100);
    const { container } = render(
      <>
        <Section>a</Section>
        <RevealObserver />
      </>,
    );
    expect(
      container.querySelector("section")?.getAttribute("data-reveal"),
    ).not.toBe("pending");
  });

  it("les sections masquées sont révélées au démontage", () => {
    stubObserver(5000);
    const { container, unmount } = render(
      <>
        <Section>a</Section>
        <RevealObserver />
      </>,
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.getAttribute("data-reveal")).toBe("pending");
    act(() => unmount());
    expect(section.getAttribute("data-reveal")).toBe("shown");
  });
});
