import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { payer: vi.fn(), panier: vi.fn(), creerCommande: vi.fn() },
  push: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: hoisted.push }),
}));

import { Checkout } from "@/components/Checkout";
import { Paiement } from "@/components/Paiement";
import fr from "@/i18n/dictionaries/fr.json";
import type { Panier } from "@/lib/api";

const { api, push } = hoisted;

const virement = (delai_jours: number) => ({
  ok: true,
  data: {
    methode: "virement",
    iban: "CH9300762011623852957",
    beneficiaire: "Noyer Genève",
    reference: "NOY-2026-00099",
    delai_jours,
  },
});

const rendrePaiement = (premium: boolean, redirect = vi.fn()) =>
  render(
    <Paiement
      textes={fr.paiement}
      reference="NOY-2026-00099"
      retour={null}
      premium={premium}
      panierHref="/fr/panier"
      redirect={redirect}
    />,
  );

async function choisirVirement() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("radio", { name: /Virement bancaire/ }));
  await user.click(screen.getByRole("button", { name: "Choisir le virement" }));
}

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  push.mockReset();
});

describe("E5-05 · critère 1 : option visible uniquement avec du Premium", () => {
  it("masque tout choix de mode de paiement sans Premium", () => {
    rendrePaiement(false);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText(/virement/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Choisir le virement" }),
    ).toBeNull();
  });

  it("propose carte (par défaut) et virement avec du Premium", () => {
    rendrePaiement(true);
    expect(screen.getByRole("radio", { name: /TWINT ou carte/ })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /Virement bancaire/ }),
    ).not.toBeChecked();
  });

  it("garde le paiement Stripe par défaut même avec du Premium", async () => {
    api.payer.mockResolvedValue({
      ok: true,
      data: {
        methode: "stripe",
        url_paiement: "https://checkout.stripe.com/x",
      },
    });
    const redirect = vi.fn();
    rendrePaiement(true, redirect);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: fr.paiement.pay }));
    await waitFor(() =>
      expect(api.payer).toHaveBeenCalledWith("NOY-2026-00099", "stripe"),
    );
    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith("https://checkout.stripe.com/x"),
    );
  });

  describe("depuis le Checkout", () => {
    const premiumIdx = produits.findIndex((p) => p.gamme === "Premium");
    const classicIdx = produits.findIndex((p) => p.gamme === "Classic");

    const ligne = (i: number) => ({
      id: `c${i}`,
      produit: produits[i],
      quantite: 1,
      numero_piece: null,
      reservation_expire_le: null,
    });
    const panier = (idx: number[]): Panier => ({
      lignes: idx.map(ligne),
      sous_total_centimes: 20000,
      frais_livraison_centimes: 1500,
      tva_incluse_centimes: 1000,
      taux_tva: "8.10",
      total_centimes: 21500,
    });

    async function commander(idx: number[]) {
      api.panier.mockResolvedValue({ ok: true, data: panier(idx) });
      api.creerCommande.mockResolvedValue({
        ok: true,
        data: { reference: "NOY-2026-00099" },
      });
      render(
        <Checkout
          locale="fr"
          textes={fr.checkout}
          catalogueHref="/fr/produits"
          cgvHref="/fr/cgv"
          paiementHref="/fr/panier/paiement"
        />,
      );
      const user = userEvent.setup();
      await user.type(
        await screen.findByLabelText(/Adresse e-mail/),
        "a@exemple.ch",
      );
      await user.type(screen.getByLabelText(/Nom et prénom/), "Alice Noyer");
      await user.type(screen.getByLabelText(/Rue et numéro/), "Rue du Rhône 1");
      await user.type(screen.getByLabelText(/NPA/), "1204");
      await user.type(screen.getByLabelText(/Localité/), "Genève");
      const cgv = screen.queryByRole("checkbox");
      if (cgv) await user.click(cgv);
      await user.click(screen.getByRole("button", { name: /paiement/ }));
    }

    it("ajoute premium=1 si une ligne est Premium", async () => {
      await commander([classicIdx, premiumIdx]);
      await waitFor(() => expect(push).toHaveBeenCalled());
      expect(push.mock.calls[0][0]).toContain("premium=1");
    });

    it("n'ajoute pas premium=1 pour un panier Classic", async () => {
      await commander([classicIdx]);
      await waitFor(() => expect(push).toHaveBeenCalled());
      expect(push.mock.calls[0][0]).not.toContain("premium");
    });
  });
});

describe("E5-05 · critère 2 : confirmation avec coordonnées et référence", () => {
  it("demande le virement au back et affiche IBAN, bénéficiaire, référence", async () => {
    api.payer.mockResolvedValue(virement(5));
    rendrePaiement(true);
    await choisirVirement();
    expect(await screen.findByText("CH9300762011623852957")).toBeVisible();
    expect(api.payer).toHaveBeenCalledTimes(1);
    expect(api.payer).toHaveBeenCalledWith("NOY-2026-00099", "virement");
    expect(screen.getByText("Noyer Genève")).toBeVisible();
    expect(screen.getAllByText(/NOY-2026-00099/).length).toBeGreaterThan(0);
    expect(screen.getByText(/motif du virement/)).toBeVisible();
  });

  it("n'affiche pas de coordonnées si le back refuse le virement", async () => {
    api.payer.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 400, code: "erreur" },
    });
    rendrePaiement(true);
    await choisirVirement();
    await waitFor(() =>
      expect(screen.getByRole("alert")).not.toBeEmptyDOMElement(),
    );
    expect(screen.queryByText("CH9300762011623852957")).toBeNull();
  });
});

describe("E5-05 · critère 3 : délai de réservation prolongé affiché", () => {
  it.each([2, 7, 14])("affiche le délai renvoyé : %i jours", async (jours) => {
    api.payer.mockResolvedValue(virement(jours));
    rendrePaiement(true);
    await choisirVirement();
    expect(
      await screen.findByText(new RegExp(`réservée ${jours} jours`)),
    ).toBeVisible();
  });

  it("accorde au singulier pour 1 jour", async () => {
    api.payer.mockResolvedValue(virement(1));
    rendrePaiement(true);
    await choisirVirement();
    expect(await screen.findByText(/réservée 1 jour /)).toBeVisible();
  });

  it("annonce le délai prolongé avant de choisir le virement", async () => {
    rendrePaiement(true);
    await userEvent
      .setup()
      .click(screen.getByRole("radio", { name: /Virement bancaire/ }));
    expect(screen.getByText(/reste réservée plus longtemps/)).toBeVisible();
  });
});
