import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";
import { Panier } from "@/components/Panier";
import fr from "@/i18n/dictionaries/fr.json";
import type { Panier as PanierData } from "@/lib/api";
import { useCartCount } from "@/lib/cart";

// Les tests passent par la vraie couche réseau (lib/api) ; seul fetch est simulé.
const classic = produits[0]; // CHF 480.–
const premium = produits[1]; // CHF 1240.–

const ligne = (
  id: string,
  produit: typeof classic,
  quantite: number,
  numero: number | null = null,
) => ({
  id,
  produit,
  quantite,
  numero_piece: numero,
  reservation_expire_le: numero ? "2026-10-05T14:45:00+02:00" : null,
});

const panierDe = (
  lignes: PanierData["lignes"],
  tva: number,
  livraison = 0,
): PanierData => {
  const sous = lignes.reduce(
    (t, l) => t + l.produit.prix_ttc_centimes * l.quantite,
    0,
  );
  return {
    lignes,
    sous_total_centimes: sous,
    frais_livraison_centimes: livraison,
    tva_incluse_centimes: tva,
    taux_tva: "8.10",
    total_centimes: sous + livraison,
  };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const rendre = () =>
  render(
    <Panier
      locale="fr"
      textes={fr.panier}
      catalogueHref="/fr/produits"
      commandeHref="/fr/panier/commande"
    />,
  );

const appels = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: (init?.method ?? "GET") as string,
    credentials: init?.credentials,
    body: init?.body ? JSON.parse(init.body as string) : undefined,
  }));

const valeurDe = (recap: HTMLElement, libelle: RegExp | string) =>
  within(recap).getByText(libelle, { selector: "dt" }).nextElementSibling!
    .textContent;

describe("[E5-01] Critère : panier persistant côté back, pas seulement en local", () => {
  it("relit le panier via GET /panier/ avec le cookie (credentials include)", async () => {
    fetchMock.mockResolvedValue(json(panierDe([ligne("a", classic, 1)], 3555)));
    rendre();
    await screen.findByRole("listitem");
    const [premier] = appels();
    expect(premier.url).toMatch(/\/panier\/$/);
    expect(premier.method).toBe("GET");
    expect(premier.credentials).toBe("include");
  });

  it("n'utilise pas localStorage pour garder le panier", async () => {
    const set = vi.spyOn(Storage.prototype, "setItem");
    fetchMock.mockResolvedValue(json(panierDe([ligne("a", classic, 1)], 3555)));
    rendre();
    await screen.findByRole("listitem");
    expect(set).not.toHaveBeenCalled();
    set.mockRestore();
  });

  it("réaffiche le panier du back à chaque nouvel affichage (rechargement)", async () => {
    fetchMock.mockImplementation(async () =>
      json(panierDe([ligne("a", classic, 3)], 10667)),
    );
    const premierRendu = rendre();
    expect(await screen.findByText("3", { selector: "output" })).toBeVisible();
    premierRendu.unmount();
    rendre();
    expect(await screen.findByText("3", { selector: "output" })).toBeVisible();
    expect(appels().filter((a) => a.method === "GET")).toHaveLength(2);
  });
});

describe("[E5-01] Critère : modifier la quantité (Classic) / retirer un article", () => {
  it("envoie PATCH /panier/lignes/{id}/ avec la nouvelle quantité", async () => {
    fetchMock
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 1)], 3555)))
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 2)], 7110)));
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: /Augmenter/ }),
    );
    await screen.findByText("2", { selector: "output" });
    const patch = appels()[1];
    expect(patch.method).toBe("PATCH");
    expect(patch.url).toMatch(/\/panier\/lignes\/a\/$/);
    expect(patch.body).toEqual({ quantite: 2 });
  });

  it("diminue la quantité, mais jamais en dessous de 1", async () => {
    fetchMock
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 2)], 7110)))
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 1)], 3555)));
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: /Diminuer/ }),
    );
    await screen.findByText("1", { selector: "output" });
    expect(appels()[1].body).toEqual({ quantite: 1 });
    expect(screen.getByRole("button", { name: /Diminuer/ })).toBeDisabled();
  });

  it("met à jour le total après modification", async () => {
    fetchMock
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 1)], 3555)))
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 2)], 7110)));
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: /Augmenter/ }),
    );
    const recap = await screen.findByRole("region", { name: "Récapitulatif" });
    await waitFor(() => expect(valeurDe(recap, "Total TTC")).toBe("CHF 960.–"));
  });

  it("pas de contrôle de quantité pour le Premium, mais il peut être retiré", async () => {
    fetchMock
      .mockResolvedValueOnce(json(panierDe([ligne("p", premium, 1, 7)], 9291)))
      .mockResolvedValueOnce(json(panierDe([], 0)));
    rendre();
    await screen.findByRole("listitem");
    expect(
      screen.queryByRole("button", { name: /Augmenter|Diminuer/ }),
    ).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Retirer/ }));
    expect(await screen.findByText("Votre panier est vide")).toBeVisible();
    const del = appels()[1];
    expect(del.method).toBe("DELETE");
    expect(del.url).toMatch(/\/panier\/lignes\/p\/$/);
  });

  it("une erreur 409 stock_insuffisant garde le panier affiché", async () => {
    fetchMock
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 7)], 24885)))
      .mockResolvedValueOnce(
        json({ erreur: { code: "stock_insuffisant", message: "Stock" } }, 409),
      );
    rendre();
    await userEvent.click(
      await screen.findByRole("button", { name: /Augmenter/ }),
    );
    expect(await screen.findByText(fr.panier.stockError)).toBeVisible();
    expect(screen.getByText("7", { selector: "output" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Récapitulatif" })).toBeVisible();
  });

  it("met à jour l'indicateur du header après une mutation", async () => {
    function Indicateur() {
      return <span data-testid="compteur">{String(useCartCount())}</span>;
    }
    fetchMock
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 1)], 3555)))
      .mockResolvedValueOnce(json(panierDe([ligne("a", classic, 3)], 10667)));
    render(
      <>
        <Indicateur />
        <Panier
          locale="fr"
          textes={fr.panier}
          catalogueHref="/fr/produits"
          commandeHref="/fr/panier/commande"
        />
      </>,
    );
    await screen.findByRole("listitem");
    expect(screen.getByTestId("compteur")).toHaveTextContent("1");
    await userEvent.click(screen.getByRole("button", { name: /Augmenter/ }));
    await waitFor(() =>
      expect(screen.getByTestId("compteur")).toHaveTextContent("3"),
    );
  });
});

