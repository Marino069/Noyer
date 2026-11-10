import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { detailDe, heroAccueil, produits } from "@/mocks/data";

const api = vi.hoisted(() => ({
  heroAccueil: vi.fn(),
  matiereAccueil: vi.fn(),
  produits: vi.fn(),
  produit: vi.fn(),
  disponibilite: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...api } };
});
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

import HomePage from "./page";

const renderHome = async () =>
  render(await HomePage({ params: Promise.resolve({ locale: "fr" }) }));

const premium = (restantes: number, numeros: number[]) => ({
  ok: true,
  data: {
    gamme: "Premium",
    series: [
      {
        id: 1,
        taille_serie: 50,
        pieces_restantes: restantes,
        numeros_disponibles: numeros,
      },
    ],
  },
});

const mockDispo = (p: unknown) =>
  api.disponibilite.mockImplementation(async (slug: string) =>
    slug.endsWith("premium")
      ? p
      : { ok: true, data: { gamme: "Classic", quantite_disponible: 4 } },
  );

beforeEach(() => {
  api.heroAccueil.mockResolvedValue({ ok: true, data: heroAccueil });
  api.matiereAccueil.mockResolvedValue({ ok: false });
  api.produits.mockResolvedValue({ ok: true, data: { results: produits } });
  api.produit.mockImplementation(async (slug: string) => ({
    ok: true,
    data: detailDe(produits.find((p) => p.slug === slug)!),
  }));
});

describe("[E10-06] Accueil : section « La série »", () => {
  it("affiche les disponibilités venues de l'API", async () => {
    mockDispo(premium(3, [4, 9, 50]));
    await renderHome();
    expect(api.disponibilite).toHaveBeenCalledWith("lucerne-premium");
    const section = screen.getByRole("region", {
      name: /Cinquante pièces, pas une de plus/,
    });
    expect(section).toHaveTextContent("3 pièces libres sur 50");
  });

  it("suit la valeur de l'API (pas de nombre codé en dur)", async () => {
    mockDispo(premium(31, [1, 2, 3]));
    await renderHome();
    expect(screen.getByText("31 pièces libres sur 50")).toBeInTheDocument();
  });

  it("décrit la série aux lecteurs d'écran et masque la grille", async () => {
    mockDispo(premium(12, [3, 8, 15]));
    await renderHome();
    const section = screen.getByRole("region", { name: /Cinquante pièces/ });
    const resume = screen.getByText("12 pièces libres sur 50");
    expect(resume.closest('[aria-hidden="true"]')).toBeNull();
    const grille = section.querySelector('div[aria-hidden="true"]');
    expect(grille?.children).toHaveLength(50);
  });

  it("renvoie vers la fiche Premium", async () => {
    mockDispo(premium(12, [3]));
    await renderHome();
    expect(
      screen.getByRole("link", { name: "Choisir ma pièce" }),
    ).toHaveAttribute("href", "/fr/produits/lucerne-premium");
  });

  it("masque la section si la disponibilité Premium est indisponible", async () => {
    mockDispo({ ok: false });
    await renderHome();
    expect(screen.queryByText(/Cinquante pièces, pas une de plus/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Choisir ma pièce" })).toBeNull();
  });
});
