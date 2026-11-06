import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { networkError } from "@/lib/api";
import { detailDe, produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { produit: vi.fn(), disponibilite: vi.fn(), ajouterLigne: vi.fn() },
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});
vi.mock("next/navigation", () => ({ notFound: hoisted.notFound }));

import FicheProduitPage from "@/app/[locale]/produits/[slug]/page";
import { AjoutPanier } from "@/components/AjoutPanier";
import { FicheProduit } from "@/components/FicheProduit";
import { Galerie } from "@/components/Galerie";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;
const classic = detailDe(produits[0]);
const premium = detailDe(produits[1]);
const dispoClassic = {
  ok: true as const,
  data: { gamme: "Classic" as const, quantite_disponible: 7 },
};
const dispoPremium = {
  ok: true as const,
  data: {
    gamme: "Premium" as const,
    series: [
      {
        id: 1,
        taille_serie: 50,
        pieces_restantes: 3,
        numeros_disponibles: [3, 8, 15],
      },
    ],
  },
};

beforeAll(() => {
  // jsdom n'implémente pas <dialog>.showModal().
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  api.produit.mockReset();
  api.disponibilite.mockReset();
  api.ajouterLigne.mockReset();
  hoisted.notFound.mockClear();
  api.produit.mockResolvedValue({ ok: true, data: classic });
  api.disponibilite.mockResolvedValue(dispoClassic);
});

const renderPage = async (slug = "lucerne-classic") =>
  render(
    await FicheProduitPage({
      params: Promise.resolve({ locale: "fr", slug }),
    }),
  );

describe("[E4-02] Fiche produit — page /produits/[slug]", () => {
  it("charge le produit correspondant au slug de l'URL", async () => {
    await renderPage("lucerne-classic");
    expect(api.produit).toHaveBeenCalledWith("lucerne-classic");
    expect(api.disponibilite).toHaveBeenCalledWith("lucerne-classic");
    expect(
      screen.getByRole("heading", { level: 1, name: "Lucerne" }),
    ).toBeInTheDocument();
  });

  it("répond 404 pour un produit inexistant", async () => {
    api.produit.mockResolvedValue({
      ok: false,
      error: {
        kind: "http",
        status: 404,
        code: "introuvable",
        message: "Produit introuvable.",
      },
    });
    await expect(renderPage("inconnu")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(hoisted.notFound).toHaveBeenCalled();
  });

  it("affiche une alerte (et non un 404) si l'API est injoignable", async () => {
    api.produit.mockResolvedValue({ ok: false, error: networkError() });
    await renderPage();
    expect(hoisted.notFound).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Fiche indisponible");
  });
});

describe("[E4-02] Fiche produit — bloc infos", () => {
  const rendre = (
    produit = classic,
    disponibilite: Parameters<
      typeof FicheProduit
    >[0]["disponibilite"] = dispoClassic,
    shopEnabled = true,
  ) =>
    render(
      <FicheProduit
        produit={produit}
        disponibilite={disponibilite}
        locale="fr"
        shopEnabled={shopEnabled}
        textes={fr.fiche}
        prix={fr.price}
        badge={fr.badge}
      />,
    );

  it("affiche dimensions, matières, entretien, prix et disponibilité", () => {
    rendre();
    expect(screen.getByText(/Hauteur 42 cm/)).toBeInTheDocument();
    expect(screen.getByText(/Diamètre 28 cm/)).toBeInTheDocument();
    expect(screen.getByText(/Noyer — Pied/)).toBeInTheDocument();
    expect(screen.getByText(/Huiler une fois par an/)).toBeInTheDocument();
    expect(screen.getByText("CHF 480.–")).toBeInTheDocument();
    expect(screen.getByText("7 en stock")).toBeInTheDocument();
  });

  it("indique « Épuisé » quand il n'y a plus de stock et bloque l'ajout", () => {
    rendre(classic, {
      ok: true,
      data: { gamme: "Classic", quantite_disponible: 0 },
    });
    expect(screen.getByText("Épuisé")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    ).toBeDisabled();
  });

  it("propose la bascule Classic → Premium (même forme, autre gamme)", () => {
    rendre();
    expect(
      screen.getByRole("link", { name: "Comparer avec la Premium" }),
    ).toHaveAttribute("href", "/fr/produits/lucerne-premium");
  });

  it("propose la bascule Premium → Classic", () => {
    rendre(premium, dispoPremium);
    expect(
      screen.getByRole("link", { name: "Comparer avec la Classic" }),
    ).toHaveAttribute("href", "/fr/produits/lucerne-classic");
  });

  it("n'affiche pas de bascule si l'autre gamme n'existe pas", () => {
    rendre({ ...classic, autre_gamme: null });
    expect(screen.queryByRole("link", { name: /Comparer avec/ })).toBeNull();
  });

  it("propose « Nous contacter » quand la vente en ligne est désactivée", () => {
    rendre(classic, dispoClassic, false);
    expect(
      screen.getByRole("link", { name: "Nous contacter" }),
    ).toHaveAttribute("href", "/fr/contact");
    expect(
      screen.queryByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    ).toBeNull();
  });

  it("Premium : indique les pièces restantes et propose les numéros libres", () => {
    rendre(premium, dispoPremium);
    expect(screen.getByText("3 pièces restantes sur 50")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: /^N° \d+$/ })
        .map((b) => b.textContent),
    ).toEqual(["N° 3", "N° 8", "N° 15"]);
  });
});

