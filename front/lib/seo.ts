import { locales, type Locale } from "@/i18n/config";
import { SITE_URL } from "@/lib/env";
import type { Disponibilite, Media, ProduitDetail } from "@/lib/api";

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
export function ogImage(image: Media | undefined | null) {
  const sources = image?.sources ?? [];
  if (!image || sources.length === 0) return [];
  const source = sources.reduce((a, b) => (b.largeur > a.largeur ? b : a));
  const height = Math.round(
    (source.largeur * (image.hauteur_origine ?? 0)) /
      (image.largeur_origine || 1),
  );
  return [{ url: source.url, width: source.largeur, height, alt: image.alt }];
}

// Centimes entiers → « 1240.00 » sans passer par un flottant.
export function priceDecimal(centimes: number): string {
  return `${Math.floor(centimes / 100)}.${String(centimes % 100).padStart(2, "0")}`;
}

// Google exige des URL absolues dans les données structurées.
function absoluteUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${SITE_URL}${url}`;
}

function inStock(disponibilite: Disponibilite): boolean {
  return disponibilite.gamme === "Classic"
    ? disponibilite.quantite_disponible > 0
    : disponibilite.series.some((s) => s.pieces_restantes > 0);
}

// JSON-LD schema.org `Product` d'une fiche produit. Sans information de
// stock (appel échoué), `availability` est omis plutôt que deviné.
export function productJsonLd({
  produit,
  disponibilite,
  url,
  description,
  brand,
}: {
  produit: ProduitDetail;
  disponibilite: Disponibilite | null;
  url: string;
  description: string;
  brand: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${produit.modele.nom} ${produit.gamme}`,
    description,
    image: produit.medias.flatMap((m) =>
      !m.sources || m.sources.length === 0
        ? []
        : [
            absoluteUrl(
              m.sources.reduce((a, b) => (b.largeur > a.largeur ? b : a)).url,
            ),
          ],
    ),
    brand: { "@type": "Brand", name: brand },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(url),
      priceCurrency: "CHF",
      price: priceDecimal(produit.prix_ttc_centimes),
      ...(disponibilite && {
        availability: inStock(disponibilite)
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      }),
    },
  };
}
