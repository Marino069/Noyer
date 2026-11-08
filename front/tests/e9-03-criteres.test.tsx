import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GalerieEmpilee } from "@/components/GalerieEmpilee";
import { Matiere } from "@/components/Matiere";
import fr from "@/i18n/dictionaries/fr.json";
import { matiereAccueil } from "@/mocks/data";
import type { Image } from "@/lib/api/types";

// Tests écrits à partir des critères de l'issue #299 (E9-03, loupe d'atelier),
// vérifiés sur les intégrations réelles (« La matière » et la fiche produit).

const img = (alt: string, nom: string): Image => ({
  alt,
  largeur_origine: 1600,
  hauteur_origine: 1200,
  sources: [480, 960, 1600].map((largeur) => ({
    largeur: largeur as 480 | 960 | 1600,
    url: `/mocks/${nom}-${largeur}.webp`,
  })),
});

const grains1600 = (c: HTMLElement) =>
  Array.from(c.querySelectorAll("img")).filter((i) =>
    i.getAttribute("src")?.endsWith("-1600.webp"),
  );

const lentilles = (c: HTMLElement) =>
  Array.from(c.querySelectorAll("div[aria-hidden='true'][data-visible]"));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("[E9-03] Loupe sur « La matière »", () => {
  const rendre = () =>
    render(<Matiere contenu={matiereAccueil} {...fr.home.matiere} />);
  const zoneDe = (i: number) =>
    screen.getAllByRole("figure")[i].querySelector("img")!.parentElement!;

  it("aucune image 1600 n'est rendue tant qu'on n'a pas interagi", () => {
    const { container } = rendre();
    expect(grains1600(container)).toHaveLength(0);
  });

  it("chaque figure (3) a sa loupe, masquée au départ", () => {
    const { container } = rendre();
    expect(lentilles(container)).toHaveLength(3);
    lentilles(container).forEach((l) =>
      expect(l).toHaveAttribute("data-visible", "false"),
    );
  });

  it("le survol souris d'une figure charge seulement son image 1600", () => {
    const { container } = rendre();
    fireEvent.pointerEnter(zoneDe(0), {
      pointerType: "mouse",
      clientX: 10,
      clientY: 10,
    });
    const grains = grains1600(container);
    expect(grains).toHaveLength(1);
    expect(grains[0]).toHaveAttribute("src", "/mocks/matiere-noyer-1600.webp");
  });

  it("la loupe est décorative : l'alt de l'image visible reste la description", () => {
    const { container } = rendre();
    fireEvent.pointerEnter(zoneDe(0), { pointerType: "mouse" });
    grains1600(container).forEach((g) => {
      expect(g).toHaveAttribute("alt", "");
      expect(g.closest("[aria-hidden='true']")).not.toBeNull();
    });
    const figure = screen.getAllByRole("figure")[0];
    expect(
      within(figure).getByRole("img", {
        name: "Grain de noyer huilé, gros plan",
      }),
    ).toBeInTheDocument();
    expect(within(figure).getAllByRole("img")).toHaveLength(1);
  });

  it("tactile : rien au simple toucher, la loupe s'ouvre après l'appui long", () => {
    const { container } = rendre();
    fireEvent.pointerDown(zoneDe(0), {
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    act(() => void vi.advanceTimersByTime(100));
    expect(grains1600(container)).toHaveLength(0);
    act(() => void vi.advanceTimersByTime(400));
    expect(grains1600(container)).toHaveLength(1);
  });
});

describe("[E9-03] Loupe sur le gros plan de la fiche", () => {
  const medias = [
    img("Vue d'ensemble", "lampe"),
    img("Vue 2", "lampe2"),
    img("Vue 3", "lampe3"),
    img("Gros plan du grain de noyer", "grain"),
  ];
  const rendre = () =>
    render(
      <GalerieEmpilee medias={medias} vide="Aucune photo" label="Photos" />,
    );

  it("n'a ni loupe visible ni image 1600 de la matière avant interaction", () => {
    const { container } = rendre();
    expect(grains1600(container).filter((i) => i.alt === "")).toHaveLength(0);
    lentilles(container).forEach((l) =>
      expect(l).toHaveAttribute("data-visible", "false"),
    );
  });

  it("charge l'image 1600 du gros plan au survol et garde l'alt descriptif", () => {
    const { container } = rendre();
    const visible = screen.getByAltText("Gros plan du grain de noyer");
    fireEvent.pointerEnter(visible.parentElement!, { pointerType: "mouse" });
    const grains = grains1600(container).filter((i) => i.alt === "");
    expect(grains).toHaveLength(1);
    expect(grains[0]).toHaveAttribute("src", "/mocks/grain-1600.webp");
    expect(screen.getAllByAltText("Gros plan du grain de noyer")).toHaveLength(
      1,
    );
  });

  it("pas de loupe sur les autres vues de la galerie", () => {
    const { container } = rendre();
    expect(lentilles(container)).toHaveLength(1);
  });
});