describe("[E5-01] Critère : récapitulatif HT, TVA, livraison, total", () => {
  it("HT = sous-total − TVA incluse ; total = TTC renvoyé par le back", async () => {
    // 480.– + 1240.– = 1720.– TTC ; TVA incluse 128.90 ; HT 1591.10 ; livraison 15.–
    fetchMock.mockResolvedValue(
      json(
        panierDe(
          [ligne("a", classic, 1), ligne("p", premium, 1, 7)],
          12890,
          1500,
        ),
      ),
    );
    rendre();
    const recap = await screen.findByRole("region", { name: "Récapitulatif" });
    const normalise = (s: string | null) => s?.replace(/[’']/g, "'");
    expect(normalise(valeurDe(recap, "Sous-total HT"))).toBe("CHF 1'591.10");
    expect(valeurDe(recap, /^TVA \(/)).toBe("CHF 128.90");
    expect(valeurDe(recap, "Livraison")).toBe("CHF 15.–");
    expect(normalise(valeurDe(recap, "Total TTC"))).toBe("CHF 1'735.–");
  });

  it("affiche le taux de TVA fourni par l'API", async () => {
    const data = {
      ...panierDe([ligne("a", classic, 1)], 3555),
      taux_tva: "2.60",
    };
    fetchMock.mockResolvedValue(json(data));
    rendre();
    const recap = await screen.findByRole("region", { name: "Récapitulatif" });
    expect(
      within(recap).getByText(/^TVA \(/, { selector: "dt" }),
    ).toHaveTextContent(/2[.,]6/);
  });

  it("livraison offerte quand les frais sont à 0", async () => {
    fetchMock.mockResolvedValue(
      json(panierDe([ligne("a", classic, 1)], 3555, 0)),
    );
    rendre();
    const recap = await screen.findByRole("region", { name: "Récapitulatif" });
    expect(within(recap).getByText("Offerte")).toBeVisible();
  });

  it("n'affiche aucun montant invalide ou à virgule flottante", async () => {
    fetchMock.mockResolvedValue(
      json(panierDe([ligne("a", classic, 3)], 10667, 990)),
    );
    rendre();
    const recap = await screen.findByRole("region", { name: "Récapitulatif" });
    expect(recap.textContent).not.toMatch(/\d\.\d{3,}|NaN|undefined/);
  });

  it("le bouton de commande mène à la commande", async () => {
    fetchMock.mockResolvedValue(json(panierDe([ligne("a", classic, 1)], 3555)));
    rendre();
    expect(
      await screen.findByRole("link", { name: fr.panier.checkout }),
    ).toHaveAttribute("href", "/fr/panier/commande");
  });
});

describe("[E5-01] Critère : panier vide → état dédié", () => {
  it("affiche titre, message et lien catalogue, sans récapitulatif", async () => {
    fetchMock.mockResolvedValue(json(panierDe([], 0)));
    rendre();
    expect(
      await screen.findByRole("heading", { name: fr.panier.emptyTitle }),
    ).toBeVisible();
    expect(screen.getByText(fr.panier.emptyMessage)).toBeVisible();
    expect(
      screen.getByRole("link", { name: fr.panier.emptyCta }),
    ).toHaveAttribute("href", "/fr/produits");
    expect(screen.queryByRole("region", { name: "Récapitulatif" })).toBeNull();
    expect(screen.queryByRole("link", { name: fr.panier.checkout })).toBeNull();
  });
});
