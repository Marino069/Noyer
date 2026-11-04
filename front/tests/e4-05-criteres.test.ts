import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { detailDe, produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { produit: vi.fn(), disponibilite: vi.fn() },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import FicheProduitPage from "@/app/[locale]/produits/[slug]/page";
import { SITE_URL } from "@/lib/env";
import { productJsonLd } from "@/lib/seo";

const { api } = hoisted;

function findScripts(node: ReactNode, acc: string[] = []): string[] {
  if (!isValidElement(node)) return acc;
  const el = node as ReactElement<{
    type?: string;
    children?: ReactNode;
    dangerouslySetInnerHTML?: { __html: string };
  }>;
  if (el.type === "script" && el.props.type === "application/ld+json") {
    acc.push(el.props.dangerouslySetInnerHTML!.__html);
  }
  for (const child of [el.props.children].flat()) findScripts(child, acc);
  return acc;
}

async function render(index: number, disponibilite: unknown) {
  const p = produits[index];
  api.produit.mockResolvedValue({ ok: true, data: detailDe(p) });
  api.disponibilite.mockResolvedValue(disponibilite);
  const page = await FicheProduitPage({
    params: Promise.resolve({ locale: "fr", slug: p.slug }),
  });
  const scripts = findScripts(page);
  return { scripts, data: JSON.parse(scripts[0]) };
}

const indispo = { ok: false, error: { status: 500 } };

describe("E4-05 – critères d'acceptation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("la fiche contient exactement un bloc JSON-LD Product", async () => {
    const { scripts, data } = await render(0, {
      ok: true,
      data: { gamme: "Classic", quantite_disponible: 1 },
    });
    expect(scripts).toHaveLength(1);
    expect(data["@type"]).toBe("Product");
  });

  it("nom distinct pour chaque produit (deux gammes d'un même modèle)", async () => {
    const names = new Set<string>();
    for (let i = 0; i < produits.length; i++) {
      const { data } = await render(i, indispo);
      names.add(data.name);
    }
    expect(names.size).toBe(produits.length);
  });

  it("prix CHF exact pour chaque produit, en décimal depuis les centimes", async () => {
    for (let i = 0; i < produits.length; i++) {
      const { data } = await render(i, indispo);
      const c = produits[i].prix_ttc_centimes;
      expect(data.offers.priceCurrency).toBe("CHF");
      expect(data.offers.price).toBe(
        `${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`,
      );
    }
  });

  it("images : URL absolues, une par média, plus grande source", () => {
    const produit = detailDe(produits[0]);
    const ld = productJsonLd({
      produit,
      disponibilite: null,
      url: "/fr/produits/x",
      description: "d",
      brand: "Noyer",
    });
    expect(ld.image).toHaveLength(produit.medias.length);
    produit.medias.forEach((m, i) => {
      const largest = m.sources.reduce((a, b) =>
        b.largeur > a.largeur ? b : a,
      );
      const expected = /^https?:\/\//.test(largest.url)
        ? largest.url
        : `${SITE_URL}${largest.url}`;
      expect(ld.image[i]).toBe(expected);
    });
  });

  it("URL de l'offre absolue, pointant vers la fiche", async () => {
    const { data } = await render(1, indispo);
    expect(data.offers.url.startsWith(SITE_URL)).toBe(true);
    expect(data.offers.url).toContain(produits[1].slug);
  });

  it("disponibilité Premium via la page : InStock / OutOfStock", async () => {
    const serie = (n: number) => ({
      ok: true,
      data: {
        gamme: "Premium",
        series: [
          {
            id: 1,
            taille_serie: 10,
            pieces_restantes: n,
            numeros_disponibles: [],
          },
        ],
      },
    });
    expect((await render(1, serie(3))).data.offers.availability).toBe(
      "https://schema.org/InStock",
    );
    expect((await render(1, serie(0))).data.offers.availability).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("aucune série Premium → OutOfStock", () => {
    const ld = productJsonLd({
      produit: detailDe(produits[1]),
      disponibilite: { gamme: "Premium", series: [] },
      url: "/fr/x",
      description: "d",
      brand: "Noyer",
    });
    expect(ld.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("le JSON injecté ne peut pas fermer la balise script", async () => {
    const produit = detailDe(produits[0]);
    produit.modele.description = "</script><script>alert(1)</script>";
    api.produit.mockResolvedValue({ ok: true, data: produit });
    api.disponibilite.mockResolvedValue(indispo);
    const page = await FicheProduitPage({
      params: Promise.resolve({ locale: "fr", slug: produits[0].slug }),
    });
    const raw = findScripts(page)[0];
    expect(raw).not.toContain("<");
    expect(JSON.parse(raw).description).toContain("</script>");
  });

  it("produit introuvable : 404, pas de JSON-LD", async () => {
    api.produit.mockResolvedValue({ ok: false, error: { status: 404 } });
    api.disponibilite.mockResolvedValue(indispo);
    await expect(
      FicheProduitPage({
        params: Promise.resolve({ locale: "fr", slug: "inconnu" }),
      }),
    ).rejects.toThrow();
  });
});
