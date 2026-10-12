import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { heroAccueil, produits } from "@/mocks/data";

const api = vi.hoisted(() => ({
  heroAccueil: vi.fn(),
  matiereAccueil: vi.fn(),
  produits: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

import HomePage from "./page";

const renderHome = async () =>
  render(await HomePage({ params: Promise.resolve({ locale: "fr" }) }));

beforeEach(() => {
  api.heroAccueil.mockResolvedValue({ ok: true, data: heroAccueil });
  api.matiereAccueil.mockResolvedValue({ ok: false });
});

describe("[E3-03] Homepage : section Deux gammes", () => {
  it("affiche la paire Classic / Premium du même modèle", async () => {
    api.produits.mockResolvedValue({ ok: true, data: { results: produits } });
    await renderHome();
    expect(api.produits).toHaveBeenCalledWith({ mis_en_avant: true });
    expect(
      screen.getByRole("heading", { name: "Deux gammes, une même forme" }),
    ).toBeInTheDocument();
    const liens = screen.getAllByRole("link", { name: /Lucerne/ });
    expect(liens.map((l) => l.getAttribute("href"))).toEqual([
      "/fr/produits/lucerne-classic",
      "/fr/produits/lucerne-premium",
    ]);
  });

  it("masque la section si aucun Premium ne correspond au Classic", async () => {
    api.produits.mockResolvedValue({
      ok: true,
      data: { results: produits.filter((p) => p.slug !== "lucerne-premium") },
    });
    await renderHome();
    expect(screen.queryByText("Deux gammes, une même forme")).toBeNull();
  });

  it("masque la section si l'API échoue", async () => {
    api.produits.mockResolvedValue({ ok: false });
    await renderHome();
    expect(screen.queryByText("Deux gammes, une même forme")).toBeNull();
  });
});
