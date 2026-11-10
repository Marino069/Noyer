import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hero } from "@/components/Hero";
import frDict from "@/i18n/dictionaries/fr.json";
import { heroAccueil } from "@/mocks/data";

const preload = vi.hoisted(() => vi.fn());
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload,
}));

const lire = (p: string) =>
  readFileSync(join(import.meta.dirname, "..", p), "utf8");
const h = frDict.home.hero;

const allumee = {
  alt: "",
  largeur_origine: 1600,
  hauteur_origine: 1200,
  sources: [480, 960, 1600].map((largeur) => ({
    largeur: largeur as 480 | 960 | 1600,
    url: `/mocks/lucerne-premium-allumee-${largeur}.webp`,
  })),
};

const interrupteur = {
  allumee,
  libelleAllumer: frDict.interrupteur.allumer,
  libelleEteindre: frDict.interrupteur.eteindre,
};

const rendu = () =>
  render(
    <Hero
      contenu={heroAccueil}
      ctaHref="/fr/produits/premium"
      surtitre={h.surtitre}
      interrupteur={interrupteur}
    />,
  );

beforeEach(() => preload.mockClear());

describe("[E10-03] Maquette : textes et structure du hero", () => {
  it("reprend les textes de la maquette luxe", () => {
    expect(h.surtitre.toUpperCase()).toBe(
      "GENÈVE · SÉRIE LIMITÉE DE CINQUANTE PIÈCES",
    );
    expect(h.cta.toUpperCase()).toBe("DÉCOUVRIR LUCERNE PREMIUM");
    expect(heroAccueil.titre).toBe("La lumière, façonnée");
    expect(heroAccueil.mot_italique).toBe("façonnée");
  });

  it("surtitre, h1 (accent en italique), filet puis bouton cerclé, dans cet ordre", () => {
    const { container } = rendu();
    const surtitre = screen.getByText(h.surtitre);
    const h1 = screen.getByRole("heading", { level: 1 });
    const cta = screen.getByRole("link", { name: heroAccueil.cta_libelle });
    expect(h1).toHaveTextContent("La lumière, façonnée");
    expect(h1.querySelectorAll("em")).toHaveLength(1);
    expect(h1.querySelector("em")).toHaveTextContent("façonnée");
    const apres = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(apres(surtitre, h1)).toBe(true);
    expect(apres(h1, cta)).toBe(true);
    expect(container.querySelector('[class*="filet"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(cta).toHaveAttribute("href", "/fr/produits/premium");
    expect(cta.className).toMatch(/secondary/);
  });

  it("ne garde ni cotes, ni bandeau de filets, ni lien d'atelier", () => {
    rendu();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("hero de ≈ 860 px, dégradé vers le fond, laiton et tokens seulement", () => {
    const css = lire("components/Hero.module.css");
    expect(css).toMatch(/\.hero\s*\{[^}]*860px/);
    expect(css).toMatch(/\.degrade\s*\{[^}]*linear-gradient/);
    expect(css).toMatch(/\.surtitre\s*\{[^}]*color:\s*var\(--brass\)/);
    expect(css).toMatch(/\.filet\s*\{[^}]*background:\s*var\(--brass\)/);
    expect(css).toMatch(/\.title\s*\{[^}]*font-weight:\s*300/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });
});

describe("[E10-03] Critère 1 : image prioritaire", () => {
  it("l'image allumée (affichée par défaut) est eager, haute priorité et préchargée", () => {
    const { container } = rendu();
    const img = container.querySelector(
      'img[src*="allumee"]',
    ) as HTMLImageElement;
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "1200");
    expect(preload).toHaveBeenCalledTimes(1);
    expect(preload.mock.calls[0][1]).toMatchObject({
      as: "image",
      fetchPriority: "high",
      imageSizes: "100vw",
    });
  });

  it("la version jour n'est pas chargée au rendu (une seule image critique)", () => {
    const { container } = rendu();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("sans interrupteur, l'image du contenu reste l'image LCP", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" />);
    const img = screen.getByRole("img", { name: heroAccueil.image!.alt });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(preload).toHaveBeenCalledTimes(1);
  });

  it("n'anime que opacity et transform (réservation de place : CLS 0)", () => {
    const css = lire("components/HeroLampe.module.css");
    expect(css).toMatch(/transition:\s*opacity/);
    expect(css).toMatch(/position:\s*absolute/);
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce\)[\s\S]*transition:\s*none/,
    );
  });
});

describe("[E10-03] Critère 2 : interrupteur accessible", () => {
  it("bouton aria-pressed, lampe allumée par défaut", () => {
    rendu();
    const b = screen.getByRole("button", {
      name: frDict.interrupteur.eteindre,
    });
    expect(b.tagName).toBe("BUTTON");
    expect(b).toHaveAttribute("aria-pressed", "true");
  });

  it("éteindre bascule vers la version jour, avec un seul texte alternatif", async () => {
    const { container } = rendu();
    await userEvent.click(
      screen.getByRole("button", { name: frDict.interrupteur.eteindre }),
    );
    expect(
      screen.getByRole("button", { name: frDict.interrupteur.allumer }),
    ).toHaveAttribute("aria-pressed", "false");
    const jour = container.querySelector(
      'img[src*="lucerne-premium-480"]',
    ) as HTMLImageElement;
    expect(jour).toHaveAttribute("data-visible", "true");
    expect(jour).toHaveAttribute("alt", heroAccueil.image!.alt);
    const lumiere = container.querySelector(
      'img[src*="allumee"]',
    ) as HTMLImageElement;
    expect(lumiere).toHaveAttribute("aria-hidden", "true");
    expect(lumiere).toHaveAttribute("alt", "");
  });

  it("clavier : Entrée et Espace basculent", async () => {
    rendu();
    await userEvent.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("discret en bas à droite (haut à droite sur mobile), cible de 44 px", () => {
    const css = lire("components/HeroLampe.module.css");
    expect(css).toMatch(/\.interrupteur\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(
      /@media \(min-width: 900px\)[\s\S]*\.interrupteur\s*\{[^}]*bottom:[^}]*right:|@media \(min-width: 900px\)[\s\S]*\.interrupteur\s*\{[^}]*right:[^}]*bottom:/,
    );
    expect(lire("components/Interrupteur.module.css")).toMatch(
      /min-height:\s*44px/,
    );
  });
});

describe("[E10-03] Critère 3 : lisible et cadré sur mobile", () => {
  const css = lire("components/Hero.module.css");

  it("le hero tient dans l'écran et garde une hauteur minimale", () => {
    expect(css).toMatch(/\.hero\s*\{[^}]*height:\s*min\(860px,\s*100svh\)/);
    expect(css).toMatch(/\.hero\s*\{[^}]*min-height:\s*34rem/);
    expect(css).toMatch(/\.hero\s*\{[^}]*overflow:\s*hidden/);
  });

  it("l'image est recadrée (object-fit: cover) et le texte reste dans l'écran", () => {
    expect(css).toMatch(/\.image\s*\{[^}]*object-fit:\s*cover/);
    expect(css).toMatch(/\.contenu\s*\{[^}]*max-width:\s*100%/);
    expect(css).toMatch(/\.contenu\s*\{[^}]*padding:[^;]*var\(--gutter\)/);
    expect(css).toMatch(/\.title\s*\{[^}]*font-size:\s*var\(--fs-display\)/);
  });

  it("le titre fluide reste à 48 px minimum, jusqu'à ≈ 104 px", () => {
    expect(lire("styles/tokens.css")).toMatch(
      /--fs-display:\s*clamp\(3rem,[^)]*6\.5rem\)/,
    );
  });
});
