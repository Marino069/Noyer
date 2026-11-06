import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { ajouterLigne: vi.fn() },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { AjoutPanier } from "@/components/AjoutPanier";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;
const premium = produits[1];

const rendre = (numeros = [3, 8, 15], onUnavailable = vi.fn()) =>
  render(
    <AjoutPanier
      slug={premium.slug}
      gamme="Premium"
      numeros={numeros}
      total={50}
      panierHref="/fr/panier"
      textes={fr.fiche.cart}
      onUnavailable={onUnavailable}
    />,
  );

beforeEach(() => api.ajouterLigne.mockReset());

describe("[E8-08] Choix du numéro et plaque gravée", () => {
  it("propose un bouton par pièce libre, avec aria-pressed", () => {
    rendre();
    const boutons = screen.getAllByRole("button", { name: /^N° \d+$/ });
    expect(boutons.map((b) => b.textContent)).toEqual([
      "N° 3",
      "N° 8",
      "N° 15",
    ]);
    boutons.forEach((b) => expect(b).toHaveAttribute("aria-pressed", "false"));
    expect(
      screen.getByRole("group", { name: /3 libres sur 50/ }),
    ).toBeInTheDocument();
  });

  it("la plaque gravée et le bouton suivent le numéro choisi", async () => {
    const user = userEvent.setup();
    rendre();
    expect(screen.getByText(/^N° ––/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "N° 8" }));
    expect(screen.getByRole("button", { name: "N° 8" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/^N° 08/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Réserver la pièce N° 8" }),
    ).toBeInTheDocument();
  });

  it("rappelle la réservation de 15 minutes", () => {
    rendre();
    expect(screen.getByText(/réservée 15 minutes/)).toBeInTheDocument();
  });

  it("attribution automatique si aucun numéro n'est choisi", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: true,
      data: { lignes: [], sous_total_centimes: 0 },
    });
    const user = userEvent.setup();
    rendre();
    await user.click(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    );
    expect(api.ajouterLigne).toHaveBeenCalledWith({
      produit_slug: premium.slug,
      quantite: 1,
    });
  });

  it("un second clic sur le numéro choisi revient à l'attribution automatique", async () => {
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole("button", { name: "N° 8" }));
    await user.click(screen.getByRole("button", { name: "N° 8" }));
    expect(screen.getByRole("button", { name: "N° 8" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    ).toBeInTheDocument();
  });

  it("boutons de 44 px minimum et navigables au clavier", async () => {
    const css = (await import("node:fs")).readFileSync(
      `${process.cwd()}/components/AjoutPanier.module.css`,
      "utf8",
    );
    const bloc = css.match(/\.numero \{[^}]*\}/)?.[0] ?? "";
    expect(bloc).toMatch(/min-height:\s*44px/);
    expect(bloc).toMatch(/min-width:\s*44px/);

    const user = userEvent.setup();
    rendre();
    await user.tab();
    expect(screen.getByRole("button", { name: "N° 3" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "N° 8" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "N° 8" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "N° 15" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("pièce devenue indisponible : message clair et liste mise à jour", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: false,
      error: { code: "piece_indisponible", message: "" },
    });
    const onUnavailable = vi.fn();
    const user = userEvent.setup();
    const { rerender } = rendre([3, 8, 15], onUnavailable);
    await user.click(screen.getByRole("button", { name: "N° 8" }));
    await user.click(
      screen.getByRole("button", { name: "Réserver la pièce N° 8" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cette pièce vient d'être réservée",
    );
    expect(onUnavailable).toHaveBeenCalledTimes(1);

    // La disponibilité rafraîchie ne contient plus le n° 8.
    rerender(
      <AjoutPanier
        slug={premium.slug}
        gamme="Premium"
        numeros={[3, 15]}
        total={50}
        panierHref="/fr/panier"
        textes={fr.fiche.cart}
        onUnavailable={onUnavailable}
      />,
    );
    expect(screen.queryByRole("button", { name: "N° 8" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    ).toBeInTheDocument();
  });
});
