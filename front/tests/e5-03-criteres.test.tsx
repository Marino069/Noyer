import { render, screen, waitFor, within } from "@testing-library/react";
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

import { Checkout } from "@/components/Checkout";
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
  sous_total_centimes: 20000,
  frais_livraison_centimes: livraison,
  tva_incluse_centimes: 1000,
  taux_tva: "8.10",
  total_centimes: 20000 + livraison,
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

type User = ReturnType<typeof userEvent.setup>;
async function remplir(user: User) {
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

describe("E5-03 · critère 1 : adresse suisse et autocomplétion", () => {
  it("propose NPA, localité et un pays fixé à la Suisse", async () => {
    rendre();
    const npa = await screen.findByLabelText(/NPA/);
    expect(npa).toHaveAttribute("inputmode", "numeric");
    expect(npa).toHaveAttribute("maxlength", "4");
    expect(screen.getByLabelText(/Localité/)).toBeInTheDocument();
    const pays = screen.getByLabelText(/Pays/);
    expect(pays).toHaveValue("Suisse");
    expect(pays).toHaveAttribute("readonly");
  });

  it("déclare les jetons autocomplete standards", async () => {
    rendre();
    await screen.findByLabelText(/NPA/);
    const attendu: Record<string, string> = {
      "Adresse e-mail": "email",
      "Nom et prénom": "name",
      "Rue et numéro": "address-line1",
      NPA: "postal-code",
      Localité: "address-level2",
    };
    for (const [label, token] of Object.entries(attendu)) {
      expect(screen.getByLabelText(new RegExp(label))).toHaveAttribute(
        "autocomplete",
        token,
      );
    }
  });

  it.each(["0999", "123", "12a4", "0000"])(
    "refuse le NPA invalide %s",
    async (valeur) => {
      const user = userEvent.setup();
      rendre();
      const npa = await screen.findByLabelText(/NPA/);
      await user.type(npa, valeur);
      await user.tab();
      expect(npa).toHaveAttribute("aria-invalid", "true");
    },
  );

  it.each(["1000", "1204", "9999"])("accepte le NPA %s", async (valeur) => {
    const user = userEvent.setup();
    rendre();
    const npa = await screen.findByLabelText(/NPA/);
    await user.type(npa, valeur);
    await user.tab();
    expect(npa).not.toHaveAttribute("aria-invalid", "true");
  });
});

describe("E5-03 · critère 2 : livraison / retrait et frais", () => {
  it("affiche les frais dans les libellés des deux modes", async () => {
    rendre();
    expect(
      await screen.findByRole("radio", { name: /Livraison.*CHF 15/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /Retrait à l'atelier.*gratuit/ }),
    ).not.toBeChecked();
  });

  it("met à jour frais et total selon le mode, avant paiement", async () => {
    const user = userEvent.setup();
    rendre();
    const total = await screen.findByTestId("total");
    expect(total.textContent).toMatch(/215/);
    await user.click(screen.getByRole("radio", { name: /Retrait/ }));
    expect(screen.getByTestId("total").textContent).toMatch(/200/);
    expect(screen.getByTestId("total").textContent).not.toMatch(/215/);
    expect(screen.getByTestId("frais")).toHaveTextContent("gratuit");
    expect(api.creerCommande).not.toHaveBeenCalled();
  });

  it("n'invente pas de frais : livraison gratuite si le panier l'indique", async () => {
    api.panier.mockResolvedValue({ ok: true, data: panier(0) });
    rendre();
    expect(await screen.findByTestId("frais")).toHaveTextContent("gratuit");
    expect(screen.getByTestId("total").textContent).toMatch(/200/);
  });

  it("transmet le mode choisi à l'API", async () => {
    const user = userEvent.setup();
    api.creerCommande.mockResolvedValue({
      ok: true,
      data: { reference: "NOY-1", statut: "EnAttente", total_centimes: 1 },
    });
    rendre();
    await screen.findByLabelText(/NPA/);
    await remplir(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /paiement/ }));
    await waitFor(() => expect(api.creerCommande).toHaveBeenCalled());
    expect(api.creerCommande.mock.calls[0][0].mode_livraison).toBe("livraison");
  });
});

describe("E5-03 · critère 3 : CGV", () => {
  it("lie les CGV (nouvel onglet) et mentionne le droit de rétractation", async () => {
    rendre();
    const lien = await screen.findByRole("link", {
      name: /conditions générales/,
    });
    expect(lien).toHaveAttribute("href", "/fr/cgv");
    expect(lien).toHaveAttribute("target", "_blank");
    expect(lien.getAttribute("rel")).toMatch(/noopener/);
    const caseCgv = screen.getByRole("checkbox");
    expect(caseCgv).not.toBeChecked();
    expect(caseCgv).toBeRequired();
    expect(screen.getByLabelText(/droit de rétractation/)).toBe(caseCgv);
  });

  it("ne crée pas de commande tant que les CGV ne sont pas acceptées", async () => {
    const user = userEvent.setup();
    rendre();
    await screen.findByLabelText(/NPA/);
    await remplir(user);
    await user.click(screen.getByRole("button", { name: /paiement/ }));
    expect(api.creerCommande).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("E5-03 · critère 4 : validation en ligne, erreurs accessibles", () => {
  it("valide au blur et relie l'erreur au champ via aria-describedby", async () => {
    const user = userEvent.setup();
    rendre();
    const email = await screen.findByLabelText(/Adresse e-mail/);
    await user.type(email, "pas-un-mail");
    await user.tab();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(/adresse e-mail valide/);
    await user.clear(email);
    await user.type(email, "a@exemple.ch");
    await user.tab();
    expect(email).not.toHaveAttribute("aria-invalid", "true");
  });

  it("signale chaque champ obligatoire vide au blur", async () => {
    const user = userEvent.setup();
    rendre();
    for (const label of [/Nom et prénom/, /Rue et numéro/, /Localité/]) {
      const champ = await screen.findByLabelText(label);
      await user.click(champ);
      await user.tab();
      expect(champ).toHaveAttribute("aria-invalid", "true");
    }
  });

  it("annonce les erreurs dans une zone role=alert", async () => {
    const user = userEvent.setup();
    rendre();
    await screen.findByLabelText(/NPA/);
    await user.click(screen.getByRole("button", { name: /paiement/ }));
    const texte = screen
      .getAllByRole("alert")
      .map((a) => a.textContent)
      .join(" ");
    expect(texte).toMatch(/erreurs/);
  });

  it("met le focus sur le premier champ en erreur à l'envoi", async () => {
    const user = userEvent.setup();
    rendre();
    await screen.findByLabelText(/NPA/);
    await user.type(screen.getByLabelText(/Adresse e-mail/), "a@exemple.ch");
    await user.type(screen.getByLabelText(/Nom et prénom/), "Alice");
    await user.click(screen.getByRole("button", { name: /paiement/ }));
    expect(screen.getByLabelText(/Rue et numéro/)).toHaveFocus();
    expect(api.creerCommande).not.toHaveBeenCalled();
  });

  it("donne un nom accessible à chaque champ et marque l'e-mail obligatoire", async () => {
    rendre();
    await screen.findByLabelText(/NPA/);
    const form = screen.getByRole("form");
    for (const champ of within(form).getAllByRole("textbox")) {
      expect(champ).toHaveAccessibleName();
    }
    expect(screen.getByLabelText(/Adresse e-mail/)).toBeRequired();
  });
});

describe("E5-03 · soumission", () => {
  it("envoie la commande puis redirige vers le paiement", async () => {
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
    await screen.findByLabelText(/NPA/);
    await remplir(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /paiement/ }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/fr/panier/paiement?reference=NOY-2026-00042",
      ),
    );
    expect(api.creerCommande.mock.calls[0][0]).toMatchObject({
      email: "a@exemple.ch",
      cgv_acceptees: true,
      adresse_livraison: { npa: "1204", pays: "CH" },
    });
  });

  it("affiche une erreur serveur générique sans rediriger", async () => {
    const user = userEvent.setup();
    api.creerCommande.mockResolvedValue({
      ok: false,
      error: { status: 500, code: "erreur", message: "" },
    });
    rendre();
    await screen.findByLabelText(/NPA/);
    await remplir(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /paiement/ }));
    expect(
      await screen.findByText(fr.checkout.errors.server),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
