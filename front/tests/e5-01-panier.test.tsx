import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: {
    panier: vi.fn(),
    modifierLigne: vi.fn(),
    supprimerLigne: vi.fn(),
  },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { Panier } from "@/components/Panier";
import fr from "@/i18n/dictionaries/fr.json";
import type { Panier as PanierData } from "@/lib/api";

const { api } = hoisted;
const classic = produits[0];
const premium = produits[1];

const panierDe = (lignes: PanierData["lignes"], livraison = 0): PanierData => {
  const sous = lignes.reduce(
    (t, l) => t + l.produit.prix_ttc_centimes * l.quantite,
    0,
  );
  return {
    lignes,
    sous_total_centimes: sous,
    frais_livraison_centimes: livraison,
    tva_incluse_centimes: Math.round((sous * 8.1) / 108.1),
    taux_tva: "8.10",
    total_centimes: sous + livraison,
  };
};
const ligneClassic = (quantite: number) => ({
  id: "c1",
  produit: classic,
  quantite,
  numero_piece: null,
  reservation_expire_le: null,
});
const lignePremium = {
  id: "p1",
  produit: premium,
  quantite: 1,
  numero_piece: 7,
  reservation_expire_le: "2026-10-05T14:45:00+02:00",
};

const rendre = () =>
  render(
    <Panier
      locale="fr"
      textes={fr.panier}
      catalogueHref="/fr/produits"
      commandeHref="/fr/panier/commande"
    />,
  );

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
});

describe("E5-01 · page panier", () => {
  it("relit le panier côté back et affiche les lignes", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierDe([ligneClassic(2), lignePremium]),
    });
    rendre();
    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    expect(api.panier).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Pièce n° 7")).toBeInTheDocument();
  });

  it("affiche HT, TVA, livraison et total", async () => {
    const data = panierDe([ligneClassic(1)]);
    api.panier.mockResolvedValue({ ok: true, data });
    rendre();
    const recap = await screen.findByRole("region", { name: "Récapitulatif" });
    expect(within(recap).getByText("Sous-total HT")).toBeInTheDocument();
    expect(within(recap).getByText(/^TVA \(/)).toBeInTheDocument();
    expect(within(recap).getByText("Offerte")).toBeInTheDocument();
    expect(within(recap).getByText("Total TTC")).toBeInTheDocument();
    expect(
      within(recap).getByText(/8[.,]1\s?%/, { selector: "dt" }),
    ).toBeTruthy();
  });

  it("affiche les frais de livraison quand ils ne sont pas nuls", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierDe([ligneClassic(1)], 1500),
    });
    rendre();
    const recap = await screen.findByRole("region", { name: "Récapitulatif" });
    expect(within(recap).queryByText("Offerte")).not.toBeInTheDocument();
    expect(within(recap).getByText("CHF 15.–")).toBeInTheDocument();
  });

  it("modifie la quantité d'une ligne Classic", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierDe([ligneClassic(1)]),
    });
    api.modifierLigne.mockResolvedValue({
      ok: true,
      data: panierDe([ligneClassic(2)]),
    });
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: /Augmenter la quantité/ }),
    );
    expect(api.modifierLigne).toHaveBeenCalledWith("c1", 2);
    expect(await screen.findByText("2", { selector: "output" })).toBeVisible();
  });

  it("n'offre pas de quantité pour une pièce Premium", async () => {
    api.panier.mockResolvedValue({ ok: true, data: panierDe([lignePremium]) });
    rendre();
    await screen.findByRole("listitem");
    expect(
      screen.queryByRole("button", { name: /Augmenter la quantité/ }),
    ).not.toBeInTheDocument();
  });

  it("signale un stock insuffisant sans perdre le panier", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierDe([ligneClassic(7)]),
    });
    api.modifierLigne.mockResolvedValue({
      ok: false,
      error: { status: 409, code: "stock_insuffisant", message: "Stock" },
    });
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: /Augmenter la quantité/ }),
    );
    expect(
      await screen.findByText("Stock insuffisant pour cette quantité."),
    ).toBeInTheDocument();
    expect(screen.getByText("7", { selector: "output" })).toBeInTheDocument();
  });

  it("retire un article", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierDe([ligneClassic(1), lignePremium]),
    });
    api.supprimerLigne.mockResolvedValue({
      ok: true,
      data: panierDe([lignePremium]),
    });
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: /Retirer .*Classic/ }),
    );
    expect(api.supprimerLigne).toHaveBeenCalledWith("c1");
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(1),
    );
  });

  it("affiche un état dédié quand le panier est vide", async () => {
    api.panier.mockResolvedValue({ ok: true, data: panierDe([]) });
    rendre();
    expect(
      await screen.findByRole("heading", { name: "Votre panier est vide" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Découvrir les lampes" }),
    ).toHaveAttribute("href", "/fr/produits");
    expect(screen.queryByText("Total TTC")).not.toBeInTheDocument();
  });

  it("passe à l'état vide après avoir retiré le dernier article", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: panierDe([ligneClassic(1)]),
    });
    api.supprimerLigne.mockResolvedValue({ ok: true, data: panierDe([]) });
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: /Retirer/ }),
    );
    expect(
      await screen.findByText("Votre panier est vide"),
    ).toBeInTheDocument();
  });

  it("propose de réessayer si le panier ne charge pas", async () => {
    api.panier
      .mockResolvedValueOnce({
        ok: false,
        error: { status: 0, code: "reseau", message: "Réseau" },
      })
      .mockResolvedValueOnce({ ok: true, data: panierDe([ligneClassic(1)]) });
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: "Réessayer" }),
    );
    expect(await screen.findByRole("listitem")).toBeInTheDocument();
  });
});
