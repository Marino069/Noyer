import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hero } from "./Hero";
import { heroAccueil } from "@/mocks/data";

const preload = vi.hoisted(() => vi.fn());
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload,
}));

const contenu = {
  titre: heroAccueil.titre,
  mot_italique: heroAccueil.mot_italique,
  cta_libelle: heroAccueil.cta_libelle,
  image: heroAccueil.image,
};

beforeEach(() => preload.mockClear());

describe("[E3-01] Hero : accroche et CTA", () => {
  it("affiche l'accroche dans un h1", () => {
    render(<Hero contenu={contenu} ctaHref="/fr/produits/classic" />);
    expect(
      screen.getByRole("heading", { level: 1, name: heroAccueil.titre }),
    ).toBeInTheDocument();
  });

  it("met en italique uniquement le fragment demandé", () => {
    const { container } = render(
      <Hero contenu={contenu} ctaHref="/fr/produits/classic" />,
    );
    const ems = container.querySelectorAll("h1 em");
    expect(ems).toHaveLength(1);
    expect(ems[0]).toHaveTextContent("façonnée");
  });

  it("n'utilise aucun italique sans mot_italique", () => {
    const { container } = render(
      <Hero
        contenu={{ ...contenu, mot_italique: null }}
        ctaHref="/fr/produits/classic"
      />,
    );
    expect(container.querySelector("h1 em")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      heroAccueil.titre,
    );
  });

  it("ignore un mot_italique absent du titre", () => {
    const { container } = render(
      <Hero
        contenu={{ ...contenu, mot_italique: "introuvable" }}
        ctaHref="/fr/produits/classic"
      />,
    );
    expect(container.querySelector("h1 em")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      heroAccueil.titre,
    );
  });

  it("rend un CTA cerclé de laiton (secondaire) vers ctaHref", () => {
    render(<Hero contenu={contenu} ctaHref="/fr/produits/classic" />);
    const cta = screen.getByRole("link", { name: heroAccueil.cta_libelle });
    expect(cta).toHaveAttribute("href", "/fr/produits/classic");
    expect(cta.className).toMatch(/secondary/);
  });

  it("utilise Fraunces (token --serif) pour le titre", () => {
    const css = readFileSync(join(__dirname, "Hero.module.css"), "utf8");
    expect(css).toMatch(/\.title\s*\{[^}]*font-family:\s*var\(--serif\)/);
    const tokens = readFileSync(
      join(__dirname, "../styles/tokens.css"),
      "utf8",
    );
    expect(tokens).toMatch(/--serif:\s*var\(--font-fraunces\)/);
  });
});

describe("[E3-01] Hero : image chargée en priorité", () => {
  it("charge l'image en eager avec fetchpriority high", () => {
    render(<Hero contenu={contenu} ctaHref="/fr" />);
    const img = screen.getByRole("img", { name: heroAccueil.image!.alt });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("fournit un srcset trié par largeur et réserve le ratio (width/height)", () => {
    render(<Hero contenu={contenu} ctaHref="/fr" />);
    const img = screen.getByRole("img");
    const image = heroAccueil.image!;
    expect(img.getAttribute("srcset")).toBe(
      [...image.sources]
        .sort((a, b) => a.largeur - b.largeur)
        .map((s) => `${s.url} ${s.largeur}w`)
        .join(", "),
    );
    expect(img).toHaveAttribute("width", String(image.largeur_origine));
    expect(img).toHaveAttribute("height", String(image.hauteur_origine));
  });

  it("précharge l'image LCP avec le srcset de l'API", () => {
    render(<Hero contenu={contenu} ctaHref="/fr" />);
    expect(preload).toHaveBeenCalledTimes(1);
    const [href, options] = preload.mock.calls[0];
    expect(href).toBe(heroAccueil.image!.sources[0].url);
    expect(options).toMatchObject({
      as: "image",
      fetchPriority: "high",
      imageSrcSet: expect.stringContaining("960w"),
    });
  });

  it("n'affiche ni image ni préchargement sans image", () => {
    render(<Hero contenu={{ ...contenu, image: null }} ctaHref="/fr" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(preload).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: heroAccueil.cta_libelle }),
    ).toBeInTheDocument();
  });

  it("n'utilise que des tokens du brief (pas de couleur/rayon en dur)", () => {
    const css = readFileSync(join(__dirname, "Hero.module.css"), "utf8");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|hsl)a?\(/);
    for (const m of css.matchAll(/border-radius:\s*([^;]+);/g)) {
      expect(m[1]).toMatch(/var\(--radius/);
    }
  });
});
