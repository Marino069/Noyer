import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { panier: vi.fn(), creerCommande: vi.fn() },
  push: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: hoisted.push }),
}));

import { Checkout, NPA_SUISSE } from "@/components/Checkout";
import fr from "@/i18n/dictionaries/fr.json";
import type { Panier } from "@/lib/api";

const { api, push } = hoisted;

const panier = (livraison: number): Panier => ({
  lignes: [
    {
      id: "c1",
      produit: produits[0],
      quantite: 1,
      numero_piece: null,
      reservation_expire_le: null,
    },
  ],
  sous_total_centimes: produits[0].prix_ttc_centimes,
  frais_livraison_centimes: livraison,
  tva_incluse_centimes: 1000,
  taux_tva: "8.10",
  total_centimes: produits[0].prix_ttc_centimes + livraison,
});

const rendre = () =>
  render(
    <Checkout
      locale="fr"
      textes={fr.checkout}
      catalogueHref="/fr/produits"
      cgvHref="/fr/cgv"
      paiementHref="/fr/panier/paiement"
    />,
  );

async function remplir(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Adresse e-mail/), "a@exemple.ch");
  await user.type(screen.getByLabelText(/Nom et prénom/), "Alice Noyer");
  await user.type(screen.getByLabelText(/Rue et numéro/), "Rue du Rhône 1");
  await user.type(screen.getByLabelText(/NPA/), "1204");
  await user.type(screen.getByLabelText(/Localité/), "Genève");
}

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  push.mockReset();
  api.panier.mockResolvedValue({ ok: true, data: panier(1500) });
});

describe("E5-03 · checkout, coordonnées et livraison", () => {
  it("expose les attributs d'autocomplétion du navigateur", async () => {
    rendre();
    expect(await screen.findByLabelText(/Adresse e-mail/)).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText(/Nom et prénom/)).toHaveAttribute(
      "autocomplete",
      "name",
    );
    expect(screen.getByLabelText(/Rue et numéro/)).toHaveAttribute(
      "autocomplete",
      "address-line1",
    );
    expect(screen.getByLabelText(/NPA/)).toHaveAttribute(
      "autocomplete",
      "postal-code",
    );
    expect(screen.getByLabelText(/Localité/)).toHaveAttribute(
      "autocomplete",
      "address-level2",
    );
  });

  it("valide le format du NPA suisse", () => {
    expect(NPA_SUISSE.test("1204")).toBe(true);
    expect(NPA_SUISSE.test("120")).toBe(false);
    expect(NPA_SUISSE.test("12045")).toBe(false);
    expect(NPA_SUISSE.test("0123")).toBe(false);
    expect(NPA_SUISSE.test("abcd")).toBe(false);
  });

  it("affiche les frais avant paiement et les met à jour selon le mode", async () => {
    const user = userEvent.setup();
    rendre();
    const frais = await screen.findByTestId("frais");
    expect(frais).toHaveTextContent("CHF 15.–");
    const total = produits[0].prix_ttc_centimes + 1500;
    expect(screen.getByTestId("total")).toHaveTextContent(
      `CHF ${new Intl.NumberFormat("fr-CH").format(total / 100)}`.replace(
        /\s/g,
        " ",
      ),
    );

    await user.click(
      screen.getByRole("radio", { name: /Retrait à l'atelier/ }),
    );
    expect(screen.getByTestId("frais")).toHaveTextContent("gratuit");
    await user.click(
      screen.getByRole("radio", { name: /Livraison à l'adresse/ }),
    );
    expect(screen.getByTestId("frais")).toHaveTextContent("CHF 15.–");
  });

  it("propose un lien vers les CGV mentionnant le droit de rétractation", async () => {
    rendre();
    const lien = await screen.findByRole("link", {
      name: "conditions générales de vente",
    });
    expect(lien).toHaveAttribute("href", "/fr/cgv");
    expect(screen.getByText(/droit de rétractation/)).toBeInTheDocument();
  });

  it("signale les erreurs en ligne, de façon accessible", async () => {
    const user = userEvent.setup();
    rendre();
    const npa = await screen.findByLabelText(/NPA/);
    await user.type(npa, "12");
    await user.tab();
    expect(npa).toHaveAttribute("aria-invalid", "true");
    expect(npa).toHaveAccessibleDescription(/4 chiffres/);
    expect(
      screen
        .getAllByRole("alert")
        .some((a) => /NPA suisse/.test(a.textContent ?? "")),
    ).toBe(true);

    await user.clear(npa);
    await user.type(npa, "1204");
    await user.tab();
    expect(npa).not.toHaveAttribute("aria-invalid");
  });

  it("bloque l'envoi sans CGV, focus sur le premier champ en erreur", async () => {
    const user = userEvent.setup();
    rendre();
    await screen.findByLabelText(/Adresse e-mail/);
    await user.click(screen.getByRole("button", { name: /Continuer/ }));
    expect(screen.getByLabelText(/Adresse e-mail/)).toHaveFocus();
    expect(api.creerCommande).not.toHaveBeenCalled();

    await remplir(user);
    await user.click(screen.getByRole("button", { name: /Continuer/ }));
    const cgv = screen.getByRole("checkbox");
    expect(cgv).toHaveAttribute("aria-invalid", "true");
    expect(cgv).toHaveFocus();
    expect(api.creerCommande).not.toHaveBeenCalled();
  });

  it("crée la commande et passe au paiement", async () => {
    const user = userEvent.setup();
    api.creerCommande.mockResolvedValue({
      ok: true,
      data: {
        reference: "NOY-2026-00042",
        statut: "EnAttente",
        total_centimes: 1,
      },
    });
    rendre();
    await screen.findByLabelText(/Adresse e-mail/);
    await remplir(user);
    await user.click(
      screen.getByRole("radio", { name: /Retrait à l'atelier/ }),
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Continuer/ }));

    await waitFor(() => expect(api.creerCommande).toHaveBeenCalledTimes(1));
    expect(api.creerCommande).toHaveBeenCalledWith({
      email: "a@exemple.ch",
      adresse_livraison: {
        nom: "Alice Noyer",
        rue: "Rue du Rhône 1",
        npa: "1204",
        localite: "Genève",
        pays: "CH",
      },
      adresse_facturation: null,
      mode_livraison: "retrait_atelier",
      cgv_acceptees: true,
    });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/fr/panier/paiement?reference=NOY-2026-00042",
      ),
    );
  });

  it("annonce une réservation expirée", async () => {
    const user = userEvent.setup();
    api.creerCommande.mockResolvedValue({
      ok: false,
      error: { status: 410, code: "reservation_expiree", message: "" },
    });
    rendre();
    await screen.findByLabelText(/Adresse e-mail/);
    await remplir(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Continuer/ }));
    expect(
      await screen.findByText(fr.checkout.errors.expired),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("affiche l'état vide si le panier est vide", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: { ...panier(0), lignes: [] },
    });
    rendre();
    expect(
      await screen.findByText("Votre panier est vide"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continuer/ })).toBeNull();
  });
});
