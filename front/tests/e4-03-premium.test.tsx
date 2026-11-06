import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detailDe, produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: {
    disponibilite: vi.fn(),
    ajouterLigne: vi.fn(),
    newsletter: vi.fn(),
  },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { AlerteSerie } from "@/components/AlerteSerie";
import { REFRESH_INTERVAL_MS } from "@/components/DisponibiliteLive";
import { FicheProduit } from "@/components/FicheProduit";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;
const premium = detailDe(produits[1]);
const classic = detailDe(produits[0]);

const serie = (numeros: number[], taille = 50) => ({
  ok: true as const,
  data: {
    gamme: "Premium" as const,
    series: [
      {
        id: 1,
        taille_serie: taille,
        pieces_restantes: numeros.length,
        numeros_disponibles: numeros,
      },
    ],
  },
});

const rendre = (
  initial: Parameters<typeof FicheProduit>[0]["disponibilite"],
  produit = premium,
) =>
  render(
    <FicheProduit
      produit={produit}
      disponibilite={initial}
      locale="fr"
      shopEnabled
      textes={fr.fiche}
      prix={fr.price}
      badge={fr.badge}
    />,
  );

beforeEach(() => {
  api.disponibilite.mockReset();
  api.ajouterLigne.mockReset();
  api.newsletter.mockReset();
});

afterEach(() => vi.useRealTimers());

describe("[E4-03] Fiche Premium — processus et numérotation", () => {
  it("affiche le processus de fabrication dans une section sombre", () => {
    api.disponibilite.mockResolvedValue(serie([3, 8, 15]));
    rendre(serie([3, 8, 15]));
    const titre = screen.getByRole("heading", {
      level: 2,
      name: fr.fiche.process.title,
    });
    expect(titre.closest("section")).toHaveAttribute("data-tone", "dark");
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(
      expect.arrayContaining(fr.fiche.process.steps.map((e) => e.title)),
    );
  });

  it("n'affiche pas le processus sur une fiche Classic", () => {
    api.disponibilite.mockResolvedValue({
      ok: true,
      data: { gamme: "Classic", quantite_disponible: 7 },
    });
    rendre(
      { ok: true, data: { gamme: "Classic", quantite_disponible: 7 } },
      classic,
    );
    expect(screen.queryByText(fr.fiche.process.title)).toBeNull();
  });

  it("liste les numéros disponibles de la série", () => {
    api.disponibilite.mockResolvedValue(serie([3, 8, 15]));
    rendre(serie([3, 8, 15]));
    const liste = screen.getByRole("list", { name: "Numéros disponibles" });
    expect(
      within(liste)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["N° 3 / 50", "N° 8 / 50", "N° 15 / 50"]);
  });

  it("permet de choisir un numéro ou de laisser l'attribution automatique", async () => {
    api.disponibilite.mockResolvedValue(serie([3, 8, 15]));
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: { lignes: [], sous_total_centimes: 0 },
    });
    rendre(serie([3, 8, 15]));
    // Automatique par défaut : aucun numéro pressé, plaque sans numéro.
    for (const b of screen.getAllByRole("button", { name: /^N° \d+$/ })) {
      expect(b).toHaveAttribute("aria-pressed", "false");
    }

    await userEvent.click(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    );
    expect(api.ajouterLigne).toHaveBeenLastCalledWith({
      produit_slug: premium.slug,
      quantite: 1,
    });

    await userEvent.click(screen.getByRole("button", { name: "N° 8" }));
    expect(screen.getByRole("button", { name: "N° 8" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Réserver la pièce N° 8" }),
    );
    expect(api.ajouterLigne).toHaveBeenLastCalledWith({
      produit_slug: premium.slug,
      quantite: 1,
      numero: 8,
    });
  });
});

