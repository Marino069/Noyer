import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hero } from "./Hero";
import { heroAccueil } from "@/mocks/data";

const preload = vi.hoisted(() => vi.fn());
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload,
}));

beforeEach(() => preload.mockClear());

const allumee = {
  alt: "",
  largeur_origine: 1600,
  hauteur_origine: 1200,
  sources: [480, 960, 1600].map((largeur) => ({
    largeur: largeur as 480 | 960 | 1600,
    url: `/mocks/lucerne-premium-allumee-${largeur}.webp`,
  })),
};

const contenu = {
  titre: heroAccueil.titre,
  mot_italique: null,
  cta_libelle: heroAccueil.cta_libelle,
  image: heroAccueil.image,
};

function rendu() {
  return render(
    <Hero
      contenu={contenu}
      ctaHref="#"
      interrupteur={{
        allumee,
        libelleAllumer: "Allumer la lampe",
        libelleEteindre: "Éteindre la lampe",
      }}
    />,
  );
}

const imgAllumee = (c: HTMLElement) =>
  c.querySelector('img[src*="allumee"]') as HTMLImageElement | null;
const imgJour = (c: HTMLElement) =>
  c.querySelector('img[src*="lucerne-premium-480"]') as HTMLImageElement | null;

describe("[E10-03] Hero : interrupteur, lampe allumée par défaut", () => {
  it("démarre allumé : bouton aria-pressed=true « Éteindre la lampe »", () => {
    const { container } = rendu();
    const bouton = screen.getByRole("button", { name: "Éteindre la lampe" });
    expect(bouton).toHaveAttribute("aria-pressed", "true");
    expect(imgAllumee(container)).toHaveAttribute("data-visible", "true");
  });

  it("l'image allumée est l'image LCP : eager, priorité haute, préchargée", () => {
    const { container } = rendu();
    const img = imgAllumee(container)!;
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("srcset");
    expect(preload).toHaveBeenCalledTimes(1);
    const [href, options] = preload.mock.calls[0];
    expect(href).toBe(allumee.sources[0].url);
    expect(options).toMatchObject({ as: "image", fetchPriority: "high" });
  });

  it("n'expose qu'une image à la fois aux lecteurs d'écran", async () => {
    const { container } = rendu();
    expect(screen.getByRole("img", { name: heroAccueil.image!.alt })).toBe(
      imgAllumee(container),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Éteindre la lampe" }),
    );
    expect(screen.getByRole("img", { name: heroAccueil.image!.alt })).toBe(
      imgJour(container),
    );
  });

  it("ne charge la version jour qu'au survol ou au premier clic", async () => {
    const { container } = rendu();
    expect(imgJour(container)).toBeNull();
    await userEvent.hover(
      screen.getByRole("button", { name: "Éteindre la lampe" }),
    );
    expect(imgJour(container)).toHaveAttribute("data-visible", "false");
  });

  it("éteindre affiche la version jour, rallumer revient à la lampe allumée", async () => {
    const { container } = rendu();
    await userEvent.click(
      screen.getByRole("button", { name: "Éteindre la lampe" }),
    );
    expect(
      screen.getByRole("button", { name: "Allumer la lampe" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(imgJour(container)).toHaveAttribute("data-visible", "true");
    expect(imgAllumee(container)).toHaveAttribute("data-visible", "false");
    await userEvent.click(
      screen.getByRole("button", { name: "Allumer la lampe" }),
    );
    expect(imgAllumee(container)).toHaveAttribute("data-visible", "true");
    expect(imgJour(container)).toHaveAttribute("data-visible", "false");
  });

  it("est utilisable au clavier (Entrée)", async () => {
    rendu();
    await userEvent.tab(); // interrupteur (avant le CTA dans le DOM)
    expect(screen.getByRole("button")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("n'affiche pas d'interrupteur sans version allumée", () => {
    render(<Hero contenu={contenu} ctaHref="#" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
