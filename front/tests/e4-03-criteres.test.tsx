import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detailDe, produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({ disponibilite: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted } };
});

import { FicheProduit } from "@/components/FicheProduit";
import fr from "@/i18n/dictionaries/fr.json";

const premium = detailDe(produits[1]);
const classic = detailDe(produits[0]);

const serie = (numeros: number[], taille = 50) => ({
  ok: true as const,
  data: {
    gamme: "Premium" as const,
    series: [
      {
        id: 1,
        taille_serie: taille,
        pieces_restantes: numeros.length,
        numeros_disponibles: numeros,
      },
    ],
  },
});

const rendre = (
  initial: Parameters<typeof FicheProduit>[0]["disponibilite"],
  produit = premium,
) =>
  render(
    <FicheProduit
      produit={produit}
      disponibilite={initial}
      locale="fr"
      shopEnabled
      textes={fr.fiche}
      prix={fr.price}
      badge={fr.badge}
    />,
  );

beforeEach(() => hoisted.disponibilite.mockReset());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("[E4-03] Critère : disponibilité rafraîchie côté client, pas de cache long", () => {
  it("relit la disponibilité quand l'onglet redevient visible", async () => {
    hoisted.disponibilite.mockResolvedValue(serie([3, 8, 15]));
    rendre(serie([3, 8, 15]));
    await act(async () => {});
    hoisted.disponibilite.mockResolvedValue(serie([15]));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await screen.findByText("1 pièce restante sur 50")).toBeVisible();
  });

  it("ne relit pas quand l'onglet est masqué", async () => {
    hoisted.disponibilite.mockResolvedValue(serie([3]));
    rendre(serie([3]));
    await waitFor(() => expect(hoisted.disponibilite).toHaveBeenCalled());
    const n = hoisted.disponibilite.mock.calls.length;
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(hoisted.disponibilite.mock.calls.length).toBe(n);
  });

  it("arrête les rafraîchissements au démontage", async () => {
    vi.useFakeTimers();
    hoisted.disponibilite.mockResolvedValue(serie([3]));
    const { unmount } = rendre(serie([3]));
    await act(async () => {});
    unmount();
    const n = hoisted.disponibilite.mock.calls.length;
    await vi.advanceTimersByTimeAsync(120_000);
    expect(hoisted.disponibilite.mock.calls.length).toBe(n);
  });

  it("l'appel HTTP de disponibilité est émis en cache: no-store", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(serie([1]).data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const actual =
      await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    await actual.api.disponibilite("lampe-x");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/produits/lampe-x/disponibilite/",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("Classic : la quantité est aussi rafraîchie", async () => {
    hoisted.disponibilite.mockResolvedValue({
      ok: true,
      data: { gamme: "Classic", quantite_disponible: 2 },
    });
    rendre(
      { ok: true, data: { gamme: "Classic", quantite_disponible: 9 } },
      classic,
    );
    await waitFor(() =>
      expect(hoisted.disponibilite).toHaveBeenCalledWith(classic.slug),
    );
    await waitFor(() => expect(screen.queryByText(/\b9\b/)).toBeNull());
  });
});

describe("[E4-03] Critère : série épuisée → état clair et proposition d'être prévenu", () => {
  it("une série vide propose e-mail + consentement et désactive l'achat", async () => {
    hoisted.disponibilite.mockResolvedValue(serie([]));
    rendre(serie([]));
    await act(async () => {});
    expect(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    ).toBeDisabled();
    expect(screen.getByLabelText(/Adresse e-mail/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("une fiche Classic épuisée n'affiche pas l'alerte de série", async () => {
    const vide = {
      ok: true as const,
      data: { gamme: "Classic" as const, quantite_disponible: 0 },
    };
    hoisted.disponibilite.mockResolvedValue(vide);
    rendre(vide, classic);
    await act(async () => {});
    expect(screen.getAllByText("Épuisé").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Série épuisée" })).toBeNull();
  });

  it("l'état épuisé disparaît si une pièce est de nouveau disponible", async () => {
    hoisted.disponibilite.mockResolvedValue(serie([7]));
    rendre(serie([]));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Série épuisée" }),
      ).toBeNull(),
    );
    expect(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    ).toBeEnabled();
  });
});
