import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { ajouterLigne: vi.fn() },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { AjoutPanier } from "@/components/AjoutPanier";
import { TOAST_DUREE_MS } from "@/components/ToastAjout";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;
const classic = produits[0];

const panier = {
  lignes: [
    {
      id: "l1",
      produit: classic,
      quantite: 1,
      numero_piece: null,
      reservation_expire_le: null,
    },
  ],
  sous_total_centimes: 0,
  frais_livraison_centimes: 0,
  tva_incluse_centimes: 0,
  taux_tva: "8.10",
  total_centimes: 0,
};

const rendre = () =>
  render(
    <AjoutPanier
      slug={classic.slug}
      gamme="Classic"
      panierHref="/fr/panier"
      textes={fr.fiche.cart}
    />,
  );

const bouton = () => screen.getByRole("button", { name: fr.fiche.cart.add });

beforeEach(() => api.ajouterLigne.mockReset());
afterEach(() => vi.useRealTimers());

describe("[E8-09] Critères d'acceptation (compléments)", () => {
  it("annoncée par les lecteurs d'écran : une seule région status, présente avant l'ajout", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier });
    const user = userEvent.setup();
    rendre();
    const avant = screen.getByRole("status");
    expect(avant).toBeEmptyDOMElement();
    await user.click(bouton());
    await screen.findByTestId("toast-ajout");
    // Même élément (donc annonce possible) et aucune seconde région.
    expect(screen.getAllByRole("status")).toEqual([avant]);
    expect(avant).toContainElement(screen.getByTestId("toast-ajout"));
  });

  it("aucun toast si l'ajout échoue", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: false,
      error: { code: "erreur", message: "x" },
    });
    const user = userEvent.setup();
    rendre();
    await user.click(bouton());
    expect(await screen.findByRole("status")).toHaveTextContent(
      fr.fiche.cart.errorGeneric,
    );
    expect(screen.queryByTestId("toast-ajout")).not.toBeInTheDocument();
  });

  it("ne se ferme pas avant la durée prévue", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier });
    rendre();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await act(async () => {
      bouton().click();
    });
    await screen.findByTestId("toast-ajout");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_DUREE_MS - 1000);
    });
    expect(screen.getByTestId("toast-ajout")).toBeInTheDocument();
  });

  it("le focus reste sur le bouton d'ajout (aucun vol de focus)", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier });
    const user = userEvent.setup();
    rendre();
    await user.click(bouton());
    await screen.findByTestId("toast-ajout");
    expect(screen.getByTestId("toast-ajout")).not.toContainElement(
      document.activeElement as HTMLElement,
    );
    expect(document.activeElement).not.toBe(
      screen.getByRole("link", { name: fr.fiche.cart.viewCart }),
    );
  });

  it("Échap sans toast affiché est sans effet", async () => {
    const user = userEvent.setup();
    rendre();
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("toast-ajout")).not.toBeInTheDocument();
    expect(api.ajouterLigne).not.toHaveBeenCalled();
  });

  it("un second ajout réaffiche le toast après fermeture", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier });
    const user = userEvent.setup();
    rendre();
    await user.click(bouton());
    await screen.findByTestId("toast-ajout");
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("toast-ajout")).not.toBeInTheDocument();
    await user.click(bouton());
    expect(await screen.findByTestId("toast-ajout")).toBeInTheDocument();
  });
});
