import { render, screen, within } from "@testing-library/react";
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

const TITRE = "Une forme, deux matières";

beforeEach(() => {
  api.heroAccueil.mockResolvedValue({ ok: true, data: heroAccueil });
  api.matiereAccueil.mockResolvedValue({ ok: false });
  api.produit.mockImplementation(async (slug: string) => ({
    ok: true,
    data: detailDe(produits.find((p) => p.slug === slug)!),
  }));
  api.disponibilite.mockImplementation(async (slug: string) => ({
    ok: true,
    data: slug.endsWith("premium")
      ? {
          gamme: "Premium",
          series: [
            {
              id: 1,
              taille_serie: 50,
              pieces_restantes: 12,
              numeros_disponibles: [3],
            },
          ],
        }
      : { gamme: "Classic", quantite_disponible: 4 },
  }));
});

describe("[E8-06] Homepage : comparaison des gammes", () => {
  it("affiche la paire Classic / Premium du même modèle, depuis l'API", async () => {
    api.produits.mockResolvedValue({ ok: true, data: { results: produits } });
    await renderHome();
    expect(api.produits).toHaveBeenCalledWith({ mis_en_avant: true });
    expect(api.produit).toHaveBeenCalledWith("lucerne-classic");
    expect(api.produit).toHaveBeenCalledWith("lucerne-premium");
    const region = screen.getByRole("region", { name: TITRE });
    const liens = within(region).getAllByRole("link");
    expect(liens.map((l) => l.getAttribute("href"))).toEqual([
      "/fr/produits/lucerne-classic",
      "/fr/produits/lucerne-premium",
    ]);
    expect(region).toHaveTextContent("Série numérotée de 50");
    expect(region).toHaveTextContent("H 42 · Ø 28 cm · E27");
  });

  it("masque la section si aucun Premium ne correspond au Classic", async () => {
    api.produits.mockResolvedValue({
      ok: true,
      data: { results: produits.filter((p) => p.slug !== "lucerne-premium") },
    });
    await renderHome();
    expect(screen.queryByText(TITRE)).toBeNull();
  });

  it("masque la section si l'API échoue", async () => {
    api.produits.mockResolvedValue({ ok: false });
    await renderHome();
    expect(screen.queryByText(TITRE)).toBeNull();
  });

  it("garde les cartes si la fiche détaillée est indisponible", async () => {
    api.produits.mockResolvedValue({ ok: true, data: { results: produits } });
    api.produit.mockResolvedValue({ ok: false });
    await renderHome();
    expect(screen.getByRole("region", { name: TITRE })).toBeInTheDocument();
  });
});

describe("[E8-06] Homepage : « À l'atelier en ce moment »", () => {
  it("affiche la disponibilité de chaque produit (stock ou pièces libres)", async () => {
    api.produits.mockResolvedValue({ ok: true, data: { results: produits } });
    await renderHome();
    const region = screen.getByRole("region", {
      name: "À l'atelier en ce moment",
    });
    const cartes = within(region).getAllByRole("article");
    expect(cartes).toHaveLength(3);
    expect(cartes[0]).toHaveTextContent("En stock");
    expect(cartes[1]).toHaveTextContent("12 pièces sur 50 encore libres");
    expect(api.disponibilite).toHaveBeenCalledWith("leman-classic");
  });

  it("n'affiche pas de disponibilité si l'API de disponibilité échoue", async () => {
    api.produits.mockResolvedValue({ ok: true, data: { results: produits } });
    api.disponibilite.mockResolvedValue({ ok: false });
    await renderHome();
    const region = screen.getByRole("region", {
      name: "À l'atelier en ce moment",
    });
    expect(region).not.toHaveTextContent("En stock");
    expect(within(region).getAllByRole("article")).toHaveLength(3);
  });
});
