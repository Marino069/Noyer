import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ErrorState";
import { FicheProduit } from "@/components/FicheProduit";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getProductKey, getProductPath } from "@/i18n/slugs";
import { api } from "@/lib/api";
import { SHOP_ENABLED } from "@/lib/env";
import { languageAlternates, ogImage, productJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const key = getProductKey(slug, locale);
  const result = await api.produit(key);
  if (!result.ok) return {};
  const { modele, gamme, medias } = result.data;
  const { meta } = await getDictionary(locale);
  const title = `${modele.nom} ${gamme}`;
  // La description du modèle est commune aux deux gammes : on la complète
  // pour que chaque page produit ait une meta description unique.
  const description = `${modele.description} ${meta.productSuffix.replace("{gamme}", gamme)}`;
  const canonical = getProductPath(key, locale);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: languageAlternates(
        (l) => getProductPath(key, l),
        defaultLocale,
      ),
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      locale,
      images: ogImage(medias[0]),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Rendu serveur à chaque requête (stock et prix à jour). Produit inconnu → 404.
export default async function FicheProduitPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const key = getProductKey(slug, locale);

  const [produit, disponibilite] = await Promise.all([
    api.produit(key),
    api.disponibilite(key),
  ]);
  const dictionary = await getDictionary(locale);

  if (!produit.ok) {
    if (produit.error.status === 404) notFound();
    return (
      <main id="contenu" tabIndex={-1}>
        <ErrorState
          title={dictionary.fiche.errorTitle}
          message={dictionary.fiche.errorMessage}
        />
      </main>
    );
  }

  const { meta } = dictionary;
  const jsonLd = productJsonLd({
    produit: produit.data,
    disponibilite: disponibilite.ok ? disponibilite.data : null,
    url: getProductPath(key, locale),
    description: `${produit.data.modele.description} ${meta.productSuffix.replace("{gamme}", produit.data.gamme)}`,
    brand: "Noyer",
  });

  return (
    <main id="contenu" tabIndex={-1}>
      <script
        type="application/ld+json"
        // "<" échappé pour qu'aucune valeur ne puisse fermer la balise.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <FicheProduit
        produit={produit.data}
        disponibilite={disponibilite}
        locale={locale}
        shopEnabled={SHOP_ENABLED}
        textes={dictionary.fiche}
        prix={dictionary.price}
        badge={dictionary.badge}
        interrupteur={dictionary.interrupteur}
      />
    </main>
  );
}
