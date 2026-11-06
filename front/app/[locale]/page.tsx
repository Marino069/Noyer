import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Atelier } from "@/components/Atelier";
import { DeuxGammes } from "@/components/DeuxGammes";
import { Frise } from "@/components/Frise";
import { Hero } from "@/components/Hero";
import { Manifeste } from "@/components/Manifeste";
import { Matiere } from "@/components/Matiere";
import { Selection } from "@/components/Selection";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { api } from "@/lib/api";
import { localePath } from "@/lib/routes";

type Props = { params: Promise<{ locale: string }> };

// ISR : page rendue côté serveur, régénérée toutes les 5 minutes (SEO, catalogue à jour).
export const revalidate = 300;

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
        atelier={{
          surtitre: home.hero.surtitre,
          lien: {
            libelle: home.hero.lien,
            href: localePath(locale, "atelier"),
          },
          coteHauteur: home.hero.coteHauteur,
          coteDiametre: home.hero.coteDiametre,
          piece: home.hero.piece,
          filetsLabel: home.hero.filetsLabel,
          filets: home.hero.filets,
        }}
      />
      <Manifeste
        texte={home.manifeste.texte}
        accent={home.manifeste.accent}
        signature={home.manifeste.signature}
      />
      {matiere.ok && matiere.data.gros_plans.length > 0 ? (
        <Matiere contenu={matiere.data} {...home.matiere} />
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
      <Selection
        produits={produits}
        locale={locale}
        title={home.selection.title}
        empty={home.selection.empty}
        errorTitle={home.selection.errorTitle}
        errorMessage={home.selection.errorMessage}
      />
      <Frise textes={home.frise} />
      <Atelier
        href={localePath(locale, "atelier")}
        title={home.atelier.title}
        text={home.atelier.text}
        cta={home.atelier.cta}
      />
    </main>
  );
}
