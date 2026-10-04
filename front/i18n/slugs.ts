import type { Locale } from "./config";

// Clé interne d'un produit (slug de l'API, docs/api.md) → slug public par langue.
// Une langue absente retombe sur la clé : seuls les slugs traduits sont à déclarer.
const productSlugs: Record<string, Partial<Record<Locale, string>>> = {};

export function getProductSlug(key: string, locale: Locale): string {
  return productSlugs[key]?.[locale] ?? key;
}

export function getProductKey(slug: string, locale: Locale): string {
  const entry = Object.entries(productSlugs).find(
    ([, slugs]) => slugs[locale] === slug,
  );
  return entry ? entry[0] : slug;
}

export function getProductPath(key: string, locale: Locale): string {
  return `/${locale}/produits/${getProductSlug(key, locale)}`;
}
