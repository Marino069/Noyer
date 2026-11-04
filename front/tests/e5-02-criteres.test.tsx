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
import type { Panier as PanierData } from "@/lib/api";

const { api } = hoisted;
const premium = produits.find((p) => p.gamme === "Premium")!;

type LigneTest = { id: string; numero: number; expire: Date };
const panierAvec = (lignes: LigneTest[]): PanierData => ({
  lignes: lignes.map((l) => ({
    id: l.id,
    produit: premium,
    quantite: 1,
    numero_piece: l.numero,
    reservation_expire_le: l.expire.toISOString(),
  })),
  sous_total_centimes: premium.prix_ttc_centimes * lignes.length,
  frais_livraison_centimes: 0,
  tva_incluse_centimes: 0,
  taux_tva: "8.10",
  total_centimes: premium.prix_ttc_centimes * lignes.length,
});
const vide: PanierData = panierAvec([]);

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

const rendreAjout = (numeros: number[]) =>
  render(
    <AjoutPanier
      slug={premium.slug}
      gamme="Premium"
      numeros={numeros}
      panierHref="/fr/panier"
      textes={fr.fiche.cart}
    />,
  );

const indisponible = {
  ok: false,
  error: { code: "piece_indisponible", message: "" },
};

describe("E5-02 · critère 1 : réservation avec durée restante affichée", () => {
  it("le décompte diminue au fil du temps", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierAvec([
        { id: "a", numero: 7, expire: new Date(Date.now() + 5 * 60_000) },
      ]),
    });
    rendrePanier();
    const avant = (await screen.findByTestId("decompte")).textContent;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    const apres = screen.getByTestId("decompte").textContent;
    expect(apres).not.toBe(avant);
    expect(apres).toMatch(/encore 4 min \d\d s/);
  });

  it("chaque pièce Premium réservée a son propre décompte", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierAvec([
        { id: "a", numero: 7, expire: new Date(Date.now() + 5 * 60_000) },
        { id: "b", numero: 8, expire: new Date(Date.now() + 10 * 60_000) },
      ]),
    });
    rendrePanier();
    await screen.findAllByTestId("decompte");
    expect(screen.getAllByTestId("decompte")).toHaveLength(2);
  });

  it("l'ajout d'un Premium annonce le numéro réservé choisi et la durée", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: panierAvec([
        { id: "a", numero: 15, expire: new Date(Date.now() + 15 * 60_000) },
      ]),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    rendreAjout([3, 8, 15]);
    await user.selectOptions(screen.getByLabelText("Numéro de la pièce"), "15");
    await user.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    expect(api.ajouterLigne).toHaveBeenCalledWith({
      produit_slug: premium.slug,
      quantite: 1,
      numero: 15,
    });
    expect(
      await screen.findByText(/Pièce n° 15 réservée pour vous, encore 1\d min/),
    ).toBeInTheDocument();
  });

  // Bug #174 : le message doit annoncer la nouvelle ligne, pas la première réservée.
  it("attribution automatique : annonce le numéro de la pièce qui vient d'être réservée", async () => {
    // Le panier contenait déjà le n° 7 ; le back attribue le n° 8 à ce nouvel ajout.
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: panierAvec([
        { id: "a", numero: 7, expire: new Date(Date.now() + 5 * 60_000) },
        { id: "b", numero: 8, expire: new Date(Date.now() + 15 * 60_000) },
      ]),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    rendreAjout([8, 9]);
    await user.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    expect(
      await screen.findByText(/Pièce n° 8 réservée pour vous/),
    ).toBeInTheDocument();
  });
});

