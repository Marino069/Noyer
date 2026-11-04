import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Panier } from "@/components/Panier";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { SHOP_ENABLED } from "@/lib/env";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { panier } = await getDictionary(locale);
  // Page personnelle : jamais indexée.
  return { title: panier.title, robots: { index: false, follow: false } };
}

export default async function PanierPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale) || !SHOP_ENABLED) notFound();
  const { panier } = await getDictionary(locale);
  return (
    <main id="contenu" tabIndex={-1}>
      <Panier
        locale={locale}
        textes={panier}
        catalogueHref={`/${locale}/produits`}
        commandeHref={`/${locale}/panier/commande`}
      />
    </main>
  );
}
