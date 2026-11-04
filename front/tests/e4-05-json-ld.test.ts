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
import { priceDecimal, productJsonLd } from "@/lib/seo";

const { api } = hoisted;

function findScript(node: ReactNode): ReactElement<{
  type?: string;
  dangerouslySetInnerHTML?: { __html: string };
}> | null {
  if (!isValidElement(node)) return null;
  const el = node as ReactElement<{
    type?: string;
    children?: ReactNode;
    dangerouslySetInnerHTML?: { __html: string };
  }>;
  if (el.type === "script" && el.props.type === "application/ld+json") {
    return el;
  }
  const children = [el.props.children].flat();
  for (const child of children) {
    const found = findScript(child);
    if (found) return found;
  }
  return null;
}

async function jsonLdFor(
  index: number,
  disponibilite: unknown,
): Promise<Record<string, unknown>> {
  const produit = produits[index];
  api.produit.mockResolvedValue({ ok: true, data: detailDe(produit) });
  api.disponibilite.mockResolvedValue(disponibilite);
  const page = await FicheProduitPage({
    params: Promise.resolve({ locale: "fr", slug: produit.slug }),
  });
  const script = findScript(page);
  expect(script).not.toBeNull();
  return JSON.parse(script!.props.dangerouslySetInnerHTML!.__html);
}

describe("E4-05 JSON-LD Product", () => {
  beforeEach(() => vi.clearAllMocks());

  it("priceDecimal reste en entiers", () => {
    expect(priceDecimal(124000)).toBe("1240.00");
    expect(priceDecimal(12905)).toBe("129.05");
    expect(priceDecimal(5)).toBe("0.05");
  });

  it("contient nom, images, marque et offre en CHF", async () => {
    const data = await jsonLdFor(0, {
      ok: true,
      data: { gamme: "Classic", quantite_disponible: 3 },
    });
    const detail = detailDe(produits[0]);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe(`${detail.modele.nom} ${detail.gamme}`);
    expect(data.brand).toEqual({ "@type": "Brand", name: "Noyer" });
    const images = data.image as string[];
    expect(images.length).toBeGreaterThan(0);
    for (const url of images) expect(url).toMatch(/^https?:\/\//);
    const offers = data.offers as Record<string, string>;
    expect(offers["@type"]).toBe("Offer");
    expect(offers.priceCurrency).toBe("CHF");
    expect(offers.price).toBe(priceDecimal(detail.prix_ttc_centimes));
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.url).toMatch(/^https?:\/\//);
  });

  it("rupture de stock Classic → OutOfStock", async () => {
    const data = await jsonLdFor(0, {
      ok: true,
      data: { gamme: "Classic", quantite_disponible: 0 },
    });
    expect((data.offers as Record<string, string>).availability).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("Premium : InStock si une série a des pièces restantes", () => {
    const produit = detailDe(produits[0]);
    const ld = (pieces: number) =>
      productJsonLd({
        produit,
        url: "/fr/x",
        description: "d",
        brand: "Noyer",
        disponibilite: {
          gamme: "Premium",
          series: [
            {
              id: 1,
              taille_serie: 10,
              pieces_restantes: pieces,
              numeros_disponibles: [],
            },
          ],
        },
      }).offers.availability;
    expect(ld(2)).toBe("https://schema.org/InStock");
    expect(ld(0)).toBe("https://schema.org/OutOfStock");
  });

  it("sans info de stock, availability est omis", async () => {
    const data = await jsonLdFor(0, { ok: false, error: { status: 500 } });
    expect(data.offers as object).not.toHaveProperty("availability");
  });
});