describe("[E4-03] Fiche Premium — disponibilité rafraîchie", () => {
  it("relit la disponibilité au montage, sans cache, et met l'affichage à jour", async () => {
    api.disponibilite.mockResolvedValue(serie([8]));
    rendre(serie([3, 8, 15]));
    expect(await screen.findByText("1 pièce restante sur 50")).toBeVisible();
    expect(api.disponibilite).toHaveBeenCalledWith(premium.slug);
    expect(
      screen
        .getAllByRole("button", { name: /^N° \d+$/ })
        .map((b) => b.textContent),
    ).toEqual(["N° 8"]);
  });

  it("rafraîchit à intervalle régulier (stock limité)", async () => {
    vi.useFakeTimers();
    api.disponibilite.mockResolvedValue(serie([3, 8, 15]));
    rendre(serie([3, 8, 15]));
    await act(async () => {});
    const appelsInitiaux = api.disponibilite.mock.calls.length;

    api.disponibilite.mockResolvedValue(serie([15]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    });
    expect(api.disponibilite.mock.calls.length).toBeGreaterThan(appelsInitiaux);
    expect(screen.getByText("1 pièce restante sur 50")).toBeVisible();
  });

  it("garde la dernière valeur connue si le rafraîchissement échoue", async () => {
    api.disponibilite.mockResolvedValue({
      ok: false,
      error: { kind: "network" },
    });
    rendre(serie([3, 8, 15]));
    await act(async () => {});
    expect(screen.getByText("3 pièces restantes sur 50")).toBeVisible();
  });

  it("relit la disponibilité quand la pièce choisie vient d'être réservée", async () => {
    api.disponibilite.mockResolvedValue(serie([3, 8, 15]));
    api.ajouterLigne.mockResolvedValue({
      ok: false,
      error: {
        kind: "http",
        status: 409,
        code: "piece_indisponible",
        message: "x",
      },
    });
    rendre(serie([3, 8, 15]));
    await act(async () => {});
    await userEvent.click(screen.getByRole("button", { name: "N° 8" }));
    api.disponibilite.mockResolvedValue(serie([3, 15]));
    await userEvent.click(
      screen.getByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    );
    expect(await screen.findByText("2 pièces restantes sur 50")).toBeVisible();
  });
});

describe("[E4-03] Fiche Premium — série épuisée", () => {
  it("affiche un état clair, bloque l'ajout et propose d'être prévenu", async () => {
    api.disponibilite.mockResolvedValue(serie([]));
    rendre(serie([]));
    await act(async () => {});
    expect(screen.getAllByText("Épuisé").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", {
        name: /Ajouter au panier|Réserver (une pièce|la pièce)/,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("heading", { name: "Série épuisée" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Adresse e-mail/)).toBeInTheDocument();
    expect(
      screen.getByText("Tous les numéros de la série sont attribués."),
    ).toBeInTheDocument();
  });

  it("passe à « épuisé » quand le rafraîchissement signale la dernière pièce vendue", async () => {
    api.disponibilite.mockResolvedValue(serie([]));
    rendre(serie([3]));
    expect(
      await screen.findByRole("heading", { name: "Série épuisée" }),
    ).toBeInTheDocument();
  });

  it("n'affiche pas l'alerte tant qu'il reste des pièces", async () => {
    api.disponibilite.mockResolvedValue(serie([3]));
    rendre(serie([3]));
    await act(async () => {});
    expect(screen.queryByRole("heading", { name: "Série épuisée" })).toBeNull();
  });
});

describe("[E4-03] Alerte « être prévenu »", () => {
  const rendreAlerte = () => render(<AlerteSerie textes={fr.fiche.soldOut} />);

  it("inscrit l'adresse avec le consentement", async () => {
    api.newsletter.mockResolvedValue({ ok: true, data: null });
    rendreAlerte();
    await userEvent.type(
      screen.getByLabelText(/Adresse e-mail/),
      "marie@example.ch",
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Me prévenir" }));
    expect(api.newsletter).toHaveBeenCalledWith({
      email: "marie@example.ch",
      consentement: true,
    });
    expect(await screen.findByText(/Merci/)).toBeInTheDocument();
  });

  it("refuse une adresse invalide ou l'absence de consentement", async () => {
    rendreAlerte();
    await userEvent.type(
      screen.getByLabelText(/Adresse e-mail/),
      "pas-un-mail",
    );
    await userEvent.click(screen.getByRole("button", { name: "Me prévenir" }));
    expect(api.newsletter).not.toHaveBeenCalled();
    expect(
      screen.getByText("Saisissez une adresse e-mail valide."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Votre consentement est nécessaire pour être prévenu."),
    ).toBeInTheDocument();
  });

  it("signale une erreur serveur", async () => {
    api.newsletter.mockResolvedValue({
      ok: false,
      error: { kind: "network" },
    });
    rendreAlerte();
    await userEvent.type(
      screen.getByLabelText(/Adresse e-mail/),
      "marie@example.ch",
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Me prévenir" }));
    expect(
      await screen.findByText(fr.fiche.soldOut.errorServer),
    ).toBeInTheDocument();
  });
});
