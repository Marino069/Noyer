import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hero } from "@/components/Hero";
import { Manifeste } from "@/components/Manifeste";
import frDict from "@/i18n/dictionaries/fr.json";
import { heroAccueil } from "@/mocks/data";

const preload = vi.hoisted(() => vi.fn());
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload,
}));

const h = frDict.home.hero;
const atelier = {
  surtitre: h.surtitre,
  lien: { libelle: h.lien, href: "/fr/atelier" },
  coteHauteur: h.coteHauteur,
  coteDiametre: h.coteDiametre,
  piece: h.piece,
  filetsLabel: h.filetsLabel,
  filets: h.filets,
};

beforeEach(() => preload.mockClear());

describe("[E8-03] Hero d'accueil : conforme à la maquette", () => {
  it("affiche titre, sous-titre, bouton et lien vers l'atelier", () => {
    render(
      <Hero contenu={heroAccueil} ctaHref="/fr/produits" atelier={atelier} />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(heroAccueil.sous_titre)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: heroAccueil.cta_libelle }),
    ).toHaveAttribute("href", "/fr/produits");
    expect(screen.getByRole("link", { name: h.lien })).toHaveAttribute(
      "href",
      "/fr/atelier",
    );
  });

  it("affiche les cotes, l'étiquette de pièce et le surtitre", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" atelier={atelier} />);
    expect(screen.getByText("H 42 cm")).toBeInTheDocument();
    expect(screen.getByText("Ø 28 cm")).toBeInTheDocument();
    expect(screen.getByText(h.piece).tagName).toBe("FIGCAPTION");
    expect(screen.getByText(h.surtitre)).toBeInTheDocument();
  });

  it("affiche un bandeau de 4 filets matière", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" atelier={atelier} />);
    const liste = screen.getByRole("list", { name: h.filetsLabel });
    const items = within(liste).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("Essence — Noyer massif");
    expect(items[3]).toHaveTextContent("Lieu — Atelier de Genève");
  });

  it("garde l'image prioritaire (LCP) avec l'habillage", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" atelier={atelier} />);
    const img = screen.getByRole("img", { name: heroAccueil.image!.alt });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(preload).toHaveBeenCalledTimes(1);
  });

  it("empile proprement sur mobile : une colonne, filets en grille", () => {
    const css = readFileSync(
      join(__dirname, "../components/Hero.module.css"),
      "utf8",
    );
    expect(css).toMatch(/\.layout\s*\{[^}]*display:\s*grid/);
    expect(css).toMatch(
      /@media \(min-width: 900px\)\s*\{[\s\S]*grid-template-columns:\s*1fr 1fr/,
    );
    expect(css).toMatch(/\.filets\s*\{[^}]*grid-template-columns:\s*1fr;/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("[E8-03] Manifeste", () => {
  it("rend la citation avec le placeholder [PRÉNOM] conservé", () => {
    render(<Manifeste {...frDict.home.manifeste} />);
    expect(screen.getByRole("blockquote")).toHaveTextContent(
      frDict.home.manifeste.texte,
    );
    expect(screen.getByText(/\[PRÉNOM\]/)).toBeInTheDocument();
    expect(frDict.home.manifeste.signature).toContain("[PRÉNOM]");
  });
});
