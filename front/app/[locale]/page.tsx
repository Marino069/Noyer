import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Atelier } from "@/components/Atelier";
import { DeuxGammes } from "@/components/DeuxGammes";
import { Hero } from "@/components/Hero";
import { Matiere } from "@/components/Matiere";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { api } from "@/lib/api";
import { localePath } from "@/lib/routes";

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

  const matiere = await api.matiereAccueil();
  const produits = await api.produits({ mis_en_avant: true });
  const classic = produits.ok
    ? produits.data.results.find((p) => p.gamme === "Classic")
    : undefined;
  const premium =
    classic && produits.ok
      ? produits.data.results.find(
          (p) => p.gamme === "Premium" && p.modele === classic.modele,
        )
      : undefined;

  return (
    <main id="contenu" tabIndex={-1}>
      <Hero
        contenu={contenu}
        ctaHref={`/${locale}${
          contenu.cta_chemin.startsWith("/") ? contenu.cta_chemin : ""
        }`}
      />
      {matiere.ok && matiere.data.gros_plans.length > 0 ? (
        <Matiere contenu={matiere.data} />
      ) : null}
      {classic && premium ? (
        <DeuxGammes
          classic={classic}
          premium={premium}
          locale={locale}
          title={home.gammes.title}
          intro={home.gammes.intro}
        />
      ) : null}
      <Atelier
        title={home.atelier.title}
        paragraphs={home.atelier.paragraphs}
        link={{
          href: localePath(locale, "atelier"),
          label: home.atelier.link,
        }}
      />
    </main>
  );
}