describe("E5-02 · critère 2 : expiration → message clair et retrait", () => {
  it("retire seulement la ligne expirée et garde les autres", async () => {
    const longue = new Date(Date.now() + 10 * 60_000);
    api.panier.mockResolvedValueOnce({
      ok: true,
      data: panierAvec([
        { id: "a", numero: 7, expire: new Date(Date.now() + 2_000) },
        { id: "b", numero: 8, expire: longue },
      ]),
    });
    api.panier.mockResolvedValue({
      ok: true,
      data: panierAvec([{ id: "b", numero: 8, expire: longue }]),
    });
    rendrePanier();
    await screen.findAllByTestId("decompte");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(screen.getAllByTestId("decompte")).toHaveLength(1);
    expect(screen.getByText("Pièce n° 8")).toBeInTheDocument();
    expect(screen.queryByText("Pièce n° 7")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/n° 7/);
  });

  it("le message d'expiration reste visible quand le panier devient vide", async () => {
    api.panier.mockResolvedValueOnce({
      ok: true,
      data: panierAvec([
        { id: "a", numero: 7, expire: new Date(Date.now() + 2_000) },
      ]),
    });
    api.panier.mockResolvedValue({ ok: true, data: vide });
    rendrePanier();
    await screen.findByTestId("decompte");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(screen.getByText(fr.panier.emptyTitle)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/a expiré/);
  });

  it("relit le panier côté back après l'expiration", async () => {
    api.panier.mockResolvedValueOnce({
      ok: true,
      data: panierAvec([
        { id: "a", numero: 7, expire: new Date(Date.now() + 2_000) },
      ]),
    });
    api.panier.mockResolvedValue({ ok: true, data: vide });
    rendrePanier();
    await screen.findByTestId("decompte");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(api.panier.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("une ligne déjà expirée au chargement n'est pas affichée", async () => {
    api.panier.mockResolvedValueOnce({
      ok: true,
      data: panierAvec([
        { id: "a", numero: 7, expire: new Date(Date.now() - 60_000) },
      ]),
    });
    api.panier.mockResolvedValue({ ok: true, data: vide });
    rendrePanier();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(screen.queryByTestId("decompte")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/a expiré/);
  });
});

describe("E5-02 · critère 3 : conflit → proposition d'un autre numéro", () => {
  it("ne propose jamais le numéro qui vient d'être refusé", async () => {
    api.ajouterLigne.mockResolvedValue(indisponible);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    rendreAjout([3, 8, 15]);
    await user.selectOptions(screen.getByLabelText("Numéro de la pièce"), "3");
    await user.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cette pièce vient d'être réservée",
    );
    expect(
      screen.queryByRole("button", { name: "Réserver plutôt le n° 3" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Réserver plutôt le n° (8|15)/ }),
    ).toBeInTheDocument();
  });

  it("conflit en attribution automatique : une proposition est faite", async () => {
    api.ajouterLigne.mockResolvedValue(indisponible);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    rendreAjout([3, 8]);
    await user.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    expect(
      await screen.findByRole("button", { name: /Réserver plutôt le n° \d+/ }),
    ).toBeInTheDocument();
  });

  it("aucune proposition quand aucun autre numéro n'est libre", async () => {
    api.ajouterLigne.mockResolvedValue(indisponible);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    rendreAjout([3]);
    await user.selectOptions(screen.getByLabelText("Numéro de la pièce"), "3");
    await user.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    await screen.findByText(/vient d'être réservée/);
    expect(
      screen.queryByRole("button", { name: /Réserver plutôt/ }),
    ).not.toBeInTheDocument();
  });

  it("une autre erreur que le conflit ne propose pas de numéro", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: false,
      error: { code: "erreur_serveur", message: "" },
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    rendreAjout([3, 8]);
    await user.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    await screen.findByText(fr.fiche.cart.errorGeneric);
    expect(
      screen.queryByRole("button", { name: /Réserver plutôt/ }),
    ).not.toBeInTheDocument();
  });

  it("appelle onUnavailable pour rafraîchir la disponibilité", async () => {
    api.ajouterLigne.mockResolvedValue(indisponible);
    const onUnavailable = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <AjoutPanier
        slug={premium.slug}
        gamme="Premium"
        numeros={[3, 8]}
        panierHref="/fr/panier"
        textes={fr.fiche.cart}
        onUnavailable={onUnavailable}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    await screen.findByText(/vient d'être réservée/);
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });
});
