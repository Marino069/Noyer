import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/Hero";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { api } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};

  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}`])),
        "x-default": `/${defaultLocale}`,
      },
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const { home } = await getDictionary(locale);

  // Contenu éditable ; si l'API est indisponible, repli sur le texte du dictionnaire.
  const result = await api.heroAccueil();
  const contenu = result.ok
    ? result.data
    : {
        titre: home.title,
        mot_italique: null,
        sous_titre: home.tagline,
        cta_libelle: home.hero.cta,
        cta_chemin: "/produits/classic",
        image: null,
      };

  return (
    <main id="contenu" tabIndex={-1}>
      <Hero
        contenu={contenu}
        ctaHref={`/${locale}${
          contenu.cta_chemin.startsWith("/") ? contenu.cta_chemin : ""
        }`}
      />
    </main>
  );
}
