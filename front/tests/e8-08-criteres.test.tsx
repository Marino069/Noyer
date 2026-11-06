import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ api: { ajouterLigne: vi.fn() } }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { AjoutPanier } from "@/components/AjoutPanier";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;
const indispo = {
  ok: false,
  error: { code: "piece_indisponible", message: "" },
};
const succes = { ok: true, data: { lignes: [], sous_total_centimes: 0 } };

function ui(
  numeros: number[],
  onUnavailable = vi.fn(),
  gamme: "Premium" | "Classic" = "Premium",
) {
  return (
    <AjoutPanier
      slug="lampe-premium"
      gamme={gamme}
      numeros={numeros}
      total={50}
      panierHref="/fr/panier"
      textes={fr.fiche.cart}
      onUnavailable={onUnavailable}
    />
  );
}

beforeEach(() => api.ajouterLigne.mockReset());

describe("[E8-08] Critère : attribution automatique si aucun numéro choisi", () => {
  it("n'envoie aucun numéro à l'API", async () => {
    api.ajouterLigne.mockResolvedValue(succes);
    const user = userEvent.setup();
    render(ui([4, 9]));
    await user.click(screen.getByRole("button", { name: /^Réserver/ }));
    const payload = api.ajouterLigne.mock.calls[0][0];
    expect(payload).toEqual({ produit_slug: "lampe-premium", quantite: 1 });
    expect("numero" in payload).toBe(false);
  });

  it("envoie le numéro choisi, puis plus rien après désélection", async () => {
    api.ajouterLigne.mockResolvedValue(succes);
    const user = userEvent.setup();
    render(ui([4, 9]));
    await user.click(screen.getByRole("button", { name: "N° 9" }));
    await user.click(
      screen.getByRole("button", { name: "Réserver la pièce N° 9" }),
    );
    expect(api.ajouterLigne.mock.calls[0][0]).toMatchObject({ numero: 9 });
    await user.click(screen.getByRole("button", { name: "N° 9" }));
    await user.click(screen.getByRole("button", { name: /^Réserver/ }));
    expect("numero" in api.ajouterLigne.mock.calls[1][0]).toBe(false);
  });

  it("changer de numéro déplace la sélection (un seul aria-pressed)", async () => {
    const user = userEvent.setup();
    render(ui([4, 9, 12]));
    await user.click(screen.getByRole("button", { name: "N° 4" }));
    await user.click(screen.getByRole("button", { name: "N° 12" }));
    const presses = screen
      .getAllByRole("button", { name: /^N° \d+$/ })
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(presses.map((b) => b.textContent)).toEqual(["N° 12"]);
    expect(screen.getByText(/^N° 12/, { selector: "p" })).toHaveTextContent(
      "/ 50",
    );
  });

  it("la plaque affiche N° –– sans choix, puis le numéro choisi sur la série", async () => {
    const user = userEvent.setup();
    render(ui([4, 9]));
    expect(screen.getByText(/N° ––/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "N° 4" }));
    expect(screen.getByText(/N° 04/)).toHaveTextContent("/ 50");
  });

  it("n'affiche pas le choix de numéro pour un Classic", () => {
    render(ui([], vi.fn(), "Classic"));
    expect(screen.queryByRole("group")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Ajouter au panier" }),
    ).toBeInTheDocument();
  });

  it("rappelle la réservation de 15 minutes et les modes de paiement", () => {
    render(ui([4]));
    const rappel = screen.getByText(/15 minutes/);
    expect(rappel).toHaveTextContent(/TWINT/);
    expect(rappel).toHaveTextContent(/virement/);
  });
});

describe("[E8-08] Critère : boutons de 44 px minimum, navigables au clavier", () => {
  it("la feuille de style impose 44 px minimum en largeur et hauteur", () => {
    const css = readFileSync(
      `${process.cwd()}/components/AjoutPanier.module.css`,
      "utf8",
    );
    const bloc = css.match(/\.numero\s*\{[^}]*\}/)?.[0] ?? "";
    expect(bloc).toMatch(/min-width:\s*44px/);
    expect(bloc).toMatch(/min-height:\s*44px/);
  });

  it("les numéros sont de vrais <button> dans un groupe, atteignables à Tab", async () => {
    const user = userEvent.setup();
    render(ui([4, 9]));
    const groupe = screen.getByRole("group");
    const boutons = within(groupe).getAllByRole("button");
    expect(boutons).toHaveLength(2);
    boutons.forEach((b) => {
      expect(b.tagName).toBe("BUTTON");
      expect(b).not.toHaveAttribute("tabindex", "-1");
    });
    await user.tab();
    expect(boutons[0]).toHaveFocus();
    await user.tab();
    expect(boutons[1]).toHaveFocus();
  });

  it("Entrée et Espace sélectionnent un numéro", async () => {
    const user = userEvent.setup();
    render(ui([4, 9]));
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "N° 4" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "N° 9" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("[E8-08] Critère : pièce devenue indisponible, message clair et liste mise à jour", () => {
  it("annonce le message dans une zone status et prévient le parent", async () => {
    api.ajouterLigne.mockResolvedValue(indispo);
    const onUnavailable = vi.fn();
    const user = userEvent.setup();
    render(ui([4, 9], onUnavailable));
    await user.click(screen.getByRole("button", { name: "N° 9" }));
    await user.click(
      screen.getByRole("button", { name: "Réserver la pièce N° 9" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      fr.fiche.cart.errorUnavailable,
    );
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it("propose un autre numéro libre et le réserve au clic", async () => {
    api.ajouterLigne.mockResolvedValueOnce(indispo);
    api.ajouterLigne.mockResolvedValueOnce(succes);
    const user = userEvent.setup();
    render(ui([4, 9]));
    await user.click(screen.getByRole("button", { name: "N° 9" }));
    await user.click(
      screen.getByRole("button", { name: "Réserver la pièce N° 9" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Réserver plutôt le n° 4" }),
    );
    expect(api.ajouterLigne.mock.calls[1][0]).toMatchObject({ numero: 4 });
  });

  it("le numéro disparu de la liste retombe sur l'attribution automatique", async () => {
    const { rerender } = render(ui([4, 9]));
    await userEvent.setup().click(screen.getByRole("button", { name: "N° 9" }));
    rerender(ui([4]));
    expect(screen.queryByRole("button", { name: "N° 9" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/N° ––/)).toBeInTheDocument();
  });

  it("un conflit en attribution automatique prévient aussi le parent", async () => {
    api.ajouterLigne.mockResolvedValue(indispo);
    const onUnavailable = vi.fn();
    const user = userEvent.setup();
    render(ui([4, 9], onUnavailable));
    await user.click(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      fr.fiche.cart.errorUnavailable,
    );
    expect(onUnavailable).toHaveBeenCalled();
  });

  it("une autre erreur affiche le message générique sans rafraîchir la liste", async () => {
    api.ajouterLigne.mockResolvedValue({
      ok: false,
      error: { code: "serveur", message: "" },
    });
    const onUnavailable = vi.fn();
    const user = userEvent.setup();
    render(ui([4, 9], onUnavailable));
    await user.click(
      screen.getByRole("button", { name: "Réserver une pièce" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      fr.fiche.cart.errorGeneric,
    );
    expect(onUnavailable).not.toHaveBeenCalled();
  });
});
