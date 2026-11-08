import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  api: { ajouterLigne: vi.fn(), disponibilite: vi.fn() },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { AchatLive } from "@/components/AchatLive";
import { AjoutPanier } from "@/components/AjoutPanier";
import { DisponibiliteLive } from "@/components/DisponibiliteLive";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;

const libres = [4, 17, 18, 33, 50];
const rendre = (numeros = libres) =>
  render(
    <AjoutPanier
      slug="lampe-premium"
      gamme="Premium"
      numeros={numeros}
      total={50}
      panierHref="/fr/panier"
      textes={fr.fiche.cart}
    />,
  );

const serie = (numeros: number[], taille = 12) =>
  ({
    ok: true,
    data: {
      gamme: "Premium",
      series: [
        { serie: "A", taille_serie: taille, numeros_disponibles: numeros },
      ],
    },
  }) as never;

const achat = () => (
  <AchatLive
    slug="lampe-premium"
    gamme="Premium"
    panierHref="/fr/panier"
    textes={fr.fiche.cart}
    alerte={fr.fiche.soldOut}
  />
);

beforeEach(() => {
  api.ajouterLigne.mockReset();
  api.disponibilite.mockReset();
});

describe("[E9-08] Critère 1 : seules les pièces libres sont sélectionnables", () => {
  it("affiche les 50 pièces : libres = boutons, vendues = images « vendue »", () => {
    rendre();
    expect(screen.getAllByRole("button", { name: /^N° \d+$/ })).toHaveLength(5);
    expect(screen.getAllByRole("img", { name: /vendue/ })).toHaveLength(45);
  });

  it("une pièce vendue n'est ni un bouton ni focalisable, et dit « vendue »", async () => {
    const user = userEvent.setup();
    rendre();
    expect(screen.queryByRole("button", { name: "N° 5" })).toBeNull();
    const vendue = screen.getByRole("img", { name: "N° 5, vendue" });
    expect(vendue).not.toHaveAttribute("tabindex");
    await user.click(vendue);
    expect(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    ).toBeInTheDocument();
  });

  it("cliquer une pièce libre la sélectionne (aria-pressed), une seule à la fois", async () => {
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole("button", { name: "N° 17" }));
    expect(screen.getByRole("button", { name: "N° 17" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "N° 33" }));
    expect(screen.getByRole("button", { name: "N° 17" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "N° 33" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("[E9-08] Critère 2 : navigation clavier (flèches)", () => {
  it("→ et ← passent à la pièce libre suivante/précédente en sautant les vendues", async () => {
    const user = userEvent.setup();
    rendre();
    screen.getByRole("button", { name: "N° 4" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "N° 17" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("button", { name: "N° 33" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "N° 18" })).toHaveFocus();
  });

  it("aux extrémités, le focus reste sur la pièce courante", async () => {
    const user = userEvent.setup();
    rendre();
    screen.getByRole("button", { name: "N° 4" }).focus();
    await user.keyboard("{ArrowLeft}{ArrowUp}");
    expect(screen.getByRole("button", { name: "N° 4" })).toHaveFocus();
    screen.getByRole("button", { name: "N° 50" }).focus();
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(screen.getByRole("button", { name: "N° 50" })).toHaveFocus();
  });

  it("↓ et ↑ se déplacent vers une pièce libre d'une autre ligne", async () => {
    const user = userEvent.setup();
    rendre();
    screen.getByRole("button", { name: "N° 4" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(
      Number((document.activeElement as HTMLElement).dataset.piece),
    ).toBeGreaterThan(4);
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: "N° 4" })).toHaveFocus();
  });
});

describe("[E9-08] Critère 3 : disponibilité venant de l'API", () => {
  it("la grille reflète numeros_disponibles et taille_serie de l'API", () => {
    api.disponibilite.mockResolvedValue(serie([2, 9]));
    render(
      <DisponibiliteLive slug="lampe-premium" initial={serie([2, 9])}>
        {achat()}
      </DisponibiliteLive>,
    );
    expect(screen.getAllByRole("button", { name: /^N° \d+$/ })).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: /vendue/ })).toHaveLength(10);
  });

  it("une pièce prise par quelqu'un d'autre passe en « vendue » au rafraîchissement", async () => {
    api.disponibilite.mockResolvedValue(serie([2]));
    render(
      <DisponibiliteLive slug="lampe-premium" initial={serie([2, 9])}>
        {achat()}
      </DisponibiliteLive>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "N° 9, vendue" }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: "N° 9" })).toBeNull();
  });
});

describe("[E9-08] Critère 4 : remplace la rangée sans perdre l'attribution automatique", () => {
  const echec = { ok: false, error: { code: "autre", message: "x" } };

  it("sans choix, l'ajout n'envoie aucun numéro (attribution par le back)", async () => {
    const user = userEvent.setup();
    api.ajouterLigne.mockResolvedValue(echec);
    rendre();
    await user.click(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    );
    expect(api.ajouterLigne).toHaveBeenCalledTimes(1);
    expect(api.ajouterLigne.mock.calls[0][0]).not.toHaveProperty("numero");
  });

  it("avec un choix le numéro est envoyé ; désélectionné, retour à l'automatique", async () => {
    const user = userEvent.setup();
    api.ajouterLigne.mockResolvedValue(echec);
    rendre();
    await user.click(screen.getByRole("button", { name: "N° 18" }));
    await user.click(
      screen.getByRole("button", { name: /^Réserver la pièce/ }),
    );
    expect(api.ajouterLigne.mock.calls[0][0]).toMatchObject({ numero: 18 });

    await user.click(screen.getByRole("button", { name: "N° 18" }));
    await user.click(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    );
    expect(api.ajouterLigne.mock.calls[1][0]).not.toHaveProperty("numero");
  });

  it("un seul bouton par pièce libre (plus de rangée en doublon)", () => {
    rendre();
    expect(screen.getAllByRole("button", { name: /N° 4$/ })).toHaveLength(1);
  });
});
