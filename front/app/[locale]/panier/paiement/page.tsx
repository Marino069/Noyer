import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Paiement, type RetourPaiement } from "@/components/Paiement";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { SHOP_ENABLED } from "@/lib/env";
import { localePath } from "@/lib/routes";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    reference?: string;
    retour?: string;
    premium?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { paiement } = await getDictionary(locale);
  // Page personnelle : jamais indexée.
  return { title: paiement.title, robots: { index: false, follow: false } };
}

export default async function PaiementPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale) || !SHOP_ENABLED) notFound();
  const { reference, retour, premium } = await searchParams;
  const { paiement } = await getDictionary(locale);
  const issue: RetourPaiement =
    retour === "annule" || retour === "echec" ? retour : null;
  return (
    <main id="contenu" tabIndex={-1}>
      <Paiement
        textes={paiement}
        reference={reference?.trim() || null}
        retour={issue}
        premium={premium === "1"}
        panierHref={localePath(locale, "panier")}
      />
    </main>
  );
}
