import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Confirmation } from "@/components/Confirmation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { SHOP_ENABLED } from "@/lib/env";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reference?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { confirmation } = await getDictionary(locale);
  // Page personnelle : jamais indexée.
  return {
    title: confirmation.title,
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmationPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  if (!hasLocale(locale) || !SHOP_ENABLED) notFound();
  const { reference } = await searchParams;
  const { confirmation } = await getDictionary(locale);
  return (
    <main id="contenu" tabIndex={-1}>
      <Confirmation
        textes={confirmation}
        locale={locale}
        reference={reference?.trim() || null}
        catalogueHref={`/${locale}/produits`}
      />
    </main>
  );
}