describe("[E4-02] Fiche produit — ajout au panier", () => {
  const textes = fr.fiche.cart;

  it("Classic : ajoute 1 exemplaire", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: { lignes: [], sous_total_centimes: 0 },
    });
    render(
      <AjoutPanier
        slug="lucerne-classic"
        gamme="Classic"
        panierHref="/fr/panier"
        textes={textes}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    );
    expect(api.ajouterLigne).toHaveBeenCalledWith({
      produit_slug: "lucerne-classic",
      quantite: 1,
    });
    expect(await screen.findByText(/Ajouté au panier/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir le panier" }),
    ).toHaveAttribute("href", "/fr/panier");
  });

  it("Premium : envoie le numéro de pièce choisi", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: { lignes: [], sous_total_centimes: 0 },
    });
    render(
      <AjoutPanier
        slug="lucerne-premium"
        gamme="Premium"
        numeros={[3, 8, 15]}
        panierHref="/fr/panier"
        textes={textes}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "N° 8" }));
    await userEvent.click(
      screen.getByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    );
    expect(api.ajouterLigne).toHaveBeenCalledWith({
      produit_slug: "lucerne-premium",
      quantite: 1,
      numero: 8,
    });
  });

  it("annonce une pièce déjà réservée", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: false,
      error: {
        kind: "http",
        status: 409,
        code: "piece_indisponible",
        message: "x",
      },
    });
    render(
      <AjoutPanier
        slug="lucerne-premium"
        gamme="Premium"
        numeros={[3]}
        panierHref="/fr/panier"
        textes={textes}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cette pièce vient d'être réservée",
    );
  });
});

describe("[E4-02] Galerie accessible", () => {
  const rendre = (medias = classic.medias.slice(0, 3)) =>
    render(<Galerie medias={medias} textes={fr.fiche.gallery} />);

  it("garde un alt non vide sur chaque photo", () => {
    rendre();
    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(classic.medias.length);
    for (const img of images) expect(img.getAttribute("alt")).toBeTruthy();
  });

  it("navigue aux flèches du clavier et annonce la position", () => {
    rendre();
    const group = screen.getByRole("group", { name: "Galerie photo" });
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Photo 1 sur 3");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Photo 2 sur 3");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Photo 3 sur 3");
  });

  it("change de photo par les vignettes (aria-current)", async () => {
    rendre();
    const vignettes = screen.getAllByRole("button", {
      name: /^Photo \d sur 3/,
    });
    await userEvent.click(vignettes[1]);
    expect(vignettes[1]).toHaveAttribute("aria-current", "true");
    expect(vignettes[0]).not.toHaveAttribute("aria-current");
  });

  it("change de photo par swipe tactile", () => {
    rendre();
    const scene = screen.getAllByRole("button", { name: /Agrandir/ })[0]
      .parentElement!;
    fireEvent.pointerDown(scene, { clientX: 300 });
    fireEvent.pointerUp(scene, { clientX: 100 });
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Photo 2 sur 3");
    fireEvent.pointerDown(scene, { clientX: 100 });
    fireEvent.pointerUp(scene, { clientX: 110 }); // trop court : ignoré
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Photo 2 sur 3");
  });

  it("ouvre le plein écran dans une boîte de dialogue modale et la ferme", async () => {
    rendre();
    await userEvent.click(
      screen.getAllByRole("button", { name: /Agrandir/ })[0],
    );
    const dialog = screen.getByRole("dialog", {
      name: "Photos en plein écran",
    });
    expect(dialog).toHaveAttribute("open");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Fermer" }),
    );
    expect(dialog).not.toHaveAttribute("open");
  });

  it("n'affiche ni flèches ni vignettes pour une seule photo", () => {
    rendre(classic.medias.slice(0, 1));
    expect(screen.queryByRole("button", { name: "Photo suivante" })).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("affiche un message quand il n'y a aucune photo", () => {
    rendre([]);
    expect(screen.getByText(fr.fiche.gallery.empty)).toBeInTheDocument();
  });
});
