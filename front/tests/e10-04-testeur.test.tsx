import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeuxGammes } from "@/components/DeuxGammes";
import fr from "@/i18n/dictionaries/fr.json";
import { detailDe, heroAccueil, produits } from "@/mocks/data";

const api = vi.hoisted(() => ({
  heroAccueil: vi.fn(),
  matiereAccueil: vi.fn(),
  produits: vi.fn(),
  produit: vi.fn(),
  disponibilite: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...api } };
});
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

import HomePage from "@/app/[locale]/page";

const classic = produits.find((p) => p.slug === "lucerne-classic")!;
const premium = produits.find((p) => p.slug === "lucerne-premium")!;
const TITRE = "Une forme, deux matières";

const renderHome = async () =>
  render(await HomePage({ params: Promise.resolve({ locale: "fr" }) }));

const css = readFileSync(
  join(__dirname, "../components/DeuxGammes.module.css"),
  "utf8",
);

const renderGammes = () =>
  render(
    <DeuxGammes
      classic={{ produit: classic }}
      premium={{ produit: premium }}
      locale="fr"
      textes={fr.home.gammes}
    />,
  );

beforeEach(() => {
  api.heroAccueil.mockResolvedValue({ ok: true, data: heroAccueil });
  api.matiereAccueil.mockResolvedValue({ ok: false });
  api.produit.mockImplementation(async (slug: string) => ({
    ok: true,
    data: detailDe(produits.find((p) => p.slug === slug)!),
  }));
  api.disponibilite.mockResolvedValue({ ok: false });
});

describe("[E10-04] Prix venant de l'API", () => {
  it("« à partir de » suit les prix du catalogue, pas des valeurs en dur", async () => {
    const catalogue = [
      { ...classic, prix_ttc_centimes: 27500 },
      { ...classic, slug: "autre-classic", prix_ttc_centimes: 31000 },
      { ...premium, prix_ttc_centimes: 98000 },
      { ...premium, slug: "autre-premium", prix_ttc_centimes: 87500 },
    ];
    api.produits.mockResolvedValue({ ok: true, data: { results: catalogue } });
    await renderHome();
    const region = screen.getByRole("region", { name: TITRE });
    const [c, p] = within(region).getAllByRole("article");
    expect(c).toHaveTextContent(/À partir de\s+CHF 275\.–/);
    expect(p).toHaveTextContent(/À partir de\s+CHF 875\.–/);
  });

  it("repli sur le prix du produit mis en avant si le catalogue est indisponible", async () => {
    api.produits
      .mockResolvedValueOnce({ ok: true, data: { results: produits } })
      .mockResolvedValue({ ok: false });
    await renderHome();
    const region = screen.getByRole("region", { name: TITRE });
    expect(region).toHaveTextContent(/À partir de\s+CHF 480\.–/);
  });
});

describe("[E10-04] Panneaux cliquables et clavier", () => {
  it("un lien focalisable par panneau, atteint dans l'ordre à la tabulation", async () => {
    const user = userEvent.setup();
    renderGammes();
    const liens = screen.getAllByRole("link");
    expect(liens).toHaveLength(2);
    for (const l of liens) expect(l).not.toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(liens[0]).toHaveFocus();
    await user.tab();
    expect(liens[1]).toHaveFocus();
  });

  it("le lien a un nom accessible et il n'y a qu'un seul lien par panneau", () => {
    renderGammes();
    for (const a of screen.getAllByRole("article")) {
      expect(within(a).getByRole("link").textContent?.trim()).not.toBe("");
      expect(a.querySelectorAll("a")).toHaveLength(1);
    }
  });

  it("le focus clavier reste visible (outline non supprimé)", () => {
    expect(css).not.toMatch(/outline:\s*(none|0)\b/);
    expect(css).toMatch(/:focus-visible/);
  });
});

describe("[E10-04] Empilés sur mobile", () => {
  it("aucune règle à deux colonnes hors media query ≥ 900 px", () => {
    const hors = css.slice(0, css.indexOf("@media"));
    expect(hors).not.toMatch(/repeat\(2/);
    expect(hors).not.toMatch(/grid-template-columns:\s*1fr\s+1fr/);
    expect(css).toMatch(/@media \(min-width: 900px\)/);
  });
});
