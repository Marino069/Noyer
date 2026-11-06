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
import { useCartCount } from "@/lib/cart";

const { api } = hoisted;
const classic = produits[0];
const premium = produits[1];

const panier = (numero: number | null, slug = premium.slug) => ({
  lignes: [
    {
      id: "l1",
      produit: produits.find((p) => p.slug === slug)!,
      quantite: 1,
      numero_piece: numero,
      reservation_expire_le:
        numero === null ? null : new Date(Date.now() + 900_000).toISOString(),
    },
  ],
  sous_total_centimes: 0,
  frais_livraison_centimes: 0,
  tva_incluse_centimes: 0,
  taux_tva: "8.10",
  total_centimes: 0,
});

function Compteur() {
  return <span data-testid="compteur">{useCartCount()}</span>;
}

const rendre = (gamme: "Classic" | "Premium" = "Premium") =>
  render(
    <>
      <Compteur />
      <AjoutPanier
        slug={gamme === "Premium" ? premium.slug : classic.slug}
        gamme={gamme}
        numeros={gamme === "Premium" ? [3, 8] : []}
        total={50}
        panierHref="/fr/panier"
        textes={fr.fiche.cart}
      />
    </>,
  );

beforeEach(() => api.ajouterLigne.mockReset());
afterEach(() => vi.useRealTimers());

describe("[E8-09] Confirmation d'ajout au panier", () => {
  it("annonce l'ajout dans une région status avec vignette, numéro et lien", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(8) });
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole("button", { name: "N° 8" }));
    await user.click(
      screen.getByRole("button", { name: "Réserver la pièce N° 8" }),
    );
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/n° 8/);
    expect(status).toContainElement(screen.getByTestId("toast-ajout"));
    expect(
      screen.getByRole("img", { name: premium.image_principale!.alt }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: fr.fiche.cart.viewCart }),
    ).toHaveAttribute("href", "/fr/panier");
  });

  it("met à jour le compteur sans changer de page", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: panier(null, classic.slug),
    });
    const user = userEvent.setup();
    const avant = window.location.href;
    rendre("Classic");
    await user.click(screen.getByRole("button", { name: fr.fiche.cart.add }));
    await screen.findByTestId("toast-ajout");
    expect(screen.getByTestId("compteur")).toHaveTextContent("1");
    expect(window.location.href).toBe(avant);
  });

  it("se ferme avec Échap", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: panier(null, classic.slug),
    });
    const user = userEvent.setup();
    rendre("Classic");
    await user.click(screen.getByRole("button", { name: fr.fiche.cart.add }));
    await screen.findByTestId("toast-ajout");
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("toast-ajout")).not.toBeInTheDocument();
  });

  it("se ferme avec le bouton de fermeture", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: panier(null, classic.slug),
    });
    const user = userEvent.setup();
    rendre("Classic");
    await user.click(screen.getByRole("button", { name: fr.fiche.cart.add }));
    await user.click(
      await screen.findByRole("button", { name: fr.fiche.cart.dismiss }),
    );
    expect(screen.queryByTestId("toast-ajout")).not.toBeInTheDocument();
  });

  it("se ferme seule après quelques secondes", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: panier(null, classic.slug),
    });
    rendre("Classic");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await act(async () => {
      screen.getByRole("button", { name: fr.fiche.cart.add }).click();
    });
    expect(await screen.findByTestId("toast-ajout")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_DUREE_MS + 100);
    });
    expect(screen.queryByTestId("toast-ajout")).not.toBeInTheDocument();
  });
});
