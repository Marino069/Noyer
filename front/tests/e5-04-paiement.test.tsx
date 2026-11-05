import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ api: { payer: vi.fn() } }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { Paiement, urlStripeValide } from "@/components/Paiement";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;
const STRIPE = "https://checkout.stripe.com/c/pay/cs_test_1";

const rendre = (props: Partial<React.ComponentProps<typeof Paiement>> = {}) => {
  const redirect = vi.fn();
  render(
    <Paiement
      textes={fr.paiement}
      reference="NOY-2026-00042"
      retour={null}
      panierHref="/fr/panier"
      redirect={redirect}
      {...props}
    />,
  );
  return redirect;
};

beforeEach(() => api.payer.mockReset());

describe("E5-04 · paiement TWINT et carte", () => {
  it("redirige vers Stripe Checkout avec la méthode stripe", async () => {
    api.payer.mockResolvedValue({
      ok: true,
      data: { methode: "stripe", url_paiement: STRIPE },
    });
    const redirect = rendre();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Payer/ }));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith(STRIPE));
    expect(api.payer).toHaveBeenCalledWith("NOY-2026-00042", "stripe");
  });

  it("n'a aucun champ de carte : la saisie se fait chez Stripe", () => {
    rendre();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText(/Aucune donnée de carte/)).toBeInTheDocument();
    expect(screen.getByText(/QR code sur ordinateur/)).toBeInTheDocument();
  });

  it("refuse une redirection hors de Stripe", async () => {
    api.payer.mockResolvedValue({
      ok: true,
      data: { methode: "stripe", url_paiement: "https://pirate.example/x" },
    });
    const redirect = rendre();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Payer/ }));
    expect(await screen.findByText("Paiement indisponible")).toBeVisible();
    expect(redirect).not.toHaveBeenCalled();
    expect(urlStripeValide("http://checkout.stripe.com/x")).toBe(false);
    expect(urlStripeValide("https://evilstripe.com/x")).toBe(false);
    expect(urlStripeValide(STRIPE)).toBe(true);
  });

  it("n'envoie qu'une seule demande en cas de double clic", async () => {
    let fin: (v: unknown) => void = () => {};
    api.payer.mockReturnValue(new Promise((r) => (fin = r)));
    const redirect = rendre();
    const bouton = screen.getByRole("button", { name: /Payer/ });
    const user = userEvent.setup();
    await user.dblClick(bouton);
    await user.click(bouton);
    expect(api.payer).toHaveBeenCalledTimes(1);
    fin({ ok: true, data: { methode: "stripe", url_paiement: STRIPE } });
    await waitFor(() => expect(redirect).toHaveBeenCalledTimes(1));
  });

  it("affiche l'annulation et permet de reprendre la même commande", async () => {
    api.payer.mockResolvedValue({
      ok: true,
      data: { methode: "stripe", url_paiement: STRIPE },
    });
    const redirect = rendre({ retour: "annule" });
    expect(screen.getByText("Paiement annulé")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Reprendre le paiement" }));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith(STRIPE));
    expect(api.payer).toHaveBeenCalledWith("NOY-2026-00042", "stripe");
  });

  it("affiche l'échec du paiement avec reprise possible", () => {
    rendre({ retour: "echec" });
    expect(screen.getByText("Paiement refusé")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Reprendre le paiement" }),
    ).toBeEnabled();
  });

  it("gère le délai dépassé puis permet de réessayer", async () => {
    api.payer.mockResolvedValueOnce({
      ok: false,
      error: { kind: "timeout", status: 0, code: "delai_depasse", message: "" },
    });
    const redirect = rendre();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Payer/ }));
    expect(
      await screen.findByText("Le prestataire met trop de temps à répondre"),
    ).toBeVisible();
    api.payer.mockResolvedValueOnce({
      ok: true,
      data: { methode: "stripe", url_paiement: STRIPE },
    });
    await user.click(
      screen.getByRole("button", { name: "Reprendre le paiement" }),
    );
    await waitFor(() => expect(redirect).toHaveBeenCalledWith(STRIPE));
  });

  it("signale une commande déjà payée sans proposer de repayer", async () => {
    api.payer.mockResolvedValue({
      ok: false,
      error: {
        kind: "http",
        status: 409,
        code: "deja_payee",
        message: "",
      },
    });
    rendre();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Payer/ }));
    expect(await screen.findByText("Commande déjà payée")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("redevient utilisable après un retour arrière (bfcache)", async () => {
    let fin: (v: unknown) => void = () => {};
    api.payer.mockReturnValue(new Promise((r) => (fin = r)));
    rendre();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Payer/ }));
    fin({ ok: true, data: { methode: "stripe", url_paiement: STRIPE } });
    await waitFor(() => expect(api.payer).toHaveBeenCalledTimes(1));
    const evt = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(evt, "persisted", { value: true });
    window.dispatchEvent(evt);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Payer/ })).toBeEnabled(),
    );
  });

  it("sans référence, renvoie vers le panier", () => {
    rendre({ reference: null });
    expect(screen.getByText("Commande introuvable")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Retour au panier" }),
    ).toHaveAttribute("href", "/fr/panier");
  });
});
