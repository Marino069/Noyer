import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: {
    panier: vi.fn(),
    modifierLigne: vi.fn(),
    supprimerLigne: vi.fn(),
    ajouterLigne: vi.fn(),
  },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { AjoutPanier } from "@/components/AjoutPanier";
import { Panier } from "@/components/Panier";
import fr from "@/i18n/dictionaries/fr.json";
import { formatDuree } from "@/lib/format";
import type { Panier as PanierData } from "@/lib/api";

const { api } = hoisted;
const premium = produits[1];

const panierAvec = (expire: Date | null, numero = 7): PanierData => ({
  lignes: [
    {
      id: "p1",
      produit: premium,
      quantite: 1,
      numero_piece: numero,
      reservation_expire_le: expire ? expire.toISOString() : null,
    },
  ],
  sous_total_centimes: premium.prix_ttc_centimes,
  frais_livraison_centimes: 0,
  tva_incluse_centimes: 0,
  taux_tva: "8.10",
  total_centimes: premium.prix_ttc_centimes,
});
const vide: PanierData = {
  lignes: [],
  sous_total_centimes: 0,
  frais_livraison_centimes: 0,
  tva_incluse_centimes: 0,
  taux_tva: "8.10",
  total_centimes: 0,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  Object.values(api).forEach((m) => m.mockReset());
});
afterEach(() => vi.useRealTimers());

const rendrePanier = () =>
  render(
    <Panier
      locale="fr"
      textes={fr.panier}
      catalogueHref="/fr/produits"
      commandeHref="/fr/panier/commande"
    />,
  );

const rendreAjout = () =>
  render(
    <AjoutPanier
      slug={premium.slug}
      gamme="Premium"
      numeros={[3, 8, 15]}
      panierHref="/fr/panier"
      textes={fr.fiche.cart}
    />,
  );

describe("E5-02 · réservation temporaire", () => {
  it("formate la durée restante", () => {
    expect(formatDuree(14 * 60_000 + 5_000)).toBe("14 min 05 s");
    expect(formatDuree(-10)).toBe("0 min 00 s");
  });

  it("affiche la durée restante d'une pièce Premium réservée", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierAvec(new Date(Date.now() + 10 * 60_000)),
    });
    rendrePanier();
    expect(await screen.findByTestId("decompte")).toHaveTextContent(
      /Réservation : encore (9|10) min \d\d s/,
    );
  });

  it("à l'expiration, retire l'article et explique pourquoi", async () => {
    api.panier.mockResolvedValueOnce({
      ok: true,
      data: panierAvec(new Date(Date.now() + 3_000)),
    });
    api.panier.mockResolvedValue({ ok: true, data: vide });
    rendrePanier();
    await screen.findByTestId("decompte");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(screen.queryByTestId("decompte")).not.toBeInTheDocument();
    expect(
      await screen.findByText(/réservation de la pièce n° 7 .* a expiré/),
    ).toBeInTheDocument();
  });

  it("à l'ajout d'un Premium, annonce la réservation et sa durée", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: panierAvec(new Date(Date.now() + 15 * 60_000), 8),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    rendreAjout();
    await user.click(
      screen.getByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    );
    expect(
      await screen.findByText(/Pièce n° 8 réservée pour vous, encore 1\d min/),
    ).toBeInTheDocument();
  });

  it("en cas de conflit, propose un autre numéro et le réserve", async () => {
    api.ajouterLigne
      .mockResolvedValueOnce({
        ok: false,
        error: { code: "piece_indisponible", message: "" },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: panierAvec(new Date(Date.now() + 15 * 60_000), 8),
      });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    rendreAjout();
    await user.click(screen.getByRole("button", { name: "N° 3" }));
    await user.click(
      screen.getByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    );
    const proposition = await screen.findByRole("button", {
      name: "Réserver plutôt le n° 8",
    });
    await user.click(proposition);
    expect(api.ajouterLigne).toHaveBeenLastCalledWith({
      produit_slug: premium.slug,
      quantite: 1,
      numero: 8,
    });
    expect(await screen.findByText(/Pièce n° 8 réservée/)).toBeInTheDocument();
  });
});
