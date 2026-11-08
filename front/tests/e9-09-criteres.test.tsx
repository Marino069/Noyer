import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;
const classic = produits[0];

// Sous-total volontairement différent de prix × quantité : le front ne doit rien recalculer.
const SOUS_TOTAL_BACK = 99900;
const panier = (quantite = 1, sousTotal = SOUS_TOTAL_BACK) => ({
  lignes: [
    {
      id: "l1",
      produit: classic,
      quantite,
      numero_piece: null,
      reservation_expire_le: null,
    },
  ],
  sous_total_centimes: sousTotal,
  frais_livraison_centimes: 0,
  tva_incluse_centimes: 0,
  taux_tva: "8.10",
  total_centimes: sousTotal,
});

const rendre = () =>
  render(
    <AjoutPanier
      slug={classic.slug}
      gamme="Classic"
      panierHref="/fr/panier"
      locale="fr"
      textes={fr.fiche.cart}
    />,
  );
const ajouter = () => screen.getByRole("button", { name: fr.fiche.cart.add });

beforeEach(() => {
  api.ajouterLigne.mockReset();
  api.modifierLigne.mockReset();
  api.supprimerLigne.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("[E9-09] critère 1 : dialog, focus piégé, fermeture, retour du focus", () => {
  it("le dialog est nommé et modal", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    const dialog = await screen.findByRole("dialog", {
      name: fr.fiche.cart.drawer.title,
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("Tab sur le dernier élément revient au premier, Maj+Tab sur le premier va au dernier", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    const dialog = await screen.findByRole("dialog");
    const cibles = Array.from(
      dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    const premier = cibles[0];
    const dernier = cibles[cibles.length - 1];
    dernier.focus();
    await user.tab();
    expect(document.activeElement).toBe(premier);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(dernier);
  });

  it("le focus entre dans le dialog à l'ouverture", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    const dialog = await screen.findByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("Échap ferme même si le focus est revenu hors du panneau", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await screen.findByRole("dialog");
    ajouter().focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("le bouton × rend aussi le focus au bouton d'ajout", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await user.click(
      await screen.findByRole("button", { name: fr.fiche.cart.drawer.close }),
    );
    expect(document.activeElement).toBe(ajouter());
  });

  it("le panneau peut être rouvert après fermeture (deuxième ajout)", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await user.click(ajouter());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("le défilement du fond est bloqué puis restauré", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await screen.findByRole("dialog");
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("[E9-09] critère 2 : mêmes appels API, aucune règle de prix côté front", () => {
  it("l'ajout part avec le slug et la quantité 1, comme la fiche", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await screen.findByRole("dialog");
    expect(api.ajouterLigne).toHaveBeenCalledWith({
      produit_slug: classic.slug,
      quantite: 1,
    });
  });

  it("affiche le sous-total du back tel quel, même s'il diffère de prix × quantité", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toMatch(/999/);
  });

  it("après modification, le sous-total est celui renvoyé par le back", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    api.modifierLigne.mockResolvedValue({ ok: true, data: panier(2, 77700) });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await user.click(
      await screen.findByRole("button", { name: /Augmenter la quantité/ }),
    );
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText(/777/)).toBeInTheDocument();
    expect(api.modifierLigne).toHaveBeenCalledWith("l1", 2);
  });

  it("diminuer appelle modifierLigne avec la quantité - 1", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(3) });
    api.modifierLigne.mockResolvedValue({ ok: true, data: panier(2) });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await user.click(
      await screen.findByRole("button", { name: /Diminuer la quantité/ }),
    );
    expect(api.modifierLigne).toHaveBeenCalledWith("l1", 2);
  });

  it("une erreur du back est annoncée et le panier reste inchangé", async () => {
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier(1) });
    api.modifierLigne.mockResolvedValue({
      ok: false,
      error: { code: "stock_insuffisant", message: "x" },
    });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await user.click(
      await screen.findByRole("button", { name: /Augmenter la quantité/ }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      await within(dialog).findByText(fr.fiche.cart.drawer.stockError),
    ).toBeInTheDocument();
    expect(dialog.textContent).toMatch(/999/);
  });
});

describe("[E9-09] critère 3 : reduced-motion", () => {
  it("aucune animation lancée et aucune copie de vignette injectée", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      }),
    );
    const animate = vi.fn();
    Element.prototype.animate = animate;
    api.ajouterLigne.mockResolvedValue({ ok: true, data: panier() });
    const user = userEvent.setup();
    rendre();
    await user.click(ajouter());
    await screen.findByRole("dialog");
    expect(animate).not.toHaveBeenCalled();
    expect(
      document.body.querySelectorAll(':scope > img[aria-hidden="true"]'),
    ).toHaveLength(0);
    // @ts-expect-error nettoyage du stub
    delete Element.prototype.animate;
  });
});
