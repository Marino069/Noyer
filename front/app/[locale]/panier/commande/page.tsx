import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { SHOP_ENABLED } from "@/lib/env";
import { localePath } from "@/lib/routes";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { checkout } = await getDictionary(locale);
  // Page personnelle : jamais indexée.
  return { title: checkout.title, robots: { index: false, follow: false } };
}

export default async function CommandePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale) || !SHOP_ENABLED) notFound();
  const { checkout } = await getDictionary(locale);
  return (
    <main id="contenu" tabIndex={-1}>
      <Checkout
        locale={locale}
        textes={checkout}
        catalogueHref={`/${locale}/produits`}
        cgvHref={localePath(locale, "cgv")}
        paiementHref={`/${locale}/panier/paiement`}
      />
    </main>
  );
}
