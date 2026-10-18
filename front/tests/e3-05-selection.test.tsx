import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { heroAccueil, produits } from "@/mocks/data";

const api = vi.hoisted(() => ({
  heroAccueil: vi.fn(),
  matiereAccueil: vi.fn(),
  produits: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...api } };
});
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

import LocaleLoading from "@/app/[locale]/loading";
import * as pageModule from "@/app/[locale]/page";

const HomePage = pageModule.default;
const renderHome = async () =>
  render(await HomePage({ params: Promise.resolve({ locale: "fr" }) }));
const sel = fr.home.selection;

beforeEach(() => {
  api.heroAccueil.mockResolvedValue({ ok: true, data: heroAccueil });
  api.matiereAccueil.mockResolvedValue({ ok: false });
});

describe("[E3-05] Rendu serveur avec revalidation (ISR)", () => {
  it("revalide la page avec un délai fini et positif", () => {
    const { revalidate } = pageModule as { revalidate?: unknown };
    expect(typeof revalidate).toBe("number");
    expect(revalidate as number).toBeGreaterThan(0);
  });

  it("n'est pas forcée en rendu dynamique", () => {
    const { dynamic } = pageModule as { dynamic?: string };
    expect(dynamic).not.toBe("force-dynamic");
  });

  it("rend la sélection côté serveur (composant asynchrone)", async () => {
    api.produits.mockResolvedValue({ ok: true, data: { results: produits } });
    await renderHome();
    expect(
      screen.getByRole("heading", { level: 2, name: sel.title }),
    ).toBeInTheDocument();
  });
});

describe("[E3-05] États chargement / vide / erreur", () => {
  it("vide : affiche le message dédié", async () => {
    api.produits.mockResolvedValue({ ok: true, data: { results: [] } });
    await renderHome();
    expect(screen.getByText(sel.empty)).toBeInTheDocument();
  });

  it("erreur : alerte dans la section, la page ne plante pas", async () => {
    api.produits.mockResolvedValue({ ok: false });
    await renderHome();
    expect(screen.getByRole("alert")).toHaveTextContent(sel.errorMessage);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: fr.home.atelier.title }),
    ).toBeInTheDocument();
  });

  it("chargement : loading.tsx affiche un état occupé et annoncé", () => {
    render(<LocaleLoading />);
    expect(screen.getByRole("region", { name: sel.loading })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});

describe("[E3-05] Sélection pilotée par « mis en avant »", () => {
  it("demande à l'API uniquement les produits mis en avant", async () => {
    api.produits.mockResolvedValue({ ok: true, data: { results: [] } });
    await renderHome();
    expect(api.produits).toHaveBeenCalledWith({ mis_en_avant: true });
  });

  it("affiche exactement les produits renvoyés par l'API", async () => {
    api.produits.mockResolvedValue({
      ok: true,
      data: { results: produits.slice(0, 1) },
    });
    await renderHome();
    const region = screen.getByRole("region", { name: sel.title });
    expect(region.querySelectorAll("article")).toHaveLength(1);
  });
});
