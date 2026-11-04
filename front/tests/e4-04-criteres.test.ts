import { beforeEach, describe, expect, it, vi } from "vitest";
import { detailDe, produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { produit: vi.fn(), produits: vi.fn() },
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "", className: "" }),
  Hanken_Grotesk: () => ({ variable: "", className: "" }),
}));

import { generateMetadata as layoutMeta } from "@/app/[locale]/layout";
import { generateMetadata } from "@/app/[locale]/produits/[slug]/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { locales } from "@/i18n/config";
import { SITE_URL } from "@/lib/env";

const { api } = hoisted;

async function meta(index: number) {
  const p = produits[index];
  api.produit.mockResolvedValue({ ok: true, data: detailDe(p) });
  return generateMetadata({
    params: Promise.resolve({ locale: "fr", slug: p.slug }),
  });
}

const page = (results: typeof produits, next: string | null) => ({
  ok: true,
  data: { count: produits.length, next, previous: null, results },
});

describe("E4-04 – critères d'acceptation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("title et description uniques pour chaque produit (même modèle, deux gammes)", async () => {
    const all = [];
    for (let i = 0; i < produits.length; i++) all.push(await meta(i));
    const titles = all.map((m) => String(m.title));
    const descs = all.map((m) => m.description);
    expect(titles.every(Boolean)).toBe(true);
    expect(descs.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(produits.length);
    expect(new Set(descs).size).toBe(produits.length);
  });

  it("Open Graph : titre, description et image du produit (la plus grande source)", async () => {
    const m = await meta(0);
    const og = m.openGraph as {
      title: string;
      description: string;
      images: { url: string }[];
    };
    expect(og.title).toBeTruthy();
    expect(og.description).toBe(m.description);
    const largest = produits[0].image_principale!.sources.reduce((a, b) =>
      b.largeur > a.largeur ? b : a,
    );
    expect(og.images[0].url).toBe(largest.url);
  });

  it("URL canonique propre à chaque produit", async () => {
    const a = await meta(0);
    const b = await meta(1);
    expect(String(a.alternates?.canonical)).toContain(produits[0].slug);
    expect(String(b.alternates?.canonical)).toContain(produits[1].slug);
    expect(a.alternates?.canonical).not.toBe(b.alternates?.canonical);
  });

  it("metadataBase du layout = SITE_URL (canonical absolu)", async () => {
    const m = await layoutMeta({ params: Promise.resolve({ locale: "fr" }) });
    expect(m.metadataBase?.toString()).toBe(new URL(SITE_URL).toString());
  });

  it("hreflang : une entrée par langue active + x-default", async () => {
    const m = await meta(0);
    const langs = m.alternates?.languages as Record<string, string>;
    for (const l of locales) expect(langs[l]).toContain(produits[0].slug);
    expect(langs["x-default"]).toBeTruthy();
  });

  it("produit introuvable : pas de metadata inventée", async () => {
    api.produit.mockResolvedValue({ ok: false, error: { kind: "not_found" } });
    const m = await generateMetadata({
      params: Promise.resolve({ locale: "fr", slug: "inconnu" }),
    });
    expect(m.title).toBeUndefined();
  });

  it("sitemap : accueil, catalogue et tous les produits en URLs absolues", async () => {
    api.produits.mockResolvedValue(page(produits, null));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.every((u) => u.startsWith(SITE_URL))).toBe(true);
    expect(urls).toContain(`${SITE_URL}/fr`);
    expect(urls).toContain(`${SITE_URL}/fr/produits`);
    for (const p of produits)
      expect(urls).toContain(`${SITE_URL}/fr/produits/${p.slug}`);
  });

  it("sitemap : parcourt toutes les pages paginées de l'API", async () => {
    api.produits
      .mockResolvedValueOnce(page(produits.slice(0, 2), "p2"))
      .mockResolvedValueOnce(page(produits.slice(2), null));
    const urls = (await sitemap()).map((e) => e.url);
    for (const p of produits)
      expect(urls.some((u) => u.endsWith(p.slug))).toBe(true);
  });

  it("sitemap : hreflang sur chaque entrée", async () => {
    api.produits.mockResolvedValue(page([produits[0]], null));
    for (const e of await sitemap()) {
      const langs = e.alternates?.languages as Record<string, string>;
      expect(langs).toHaveProperty("x-default");
      for (const l of locales) expect(langs).toHaveProperty(l);
    }
  });

  it("sitemap : une API en erreur ne fait pas planter la génération", async () => {
    api.produits.mockResolvedValue({ ok: false, error: { kind: "network" } });
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/fr`);
  });

  it("robots : bloque /api/ et référence le sitemap", () => {
    const r = robots();
    expect(JSON.stringify(r.rules)).toContain("/api/");
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
