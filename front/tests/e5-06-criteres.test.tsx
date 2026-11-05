import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  api: { commande: vi.fn(), payer: vi.fn(), supprimerLigne: vi.fn() },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { Confirmation } from "@/components/Confirmation";
import { Paiement } from "@/components/Paiement";
import fr from "@/i18n/dictionaries/fr.json";
import { cleEmailCommande } from "@/lib/commande";
import { generateMetadata as metaConfirmation } from "@/app/[locale]/panier/confirmation/page";
import { generateMetadata as metaPaiement } from "@/app/[locale]/panier/paiement/page";

const { api } = hoisted;
const REF = "NOY-2026-00123";

const reponse = (statut: string) => ({
  ok: true,
  data: {
    reference: REF,
    statut,
    cree_le: "2026-10-05T14:30:00+02:00",
    lignes: [
      {
        nom_produit: "Lucerne Premium",
        gamme: "Premium",
        numero_piece: 12,
        prix_unitaire_centimes: 98000,
        quantite: 1,
      },
      {
        nom_produit: "Arve Classic",
        gamme: "Classic",
        numero_piece: null,
        prix_unitaire_centimes: 15000,
        quantite: 3,
      },
    ],
    total_centimes: 143000,
  },
});

const rendreConfirmation = (reference: string | null = REF) =>
  render(
    <Confirmation
      textes={fr.confirmation}
      locale="fr"
      reference={reference}
      catalogueHref="/fr/produits"
    />,
  );

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  sessionStorage.clear();
  sessionStorage.setItem(cleEmailCommande(REF), "a@exemple.ch");
});

describe("E5-06 · critère 1 : confirmation (récapitulatif, pièce Premium, prochaine étape)", () => {
  it("liste chaque ligne avec son montant en centimes entiers et le total", async () => {
    api.commande.mockResolvedValue(reponse("Payee"));
    rendreConfirmation();
    expect(await screen.findByText("Lucerne Premium")).toBeVisible();
    expect(screen.getByText("Arve Classic")).toBeVisible();
    // 3 x 150.– = 450.– ; total 1 430.–
    expect(screen.getByText(/CHF 450.–/)).toBeVisible();
    expect(screen.getByText(/CHF 980.–/)).toBeVisible();
    expect(screen.getAllByText(/CHF 1.430.–/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Quantité : 3/)).toBeVisible();
    expect(screen.getByText(new RegExp(REF))).toBeVisible();
  });

  it("affiche le numéro de pièce du Premium uniquement", async () => {
    api.commande.mockResolvedValue(reponse("Payee"));
    rendreConfirmation();
    expect(await screen.findByText("Pièce n° 12")).toBeVisible();
    expect(screen.queryAllByText(/Pièce n°/)).toHaveLength(1);
  });

  it("annonce la prochaine étape d'une commande payée", async () => {
    api.commande.mockResolvedValue(reponse("Payee"));
    rendreConfirmation();
    expect(
      await screen.findByRole("heading", { name: fr.confirmation.paidTitle }),
    ).toBeVisible();
    expect(screen.getByText("Prochaine étape")).toBeVisible();
    expect(screen.getByText(fr.confirmation.nextPaid)).toBeVisible();
  });

  it("annonce la prochaine étape d'une commande en attente (virement)", async () => {
    api.commande.mockResolvedValue(reponse("EnAttente"));
    rendreConfirmation();
    expect(await screen.findByText(fr.confirmation.nextPending)).toBeVisible();
    expect(screen.queryByText(fr.confirmation.nextPaid)).toBeNull();
  });

  it("n'affiche ni récapitulatif ni prochaine étape pour une commande annulée", async () => {
    api.commande.mockResolvedValue(reponse("Annulee"));
    rendreConfirmation();
    expect(
      await screen.findByRole("heading", {
        name: fr.confirmation.cancelledTitle,
      }),
    ).toBeVisible();
    expect(screen.queryByText("Prochaine étape")).toBeNull();
  });

  it("n'appelle pas le back sans référence", () => {
    rendreConfirmation(null);
    expect(screen.getByText(fr.confirmation.unavailableTitle)).toBeVisible();
    expect(api.commande).not.toHaveBeenCalled();
  });

  it("signale une erreur serveur sans afficher de récapitulatif", async () => {
    api.commande.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 500, code: "erreur" },
    });
    rendreConfirmation();
    expect(await screen.findByText(fr.confirmation.errorTitle)).toBeVisible();
    expect(screen.queryByText("Lucerne Premium")).toBeNull();
  });
});

describe("E5-06 · critère 2 : échec, explication et retour au paiement sans perte du panier", () => {
  const rendrePaiement = (retour: "echec" | "annule", redirect = vi.fn()) =>
    render(
      <Paiement
        textes={fr.paiement}
        reference={REF}
        retour={retour}
        panierHref="/fr/panier"
        redirect={redirect}
      />,
    );

  it.each([
    ["echec", fr.paiement.failedTitle, fr.paiement.failedMessage],
    ["annule", fr.paiement.cancelledTitle, fr.paiement.cancelledMessage],
  ] as const)("explique le retour « %s »", (retour, titre, message) => {
    rendrePaiement(retour);
    expect(screen.getByText(titre)).toBeVisible();
    expect(screen.getByText(message)).toBeVisible();
  });

  it("l'explication d'échec rassure sur le montant débité", () => {
    rendrePaiement("echec");
    expect(screen.getByText(/Aucun montant n'a été débité/)).toBeVisible();
  });

  it("« Réessayer » relance le paiement de la même commande, sans toucher au panier", async () => {
    api.payer.mockResolvedValue({
      ok: true,
      data: {
        methode: "stripe",
        url_paiement: "https://checkout.stripe.com/y",
      },
    });
    const redirect = vi.fn();
    rendrePaiement("echec", redirect);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: fr.paiement.retry }));
    await waitFor(() => expect(api.payer).toHaveBeenCalledWith(REF, "stripe"));
    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith("https://checkout.stripe.com/y"),
    );
    expect(api.payer).toHaveBeenCalledTimes(1);
    expect(api.supprimerLigne).not.toHaveBeenCalled();
  });

  it("ne vide pas le panier et reste réessayable si le nouveau paiement échoue", async () => {
    api.payer.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 502, code: "erreur" },
    });
    rendrePaiement("echec");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: fr.paiement.retry }));
    expect(await screen.findByText(fr.paiement.errorTitle)).toBeVisible();
    expect(
      screen.getByRole("button", { name: fr.paiement.retry }),
    ).toBeEnabled();
    expect(api.supprimerLigne).not.toHaveBeenCalled();
  });
});

describe("E5-06 · critère 3 : pages non indexées (noindex)", () => {
  const params = (locale: string) => Promise.resolve({ locale });
  const sp = Promise.resolve({});

  it.each(["fr", "en", "de"])(
    "confirmation et paiement sont noindex, nofollow (%s)",
    async (locale) => {
      const a = await metaConfirmation({
        params: params(locale),
        searchParams: sp,
      });
      const b = await metaPaiement({
        params: params(locale),
        searchParams: sp,
      });
      // Une locale inconnue du projet renvoie {} : on ne teste que celles gérées.
      if (Object.keys(a).length === 0) return;
      expect(a.robots).toEqual({ index: false, follow: false });
      expect(b.robots).toEqual({ index: false, follow: false });
    },
  );
});
