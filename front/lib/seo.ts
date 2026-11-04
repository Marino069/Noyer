import { locales, type Locale } from "@/i18n/config";
import type { Image } from "@/lib/api";

// hreflang : une entrée par langue active (+ x-default). `pathFor` donne le
// chemin public d'une page pour une langue donnée.
export function languageAlternates(
  pathFor: (locale: Locale) => string,
  defaultLocale: Locale,
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = pathFor(locale);
  languages["x-default"] = pathFor(defaultLocale);
  return languages;
}

// Image Open Graph : la plus grande source disponible.
export function ogImage(image: Image | undefined | null) {
  if (!image || image.sources.length === 0) return [];
  const source = image.sources.reduce((a, b) =>
    b.largeur > a.largeur ? b : a,
  );
  const height = Math.round(
    (source.largeur * image.hauteur_origine) / image.largeur_origine,
  );
  return [{ url: source.url, width: source.largeur, height, alt: image.alt }];
}
