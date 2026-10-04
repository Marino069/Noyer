// Langues actives. La liste reste à trancher (brief §08) : ajouter "en" ou "de"
// ici, puis créer i18n/dictionaries/<locale>.json et remplir i18n/slugs.ts.
export const locales = ["fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
