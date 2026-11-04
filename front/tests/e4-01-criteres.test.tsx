// Tests indépendants des critères d'acceptation de #29 (E4-01).
import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { produits } from "@/mocks/data";
import nextConfig from "@/next.config";

const api = vi.hoisted(() => ({ produits: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...api } };
});

import ProduitsPage from "@/app/[locale]/produits/page";

const reponse = (count: number) => ({
  ok: true as const,
  data: { count, next: null, previous: null, results: produits },
});

const renderPage = async (searchParams: Record<string, string | string[]>) =>
  render(
    await ProduitsPage({
      params: Promise.resolve({ locale: "fr" }),
      searchParams: Promise.resolve(searchParams),
    }),
  );

beforeEach(() => {
  api.produits.mockReset();
  api.produits.mockResolvedValue(reponse(produits.length));
});

describe("[E4-01] Filtre reflété dans l'URL", () => {
  it("sans filtre, « Toutes » est le filtre actif", async () => {
    await renderPage({});
    const nav = screen.getByRole("navigation", { name: "Filtrer par gamme" });
    expect(within(nav).getByRole("link", { name: "Toutes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Classic" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("?gamme=Classic filtre la requête et marque Classic actif", async () => {
    await renderPage({ gamme: "Classic" });
    expect(api.produits).toHaveBeenCalledWith(
      expect.objectContaining({ gamme: "Classic" }),
    );
    expect(screen.getByRole("link", { name: "Classic" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("un paramètre répété prend la première valeur, sans planter", async () => {
    await renderPage({ gamme: ["Premium", "Classic"] });
    expect(api.produits).toHaveBeenCalledWith(
      expect.objectContaining({ gamme: "Premium" }),
    );
  });

  it("changer de filtre repart de la page 1 (liens sans paramètre page)", async () => {
    api.produits.mockResolvedValue(reponse(60));
    await renderPage({ gamme: "Classic", page: "3" });
    const nav = screen.getByRole("navigation", { name: "Filtrer par gamme" });
    for (const l of within(nav).getAllByRole("link")) {
      expect(l.getAttribute("href")).not.toContain("page=");
    }
  });

  it("les anciens chemins /produits/classic et /premium redirigent vers le filtre", async () => {
    const redirects = await nextConfig.redirects!();
    const cible = (source: string) =>
      redirects.find((r) => r.source === source)?.destination;
    expect(cible("/:locale/produits/classic")).toBe(
      "/:locale/produits?gamme=Classic",
    );
    expect(cible("/:locale/produits/premium")).toBe(
      "/:locale/produits?gamme=Premium",
    );
  });
});

describe("[E4-01] Rendu serveur et pagination > 24", () => {
  it("la page n'est pas un composant client", () => {
    const src = readFileSync(
      resolve(import.meta.dirname, "../app/[locale]/produits/page.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/^\s*["']use client["']/m);
    expect(src).not.toMatch(/useEffect|useState/);
  });

  it("25 produits (page de 24) : 2 pages", async () => {
    api.produits.mockResolvedValue(reponse(25));
    await renderPage({});
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(
      within(nav).getByRole("link", { name: "Page 1" }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Page 2" }),
    ).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Page 3" })).toBeNull();
  });

  it("48 produits : 2 pages ; 49 produits : 3 pages", async () => {
    api.produits.mockResolvedValue(reponse(48));
    const { unmount } = await renderPage({});
    expect(screen.queryByRole("link", { name: "Page 3" })).toBeNull();
    unmount();
    api.produits.mockResolvedValue(reponse(49));
    await renderPage({});
    expect(screen.getByRole("link", { name: "Page 3" })).toBeInTheDocument();
  });

  it("page 1 : Suivant sans Précédent ; page 2 : les deux, avec rel", async () => {
    api.produits.mockResolvedValue(reponse(60));
    const { unmount } = await renderPage({ gamme: "Premium" });
    expect(screen.queryByRole("link", { name: "Précédent" })).toBeNull();
    expect(screen.getByRole("link", { name: "Suivant" })).toHaveAttribute(
      "href",
      "/fr/produits?gamme=Premium&page=2",
    );
    unmount();
    await renderPage({ gamme: "Premium", page: "2" });
    const prev = screen.getByRole("link", { name: "Précédent" });
    const next = screen.getByRole("link", { name: "Suivant" });
    expect(prev).toHaveAttribute("rel", "prev");
    expect(next).toHaveAttribute("rel", "next");
    expect(next).toHaveAttribute("href", "/fr/produits?gamme=Premium&page=3");
    expect(api.produits).toHaveBeenLastCalledWith({
      gamme: "Premium",
      page: 2,
    });
  });

  it("une page non numérique est ignorée", async () => {
    await renderPage({ page: "abc" });
    expect(api.produits).toHaveBeenCalledWith({
      gamme: undefined,
      page: undefined,
    });
  });
});

describe("[E4-01] Annonce du nombre de résultats", () => {
  it("annonce le total de l'API, pas le nombre de cartes de la page", async () => {
    api.produits.mockResolvedValue(reponse(60));
    await renderPage({});
    expect(screen.getByRole("status")).toHaveTextContent("60 résultats");
  });

  it("singulier pour un seul résultat", async () => {
    api.produits.mockResolvedValue({
      ok: true,
      data: { count: 1, next: null, previous: null, results: [produits[0]] },
    });
    await renderPage({});
    expect(screen.getByRole("status")).toHaveTextContent(/^1 résultat$/);
  });

  it("la région d'annonce est unique", async () => {
    await renderPage({});
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
