import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BandeauDemo } from "@/components/BandeauDemo";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import fr from "@/i18n/dictionaries/fr.json";

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }));
vi.mock("@/lib/mocks", () => ({ startMocks: () => new Promise(() => {}) }));

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

beforeEach(() => {
  mockMatchMedia(false);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get() {
      return document.body;
    },
  });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

const renderHeader = () =>
  render(<Header locale="fr" dictionary={fr.header} />);
const getHeader = () => document.querySelector("header") as HTMLElement;

describe("E10-02 critère 1 : menu plein écran mobile conservé", () => {
  it("est fermé au départ puis s'ouvre avec le bouton burger", () => {
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    const nav = screen.getByRole("navigation", { hidden: true });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(nav).toHaveAttribute("hidden");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(nav).not.toHaveAttribute("hidden");
    for (const nom of [
      "Collections",
      "La maison",
      "L'atelier",
      "Rendez-vous",
    ]) {
      expect(within(nav).getByRole("link", { name: nom })).toBeInTheDocument();
    }
  });

  it("bloque le défilement de la page tant que le menu est ouvert", () => {
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    fireEvent.click(toggle);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(toggle);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("Échap ferme le menu et rend le focus au bouton", () => {
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("piège le focus dans l'en-tête avec Tab et Maj+Tab", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const items = Array.from(
      getHeader().querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      ),
    );
    items[items.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(items[items.length - 1]).toHaveFocus();
  });

  it("choisir un lien referme le menu", () => {
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    fireEvent.click(toggle);
    const nav = screen.getByRole("navigation", { hidden: true });
    fireEvent.click(within(nav).getByRole("link", { name: "L'atelier" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("E10-02 critère 2 : en-tête vivant et trait de progression", () => {
  it("contient un trait de progression décoratif", () => {
    renderHeader();
    expect(
      getHeader().querySelector('span[aria-hidden="true"]'),
    ).not.toBeNull();
  });

  it("se cache en descendant au-delà de 120 px et réapparaît en remontant", () => {
    renderHeader();
    const header = getHeader();
    expect(header).toHaveAttribute("data-cache", "false");
    scrollTo(60);
    expect(header).toHaveAttribute("data-cache", "false");
    scrollTo(400);
    expect(header).toHaveAttribute("data-cache", "true");
    scrollTo(300);
    expect(header).toHaveAttribute("data-cache", "false");
  });

  it("reste visible quand le menu est ouvert", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    scrollTo(500);
    expect(getHeader()).toHaveAttribute("data-cache", "false");
  });

  it("ne se cache jamais avec prefers-reduced-motion", () => {
    mockMatchMedia(true);
    renderHeader();
    scrollTo(500);
    expect(getHeader()).toHaveAttribute("data-cache", "false");
  });

  it("met à jour la progression selon le défilement", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });
    renderHeader();
    const trait = getHeader().querySelector(
      'span[aria-hidden="true"]',
    ) as HTMLElement;
    scrollTo(500);
    expect(Number(trait.style.getPropertyValue("--progression"))).toBeCloseTo(
      0.5,
    );
  });
});

describe("E10-02 critère 3 : bandeau de démo", () => {
  it("affiche le texte du bandeau de démo en note", () => {
    render(<BandeauDemo texte={fr.demo.bandeau} />);
    expect(screen.getByRole("note")).toHaveTextContent(fr.demo.bandeau);
  });
});

describe("E10-02 description : en-tête à 3 colonnes", () => {
  it("logo vers l'accueil, Rendez-vous présent, sans bandeau ni bouton noir", () => {
    renderHeader();
    const header = getHeader();
    expect(
      within(header).getByRole("link", { name: fr.header.home }),
    ).toHaveAttribute("href", "/fr");
    expect(
      within(header).getAllByRole("link", { name: "Rendez-vous", hidden: true })
        .length,
    ).toBeGreaterThanOrEqual(1);
    const boutonsCta = within(header)
      .queryAllByRole("button", { hidden: true })
      .filter((b) => b.getAttribute("aria-controls") === null);
    expect(boutonsCta).toHaveLength(0);
    expect(screen.queryByText(/46°12/)).not.toBeInTheDocument();
  });
});

describe("E10-02 description : pied de page à 4 colonnes", () => {
  it("contient maison, collections, la maison, lettre de l'atelier et ligne légale", () => {
    render(
      <Footer locale="fr" dictionary={fr.footer} newsletter={fr.newsletter} />,
    );
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText(fr.footer.tagline)).toBeInTheDocument();
    expect(
      within(footer).getByRole("navigation", { name: "Collections" }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("navigation", { name: "La maison" }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("heading", { name: fr.newsletter.title }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("navigation", { name: fr.footer.legal.label }),
    ).toBeInTheDocument();
    expect(within(footer).getByText(fr.footer.copyright)).toBeInTheDocument();
  });
});
