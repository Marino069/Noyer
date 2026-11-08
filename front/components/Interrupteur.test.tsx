import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Hero } from "./Hero";
import { heroAccueil } from "@/mocks/data";

const allumee = {
  alt: "",
  largeur_origine: 1600,
  hauteur_origine: 1200,
  sources: [480, 960, 1600].map((largeur) => ({
    largeur: largeur as 480 | 960 | 1600,
    url: `/mocks/lucerne-premium-allumee-${largeur}.webp`,
  })),
};

function rendu() {
  return render(
    <Hero
      contenu={{
        titre: heroAccueil.titre,
        mot_italique: null,
        sous_titre: heroAccueil.sous_titre,
        cta_libelle: heroAccueil.cta_libelle,
        image: heroAccueil.image,
      }}
      ctaHref="#"
      interrupteur={{
        allumee,
        libelleAllumer: "Allumer la lampe",
        libelleEteindre: "Éteindre la lampe",
      }}
    />,
  );
}

describe("[E9-01] Interrupteur : allumer la lampe", () => {
  it("est un bouton aria-pressed avec un libellé clair qui s'inverse", async () => {
    rendu();
    const bouton = screen.getByRole("button", { name: "Allumer la lampe" });
    expect(bouton).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(bouton);
    const eteindre = screen.getByRole("button", { name: "Éteindre la lampe" });
    expect(eteindre).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.lampe).toBe("allumee");
    await userEvent.click(eteindre);
    expect(
      screen.getByRole("button", { name: "Allumer la lampe" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.dataset.lampe).toBeUndefined();
  });

  it("ne charge l'image allumée qu'au survol ou au premier clic", async () => {
    const { container } = rendu();
    const src = () =>
      container.querySelector('img[src*="allumee"]') as HTMLImageElement | null;
    expect(src()).toBeNull();
    await userEvent.hover(
      screen.getByRole("button", { name: "Allumer la lampe" }),
    );
    expect(src()).not.toBeNull();
    expect(src()).toHaveAttribute("data-allumee", "false");
  });

  it("charge et affiche l'image allumée dès le premier clic", async () => {
    const { container } = rendu();
    await userEvent.click(
      screen.getByRole("button", { name: "Allumer la lampe" }),
    );
    expect(container.querySelector('img[src*="allumee"]')).toHaveAttribute(
      "data-allumee",
      "true",
    );
  });

  it("n'affiche pas d'interrupteur sans version allumée", () => {
    render(
      <Hero
        contenu={{
          titre: heroAccueil.titre,
          mot_italique: null,
          sous_titre: heroAccueil.sous_titre,
          cta_libelle: heroAccueil.cta_libelle,
          image: heroAccueil.image,
        }}
        ctaHref="#"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
