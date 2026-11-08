// Tests indépendants des critères d'acceptation de #30 (E4-02).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { detailDe, produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { produit: vi.fn(), disponibilite: vi.fn() },
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
import { Galerie } from "@/components/Galerie";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;
const classic = detailDe(produits[0]);

beforeAll(() => {
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
  hoisted.notFound.mockClear();
  api.produit.mockResolvedValue({ ok: true, data: classic });
  api.disponibilite.mockResolvedValue({
    ok: true,
    data: { gamme: "Classic", quantite_disponible: 2 },
  });
});

const renderPage = async (slug: string) =>
  render(
    await FicheProduitPage({
      params: Promise.resolve({ locale: "fr", slug }),
    }),
  );

describe("[E4-02] URL /produits/[slug]", () => {
  it("la route existe sous app/[locale]/produits/[slug]", () => {
    expect(
      existsSync(
        resolve(__dirname, "../app/[locale]/produits/[slug]/page.tsx"),
      ),
    ).toBe(true);
  });

  it("/produits/lucerne-classic interroge l'API avec ce slug et affiche le produit", async () => {
    await renderPage("lucerne-classic");
    expect(api.produit).toHaveBeenCalledWith("lucerne-classic");
    expect(
      screen.getByRole("heading", { level: 1, name: classic.modele.nom }),
    ).toBeInTheDocument();
  });
});

describe("[E4-02] Produit inexistant → 404", () => {
  it("404 de l'API → notFound()", async () => {
    api.produit.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 404, code: "introuvable", message: "x" },
    });
    await expect(renderPage("n-existe-pas")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(hoisted.notFound).toHaveBeenCalledTimes(1);
  });

  it("locale inconnue → notFound()", async () => {
    await expect(
      FicheProduitPage({
        params: Promise.resolve({ locale: "xx", slug: "lucerne-classic" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("[E4-02] Galerie accessible, alt par photo", () => {
  it("chaque photo de la fiche a un alt non vide, distinct", async () => {
    await renderPage("lucerne-classic");
    const alts = classic.medias.map((m) => m.alt);
    expect(alts.every((a) => a.trim().length > 0)).toBe(true);
    expect(new Set(alts).size).toBe(alts.length);
    for (const img of screen.getAllByRole("img")) {
      expect(img.getAttribute("alt")).toBeTruthy();
    }
    // L'image « allumée » est décorative et chargée à la demande (#311) :
    // elle n'est pas dans la galerie au rendu initial.
    const affichees = classic.medias.filter(
      (m) => !m.sources.some((s) => s.url.includes("-allumee")),
    );
    for (const { alt } of affichees) {
      expect(screen.getAllByRole("img", { name: alt }).length).toBeGreaterThan(
        0,
      );
    }
  });

  it("la galerie est un groupe nommé, les commandes sont des boutons nommés", () => {
    render(
      <Galerie medias={classic.medias.slice(0, 3)} textes={fr.fiche.gallery} />,
    );
    expect(
      screen.getByRole("group", { name: "Galerie photo" }),
    ).toBeInTheDocument();
    for (const b of screen.getAllByRole("button")) {
      expect(b).toHaveAccessibleName();
    }
  });

  it("navigation au clavier (flèches) et position annoncée", async () => {
    const user = userEvent.setup();
    render(
      <Galerie medias={classic.medias.slice(0, 3)} textes={fr.fiche.gallery} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Photo 1 sur 3");
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("status")).toHaveTextContent("Photo 2 sur 3");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("status")).toHaveTextContent("Photo 3 sur 3");
  });

  it("plein écran : dialog modal nommé, fermeture rend le focus à l'ouverture", async () => {
    const user = userEvent.setup();
    render(
      <Galerie medias={classic.medias.slice(0, 3)} textes={fr.fiche.gallery} />,
    );
    const opener = screen.getByRole("button", { name: /Agrandir la photo/ });
    await user.click(opener);
    const dialog = await screen.findByRole("dialog", {
      name: "Photos en plein écran",
    });
    const fermer = within(dialog).getByRole("button", { name: "Fermer" });
    await user.click(fermer);
    expect(opener).toHaveFocus();
  });
});
