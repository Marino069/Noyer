import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ErrorState";
import { FicheProduit } from "@/components/FicheProduit";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getProductKey, getProductPath } from "@/i18n/slugs";
import { api } from "@/lib/api";
import { SHOP_ENABLED } from "@/lib/env";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const key = getProductKey(slug, locale);
  const result = await api.produit(key);
  if (!result.ok) return {};
  const { modele, gamme } = result.data;
  return {
    title: `${modele.nom} ${gamme}`,
    description: modele.description,
    alternates: { canonical: getProductPath(key, locale) },
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

  return (
    <main id="contenu" tabIndex={-1}>
      <FicheProduit
        produit={produit.data}
        disponibilite={disponibilite}
        locale={locale}
        shopEnabled={SHOP_ENABLED}
        textes={dictionary.fiche}
        prix={dictionary.price}
        badge={dictionary.badge}
      />
    </main>
  );
}
