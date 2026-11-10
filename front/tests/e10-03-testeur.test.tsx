import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "@/components/Hero";
import frDict from "@/i18n/dictionaries/fr.json";

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

const img = (alt: string, slug: string) => ({
  alt,
  largeur_origine: 1600,
  hauteur_origine: 1200,
  sources: ([480, 960, 1600] as const).map((largeur) => ({
    largeur,
    url: `/m/${slug}-${largeur}.webp`,
  })),
});

const contenu = {
  titre: "La lumière, façonnée",
  mot_italique: "façonnée",
  cta_libelle: "Découvrir Lucerne Premium",
  image: img("Lampe de jour", "jour"),
};

const rendu = () =>
  render(
    <Hero
      contenu={contenu}
      ctaHref="/fr/produits/premium"
      surtitre="Genève"
      interrupteur={{
        allumee: img("", "jour-allumee"),
        libelleAllumer: frDict.interrupteur.allumer,
        libelleEteindre: frDict.interrupteur.eteindre,
      }}
    />,
  );

const images = (c: HTMLElement) =>
  Array.from(c.querySelectorAll("img")) as HTMLImageElement[];

describe("[E10-03] Hero : image prioritaire", () => {
  it("une seule image au rendu : l'allumée, en eager et haute priorité", () => {
    const { container } = rendu();
    const [a, ...reste] = images(container);
    expect(reste).toHaveLength(0);
    expect(a.getAttribute("src")).toContain("allumee");
    expect(a).toHaveAttribute("loading", "eager");
    expect(a).toHaveAttribute("fetchpriority", "high");
  });

  it("les dimensions sont réservées (anti-décalage de mise en page)", () => {
    const { container } = rendu();
    const [a] = images(container);
    expect(a).toHaveAttribute("width");
    expect(a).toHaveAttribute("height");
  });

  it("la version jour est chargée au survol de l'interrupteur", () => {
    const { container } = rendu();
    fireEvent.pointerEnter(screen.getByRole("button"));
    expect(images(container)).toHaveLength(2);
  });
});

describe("[E10-03] Hero : interrupteur", () => {
  it("allumé par défaut puis éteint → version jour visible, libellé inversé", async () => {
    const { container } = rendu();
    const bouton = screen.getByRole("button", {
      name: frDict.interrupteur.eteindre,
    });
    expect(bouton).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(bouton);
    expect(bouton).toHaveAttribute("aria-pressed", "false");
    expect(bouton).toHaveAccessibleName(frDict.interrupteur.allumer);
    const [allumee, jour] = images(container);
    expect(allumee).toHaveAttribute("data-visible", "false");
    expect(jour).toHaveAttribute("data-visible", "true");
    expect(jour.getAttribute("src")).toContain("jour-480");
  });

  it("rallumer rend la lampe allumée", async () => {
    const { container } = rendu();
    const b = screen.getByRole("button");
    await userEvent.click(b);
    await userEvent.click(b);
    expect(b).toHaveAttribute("aria-pressed", "true");
    expect(images(container)[0]).toHaveAttribute("data-visible", "true");
  });

  it("le titre reste un h1 unique avec le CTA", () => {
    rendu();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: contenu.cta_libelle }),
    ).toHaveAttribute("href", "/fr/produits/premium");
  });
});
