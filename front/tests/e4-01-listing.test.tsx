import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { networkError } from "@/lib/api";
import { produits } from "@/mocks/data";
import fr from "@/i18n/dictionaries/fr.json";

const api = vi.hoisted(() => ({ produits: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...api } };
});

import ProduitsPage from "@/app/[locale]/produits/page";
import { ProduitsListe } from "@/components/ProduitsListe";

const page = (results: typeof produits, count = results.length) => ({
  ok: true as const,
  data: { count, next: null, previous: null, results },
});

const renderPage = async (searchParams: Record<string, string> = {}) =>
  render(
    await ProduitsPage({
      params: Promise.resolve({ locale: "fr" }),
      searchParams: Promise.resolve(searchParams),
    }),
  );

beforeEach(() => {
  api.produits.mockReset();
  api.produits.mockResolvedValue(page(produits));
});

describe("[E4-01] Page listing produits", () => {
  it("rend côté serveur les produits et interroge l'API sans filtre par défaut", async () => {
    await renderPage();
    expect(api.produits).toHaveBeenCalledWith({
      gamme: undefined,
      page: undefined,
    });
    expect(screen.getAllByRole("article")).toHaveLength(produits.length);
  });

  it("reflète le filtre Classic / Premium dans l'URL (liens partageables)", async () => {
    await renderPage({ gamme: "Premium" });
    expect(api.produits).toHaveBeenCalledWith({
      gamme: "Premium",
      page: undefined,
    });
    const nav = screen.getByRole("navigation", { name: "Filtrer par gamme" });
    expect(within(nav).getByRole("link", { name: "Toutes" })).toHaveAttribute(
      "href",
      "/fr/produits",
    );
    expect(within(nav).getByRole("link", { name: "Classic" })).toHaveAttribute(
      "href",
      "/fr/produits?gamme=Classic",
    );
    const premium = within(nav).getByRole("link", { name: "Premium" });
    expect(premium).toHaveAttribute("href", "/fr/produits?gamme=Premium");
    expect(premium).toHaveAttribute("aria-current", "page");
  });

  it("ignore une gamme ou une page invalide", async () => {
    await renderPage({ gamme: "Autre", page: "-3" });
    expect(api.produits).toHaveBeenCalledWith({
      gamme: undefined,
      page: undefined,
    });
  });

  it("annonce le nombre de résultats aux lecteurs d'écran", async () => {
    await renderPage();
    expect(screen.getByRole("status")).toHaveTextContent(
      `${produits.length} résultats`,
    );
  });

  it("n'affiche pas de pagination jusqu'à 24 produits", async () => {
    api.produits.mockResolvedValue(page(produits, 24));
    await renderPage();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("affiche la pagination au-delà de 24 produits, en conservant le filtre", async () => {
    api.produits.mockResolvedValue(page(produits, 30));
    await renderPage({ gamme: "Classic", page: "2" });
    expect(api.produits).toHaveBeenCalledWith({ gamme: "Classic", page: 2 });
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(
      within(nav).getByRole("link", { name: "Précédent" }),
    ).toHaveAttribute("href", "/fr/produits?gamme=Classic");
    expect(within(nav).getByRole("link", { name: "Page 1" })).toHaveAttribute(
      "href",
      "/fr/produits?gamme=Classic",
    );
    expect(within(nav).getByRole("link", { name: "Page 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).queryByRole("link", { name: "Suivant" })).toBeNull();
  });

  it("affiche un état vide et une alerte en cas d'erreur", () => {
    const textes = fr.catalogue;
    const { rerender } = render(
      <ProduitsListe
        produits={page([])}
        locale="fr"
        page={1}
        textes={textes}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Aucun résultat");
    expect(screen.getByText(textes.empty)).toBeInTheDocument();
    rerender(
      <ProduitsListe
        produits={{ ok: false, error: networkError() }}
        locale="fr"
        page={1}
        textes={textes}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Catalogue indisponible",
    );
  });
});
