import { beforeEach, describe, expect, it, vi } from "vitest";
import { detailDe, produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { produit: vi.fn(), produits: vi.fn() },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { generateMetadata } from "@/app/[locale]/produits/[slug]/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const { api } = hoisted;

async function meta(index: number) {
  const produit = produits[index];
  api.produit.mockResolvedValue({ ok: true, data: detailDe(produit) });
  return generateMetadata({
    params: Promise.resolve({ locale: "fr", slug: produit.slug }),
  });
}

describe("E4-04 SEO", () => {
  beforeEach(() => vi.clearAllMocks());

  it("title et description uniques par produit", async () => {
    const a = await meta(0);
    const b = await meta(1);
    expect(a.title).not.toBe(b.title);
    expect(a.description).not.toBe(b.description);
  });

  it("Open Graph avec image produit", async () => {
    const m = await meta(0);
    const images = (m.openGraph as { images: { url: string }[] }).images;
    expect(images[0].url).toBeTruthy();
  });

  it("canonical et hreflang", async () => {
    const m = await meta(0);
    expect(m.alternates?.canonical).toBe(`/fr/produits/${produits[0].slug}`);
    expect(m.alternates?.languages).toHaveProperty("fr");
    expect(m.alternates?.languages).toHaveProperty("x-default");
  });

  it("sitemap contient les produits, robots référence le sitemap", async () => {
    api.produits.mockResolvedValue({
      ok: true,
      data: {
        count: produits.length,
        next: null,
        previous: null,
        results: produits,
      },
    });
    const urls = (await sitemap()).map((e) => e.url);
    for (const p of produits) {
      expect(urls.some((u) => u.endsWith(`/fr/produits/${p.slug}`))).toBe(true);
    }
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
