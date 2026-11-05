import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ api: { payer: vi.fn() } }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { Paiement } from "@/components/Paiement";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;

const rendre = (premium: boolean) =>
  render(
    <Paiement
      textes={fr.paiement}
      reference="NOY-2026-00042"
      retour={null}
      premium={premium}
      panierHref="/fr/panier"
      redirect={vi.fn()}
    />,
  );

beforeEach(() => api.payer.mockReset());

describe("E5-05 · virement bancaire pour le Premium", () => {
  it("n'affiche pas le virement sans Premium dans le panier", () => {
    rendre(false);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText(/Virement bancaire/)).toBeNull();
  });

  it("propose le virement quand le panier contient du Premium", () => {
    rendre(true);
    expect(
      screen.getByRole("radio", { name: /Virement bancaire/ }),
    ).toBeVisible();
  });

  it("affiche coordonnées, référence et délai prolongé", async () => {
    api.payer.mockResolvedValue({
      ok: true,
      data: {
        methode: "virement",
        iban: "CH9300762011623852957",
        beneficiaire: "Noyer",
        reference: "NOY-2026-00042",
        delai_jours: 5,
      },
    });
    rendre(true);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /Virement bancaire/ }));
    await user.click(
      screen.getByRole("button", { name: "Choisir le virement" }),
    );
    await waitFor(() =>
      expect(api.payer).toHaveBeenCalledWith("NOY-2026-00042", "virement"),
    );
    expect(await screen.findByText("CH9300762011623852957")).toBeVisible();
    expect(screen.getByText("Noyer")).toBeVisible();
    expect(screen.getAllByText("NOY-2026-00042").length).toBeGreaterThan(0);
    expect(screen.getByText(/réservée 5 jours/)).toBeVisible();
  });
});
