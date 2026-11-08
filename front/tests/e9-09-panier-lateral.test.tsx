import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: {
    ajouterLigne: vi.fn(),
    modifierLigne: vi.fn(),
    supprimerLigne: vi.fn(),
  },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { AjoutPanier } from "@/components/AjoutPanier";
import { CartIndicator } from "@/components/CartIndicator";
import fr from "@/i18n/dictionaries/fr.json";
import { CIBLE_PANIER } from "@/lib/vol";

const { api } = hoisted;
const classic = produits[0];
const premium = produits[1];

const panier = (
  quantite = 1,
  gamme: "Classic" | "Premium" = "Classic",
  sousTotal = 12300,
) => {
  const produit = gamme === "Classic" ? classic : premium;
  return {
    lignes: [
      {
        id: "l1",
        produit,
        quantite,
        numero_piece: gamme === "Premium" ? 8 : null,
        reservation_expire_le:
          gamme === "Premium"
            ? new Date(Date.now() + 900_000).toISOString()
            : null,
      },
    ],
    sous_total_centimes: sousTotal,
    frais_livraison_centimes: 0,
    tva_incluse_centimes: 0,
    taux_tva: "8.10",
    total_centimes: sousTotal,
  };
};

const rendre = (gamme: "Classic" | "Premium" = "Classic") =>
  render(
    <>
      <AjoutPanier
        slug={gamme === "Classic" ? classic.slug : premium.slug}
        gamme={gamme}
        numeros={gamme === "Premium" ? [8] : []}
        total={50}
        panierHref="/fr/panier"
        locale="fr"
        textes={fr.fiche.cart}
      />
    </>,
  );

const ajouter = () => screen.getByRole("button", { name: fr.fiche.cart.add });

beforeEach(() => {
  api.ajouterLigne.mockReset();
  api.modifierLigne.mockReset();
  api.supprimerLigne.mockReset();
});

describe("[E9-09] Panier latéral", () => {
  it("s'ouvre après l'ajout : dialog, lignes, sous-total du back, bouton Commander", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    const dialog = await screen.findByRole("dialog", {
      name: fr.fiche.cart.drawer.title,
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText(/Lucerne Classic/)).toBeInTheDocument();
    expect(within(dialog).getByText(/123/)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: fr.fiche.cart.drawer.checkout }),
    ).toHaveAttribute("href", "/fr/panier/commande");
  });

  it("n'affiche plus de toast", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await screen.findByRole("dialog");
    expect(screen.queryByTestId("toast-ajout")).not.toBeInTheDocument();
  });

  it("aucun panier latéral si l'ajout échoue", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: false,
      error: { code: "erreur", message: "x" },
    });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    expect(await screen.findByRole("status")).toHaveTextContent(
      fr.fiche.cart.errorGeneric,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("met le focus dans le panneau puis le piège avec Tab", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 12; i++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("se ferme avec Échap et rend le focus au bouton d'ajout", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(ajouter());
  });

  it("se ferme au clic à côté du panneau, pas dans le panneau", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    const dialog = await screen.findByRole("dialog");
    await user.click(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByTestId("panier-lateral-fond"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(ajouter());
  });

  it("se ferme avec le bouton de fermeture", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await user.click(
      await screen.findByRole("button", { name: fr.fiche.cart.drawer.close }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Classic : les quantités appellent la même API que la page panier", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    api.modifierLigne.mockResolvedValue({
      ok: true,
      data: panier(2, "Classic", 24600),
    });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await user.click(
      await screen.findByRole("button", {
        name: /Augmenter la quantité/,
      }),
    );
    expect(api.modifierLigne).toHaveBeenCalledWith("l1", 2);
    expect(await screen.findByText(/246/)).toBeInTheDocument();
  });

  it("Premium : pas de quantité", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: panier(1, "Premium"),
    });
    const user = userEvent.setup();
    rendre("Premium");
    await user.click(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).queryByRole("button", { name: /Augmenter/ }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Pièce n° 8/)).toBeInTheDocument();
  });

  it("retirer une ligne appelle l'API et vide le panier", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    api.supprimerLigne.mockResolvedValue({
      ok: true,
      data: { ...panier(1), lignes: [], sous_total_centimes: 0 },
    });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await user.click(
      await screen.findByRole("button", { name: /Retirer .* du panier/ }),
    );
    expect(api.supprimerLigne).toHaveBeenCalledWith("l1");
    expect(
      await screen.findByText(fr.fiche.cart.drawer.empty),
    ).toBeInTheDocument();
  });

  it("reduced-motion : ouverture directe, sans vol", async () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal("matchMedia", matchMedia);
    const animate = vi.fn();
    Element.prototype.animate = animate;
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    const user = userEvent.setup();
    render(
      <>
        <CartIndicator href="/fr/panier" labels={fr.header.cart} />
        <AjoutPanier
          slug={classic.slug}
          gamme="Classic"
          panierHref="/fr/panier"
          textes={fr.fiche.cart}
        />
      </>,
    );
    await user.click(ajouter());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(animate).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    // @ts-expect-error nettoyage du stub
    delete Element.prototype.animate;
  });

  it("l'icône du panier porte la cible du vol", () => {
    const { container } = render(
      <CartIndicator href="/fr/panier" labels={fr.header.cart} />,
    );
    expect(container.querySelector(`[${CIBLE_PANIER}]`)).not.toBeNull();
  });
});
