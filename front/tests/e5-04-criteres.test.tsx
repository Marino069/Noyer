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

const { api, push } = hoisted;
const REF = "NOY-2026-00042";
const STRIPE = "https://checkout.stripe.com/c/pay/cs_test_abc";
const OK = { ok: true, data: { methode: "stripe", url_paiement: STRIPE } };

const rendre = (props: Partial<React.ComponentProps<typeof Paiement>> = {}) => {
  const redirect = vi.fn();
  const view = render(
    <Paiement
      textes={fr.paiement}
      reference={REF}
      retour={null}
      panierHref="/fr/panier"
      redirect={redirect}
      {...props}
    />,
  );
  return { redirect, ...view };
};
const payer = () => screen.getByRole("button", { name: /Payer/ });

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  push.mockReset();
});

describe("E5-04 · critère 1 : redirection vers Stripe Checkout", () => {
  it("demande la session de la bonne commande puis redirige vers Stripe", async () => {
    api.payer.mockResolvedValue(OK);
    const { redirect } = rendre();
    await userEvent.setup().click(payer());
    await waitFor(() => expect(redirect).toHaveBeenCalledWith(STRIPE));
    expect(api.payer).toHaveBeenCalledWith(REF, "stripe");
  });

  it("mentionne TWINT (QR code / app) et la carte avant la redirection", () => {
    rendre();
    expect(screen.getByText(/QR code/)).toBeInTheDocument();
    expect(screen.getByText(/application sur mobile/)).toBeInTheDocument();
    expect(screen.getAllByText(/carte bancaire/).length).toBeGreaterThan(0);
  });

  it.each([
    "http://checkout.stripe.com/x",
    "https://checkout.stripe.com.evil.ch/x",
    "javascript:alert(1)",
    "https://evil.example/?https://checkout.stripe.com",
  ])("ne redirige jamais vers %s", async (url) => {
    api.payer.mockResolvedValue({
      ok: true,
      data: { methode: "stripe", url_paiement: url },
    });
    const { redirect } = rendre();
    await userEvent.setup().click(payer());
    await screen.findByText("Paiement indisponible");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("E5-04 · critère 2 : aucune donnée de carte dans notre front", () => {
  it("ne contient aucun champ de saisie ni iframe", () => {
    const { container } = rendre();
    expect(
      container.querySelectorAll("input, textarea, select, iframe"),
    ).toHaveLength(0);
    expect(screen.getByText(/Aucune donnée de carte/)).toBeInTheDocument();
  });

  it("n'envoie au back que la référence et la méthode", async () => {
    api.payer.mockResolvedValue(OK);
    rendre();
    await userEvent.setup().click(payer());
    await waitFor(() => expect(api.payer).toHaveBeenCalled());
    expect(api.payer.mock.calls[0]).toEqual([REF, "stripe"]);
  });
});

describe("E5-04 · critère 3 : annulation, échec, timeout, reprise", () => {
  it.each([
    ["annule", "Paiement annulé"],
    ["echec", "Paiement refusé"],
  ] as const)(
    "retour=%s : message et reprise sur la même commande",
    async (retour, titre) => {
      api.payer.mockResolvedValue(OK);
      const { redirect } = rendre({ retour });
      expect(screen.getByText(titre)).toBeVisible();
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Reprendre le paiement" }));
      await waitFor(() => expect(redirect).toHaveBeenCalledWith(STRIPE));
      expect(api.payer).toHaveBeenCalledWith(REF, "stripe");
      expect(api.creerCommande).not.toHaveBeenCalled();
    },
  );

  it("timeout : message, puis reprise possible", async () => {
    api.payer.mockResolvedValueOnce({
      ok: false,
      error: { kind: "timeout", status: 0, code: "delai_depasse", message: "" },
    });
    const { redirect } = rendre();
    const user = userEvent.setup();
    await user.click(payer());
    expect(await screen.findByText(/trop de temps/)).toBeVisible();
    api.payer.mockResolvedValueOnce(OK);
    await user.click(
      screen.getByRole("button", { name: "Reprendre le paiement" }),
    );
    await waitFor(() => expect(redirect).toHaveBeenCalledWith(STRIPE));
  });

  it.each([
    [
      "erreur serveur",
      { kind: "http", status: 500, code: "erreur", message: "" },
    ],
    ["réseau", { kind: "network", status: 0, code: "reseau", message: "" }],
  ])("%s : message et bouton réutilisable", async (_nom, error) => {
    api.payer.mockResolvedValueOnce({ ok: false, error });
    rendre();
    await userEvent.setup().click(payer());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Paiement indisponible",
    );
    expect(
      screen.getByRole("button", { name: "Reprendre le paiement" }),
    ).toBeEnabled();
  });

  it("commande déjà payée (409) : plus de bouton de paiement", async () => {
    api.payer.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 409, code: "deja_payee", message: "" },
    });
    rendre();
    await userEvent.setup().click(payer());
    expect(await screen.findByText("Commande déjà payée")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("le message d'issue est annoncé aux lecteurs d'écran (role=alert)", () => {
    rendre({ retour: "echec" });
    expect(screen.getByRole("alert")).toHaveTextContent("Paiement refusé");
  });

  it("sans référence : aucun appel de paiement, lien vers le panier", () => {
    rendre({ reference: null });
    expect(
      screen.getByRole("link", { name: "Retour au panier" }),
    ).toHaveAttribute("href", "/fr/panier");
    expect(api.payer).not.toHaveBeenCalled();
  });
});

describe("E5-04 · critère 4 : aucune double commande", () => {
  it("double et triple clic sur Payer : une seule demande de session", async () => {
    let fin: (v: unknown) => void = () => {};
    api.payer.mockReturnValue(new Promise((r) => (fin = r)));
    const { redirect } = rendre();
    const user = userEvent.setup();
    await user.dblClick(payer());
    await user.tripleClick(payer());
    expect(api.payer).toHaveBeenCalledTimes(1);
    fin(OK);
    await waitFor(() => expect(redirect).toHaveBeenCalledTimes(1));
    expect(api.payer).toHaveBeenCalledTimes(1);
  });

  it("après la redirection le bouton reste bloqué", async () => {
    api.payer.mockResolvedValue(OK);
    const { redirect } = rendre();
    const user = userEvent.setup();
    await user.click(payer());
    await waitFor(() => expect(redirect).toHaveBeenCalled());
    await user.click(payer());
    expect(api.payer).toHaveBeenCalledTimes(1);
  });

  it("retour arrière (pageshow persisté) : bouton utilisable, même commande", async () => {
    api.payer.mockResolvedValue(OK);
    const { redirect } = rendre();
    const user = userEvent.setup();
    await user.click(payer());
    await waitFor(() => expect(redirect).toHaveBeenCalledTimes(1));
    const evt = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(evt, "persisted", { value: true });
    window.dispatchEvent(evt);
    await waitFor(() => expect(payer()).toBeEnabled());
    await user.click(payer());
    await waitFor(() => expect(api.payer).toHaveBeenCalledTimes(2));
    expect(api.payer.mock.calls.map((c) => c[0])).toEqual([REF, REF]);
    expect(api.creerCommande).not.toHaveBeenCalled();
  });

  it("un pageshow non persisté ne débloque pas un paiement en cours", async () => {
    api.payer.mockReturnValue(new Promise(() => {}));
    rendre();
    const user = userEvent.setup();
    await user.click(payer());
    const evt = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(evt, "persisted", { value: false });
    window.dispatchEvent(evt);
    await user.click(payer());
    expect(api.payer).toHaveBeenCalledTimes(1);
  });

  it("double soumission du checkout : une seule commande créée", async () => {
    api.panier.mockResolvedValue({
      ok: true,
      data: {
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
        frais_livraison_centimes: 1500,
        tva_incluse_centimes: 1000,
        taux_tva: "8.10",
        total_centimes: 21500,
      },
    });
    let fin: (v: unknown) => void = () => {};
    api.creerCommande.mockReturnValue(new Promise((r) => (fin = r)));
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
    await screen.findByLabelText(/NPA/);
    await user.type(screen.getByLabelText(/Adresse e-mail/), "a@exemple.ch");
    await user.type(screen.getByLabelText(/Nom et prénom/), "Alice");
    await user.type(screen.getByLabelText(/Rue et numéro/), "Rue du Lac 1");
    await user.type(screen.getByLabelText(/NPA/), "1204");
    await user.type(screen.getByLabelText(/Localité/), "Genève");
    await user.click(screen.getByRole("checkbox"));
    const bouton = screen.getByRole("button", {
      name: /Continuer vers le paiement/,
    });
    await user.dblClick(bouton);
    await user.click(bouton);
    expect(api.creerCommande).toHaveBeenCalledTimes(1);
    fin({ ok: true, data: { reference: REF } });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/fr/panier/paiement?reference=${REF}`),
    );
    expect(push).toHaveBeenCalledTimes(1);
  });
});
