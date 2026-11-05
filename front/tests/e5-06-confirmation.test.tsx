import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  api: { commande: vi.fn(), payer: vi.fn() },
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
const REF = "NOY-2026-00042";

const commande = (statut: string) => ({
  ok: true,
  data: {
    reference: REF,
    statut,
    cree_le: "2026-10-05T14:30:00+02:00",
    lignes: [
      {
        nom_produit: "Lucerne Premium",
        gamme: "Premium",
        numero_piece: 7,
        prix_unitaire_centimes: 124000,
        quantite: 1,
      },
    ],
    total_centimes: 124000,
  },
});

const rendre = () =>
  render(
    <Confirmation
      textes={fr.confirmation}
      locale="fr"
      reference={REF}
      catalogueHref="/fr/produits"
    />,
  );

beforeEach(() => {
  api.commande.mockReset();
  sessionStorage.clear();
  sessionStorage.setItem(cleEmailCommande(REF), "client@exemple.ch");
});

describe("E5-06 · confirmation, échec et suivi", () => {
  it("affiche récapitulatif, numéro de pièce et prochaine étape", async () => {
    api.commande.mockResolvedValue(commande("Payee"));
    rendre();
    expect(await screen.findByText("Lucerne Premium")).toBeVisible();
    expect(screen.getByText("Pièce n° 7")).toBeVisible();
    expect(screen.getAllByText(/CHF 1.240.–/)).toHaveLength(2);
    expect(screen.getByText("Prochaine étape")).toBeVisible();
    expect(api.commande).toHaveBeenCalledWith(
      REF,
      "client@exemple.ch",
      expect.anything(),
    );
  });

  it("indique l'attente du paiement pour une commande en attente", async () => {
    api.commande.mockResolvedValue(commande("EnAttente"));
    rendre();
    expect(
      await screen.findByRole("heading", { name: "Commande enregistrée" }),
    ).toBeVisible();
  });

  it("explique quand la commande ne peut pas être relue", async () => {
    sessionStorage.clear();
    rendre();
    expect(await screen.findByText("Commande introuvable")).toBeVisible();
    expect(api.commande).not.toHaveBeenCalled();
  });

  it("échec : explication et retour au paiement de la même commande", () => {
    render(
      <Paiement
        textes={fr.paiement}
        reference={REF}
        retour="echec"
        panierHref="/fr/panier"
        redirect={vi.fn()}
      />,
    );
    expect(screen.getByText(fr.paiement.failedTitle)).toBeVisible();
    expect(screen.getByText(fr.paiement.failedMessage)).toBeVisible();
    expect(
      screen.getByRole("button", { name: fr.paiement.retry }),
    ).toBeVisible();
  });

  it("les deux pages sont non indexées", async () => {
    const params = Promise.resolve({ locale: "fr" });
    const a = await metaConfirmation({
      params,
      searchParams: Promise.resolve({}),
    });
    const b = await metaPaiement({ params, searchParams: Promise.resolve({}) });
    expect(a.robots).toEqual({ index: false, follow: false });
    expect(b.robots).toEqual({ index: false, follow: false });
  });
});
