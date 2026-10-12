import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { heroAccueil } from "@/mocks/data";
import frDict from "@/i18n/dictionaries/fr.json";

const heroAccueilMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ api: { heroAccueil: heroAccueilMock } }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

import HomePage from "./page";

async function renderHome() {
  render(await HomePage({ params: Promise.resolve({ locale: "fr" }) }));
}

beforeEach(() => heroAccueilMock.mockReset());

describe("[E3-01] Homepage : contenu éditable via l'API", () => {
  it("affiche le contenu (texte, image, CTA) fourni par l'API", async () => {
    heroAccueilMock.mockResolvedValue({
      ok: true,
      data: {
        ...heroAccueil,
        titre: "Titre édité",
        mot_italique: "édité",
        cta_libelle: "Voir",
        cta_chemin: "/produits/premium",
      },
    });
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Titre édité",
    );
    expect(screen.getByRole("link", { name: "Voir" })).toHaveAttribute(
      "href",
      "/fr/produits/premium",
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("se rabat sur le dictionnaire si l'API est indisponible", async () => {
    heroAccueilMock.mockResolvedValue({ ok: false });
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      frDict.home.title,
    );
    expect(
      screen.getByRole("link", { name: frDict.home.hero.cta }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
