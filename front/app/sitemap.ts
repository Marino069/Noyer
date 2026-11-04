import type { MetadataRoute } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { getProductPath } from "@/i18n/slugs";
import { api, type ProduitResume } from "@/lib/api";
import { SITE_URL } from "@/lib/env";
import { languageAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function tousLesProduits(): Promise<ProduitResume[]> {
  const produits: ProduitResume[] = [];
  for (let page = 1; page <= 50; page++) {
    const result = await api.produits({ page });
    if (!result.ok) break;
    produits.push(...result.data.results);
    if (!result.data.next) break;
  }
  return produits;
}

const absolute = (path: string) => `${SITE_URL}${path}`;

function entriesFor(
  pathFor: (locale: Locale) => string,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    Object.entries(languageAlternates(pathFor, defaultLocale)).map(
      ([lang, path]) => [lang, absolute(path)],
    ),
  );
  return locales.map((locale) => ({
    url: absolute(pathFor(locale)),
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = [
    ...entriesFor((l) => `/${l}`),
    ...entriesFor((l) => `/${l}/produits`),
  ];
  for (const produit of await tousLesProduits()) {
    entries.push(...entriesFor((l) => getProductPath(produit.slug, l)));
  }
  return entries;
}
