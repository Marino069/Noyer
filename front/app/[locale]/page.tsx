import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Atelier } from "@/components/Atelier";
import { DeuxGammes } from "@/components/DeuxGammes";
import { Frise } from "@/components/Frise";
import { Hero } from "@/components/Hero";
import { Manifeste } from "@/components/Manifeste";
import { Matiere } from "@/components/Matiere";
import { Selection } from "@/components/Selection";
import { Serie } from "@/components/Serie";
import { getProductPath } from "@/i18n/slugs";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { api, type Disponibilite } from "@/lib/api";
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
  const { home, interrupteur } = await getDictionary(locale);

  // Contenu éditable ; si l'API est indisponible, repli sur le texte du dictionnaire.
  const result = await api.heroAccueil();
  const contenu = result.ok
    ? result.data
    : {
        titre: home.title,
        mot_italique: null,
        sous_titre: home.tagline,
        cta_libelle: home.hero.cta,
        cta_chemin: "/produits/premium",
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

  // Détails (pied, finition, dimensions) et disponibilités : tout vient de l'API.
  const slugsDispo = new Set<string>();
  if (produits.ok) {
    for (const p of produits.data.results) slugsDispo.add(p.slug);
  }
  if (classic && premium) {
    slugsDispo.add(classic.slug);
    slugsDispo.add(premium.slug);
  }
  const [detailClassic, detailPremium, dispoEntrees] = await Promise.all([
    classic ? api.produit(classic.slug) : null,
    premium ? api.produit(premium.slug) : null,
    Promise.all(
      [...slugsDispo].map(
        async (slug) => [slug, await api.disponibilite(slug)] as const,
      ),
    ),
  ]);
  const disponibilites: Record<string, Disponibilite | undefined> = {};
  for (const [slug, r] of dispoEntrees) {
    if (r?.ok) disponibilites[slug] = r.data;
  }

  // « À partir de » : prix TTC le plus bas de chaque gamme dans le catalogue (API).
  const catalogue = classic && premium ? await api.produits() : null;
  const aPartirDe = (gamme: "Classic" | "Premium") => {
    const prix = (catalogue?.ok ? catalogue.data.results : [])
      .filter((p) => p.gamme === gamme)
      .map((p) => p.prix_ttc_centimes);
    return prix.length > 0 ? Math.min(...prix) : undefined;
  };

  // Version allumée de la lampe (média « <slug>-allumee » de la fiche), si l'API la fournit.
  const imageAllumee = [detailPremium, detailClassic]
    .flatMap((d) => (d?.ok ? d.data.medias : []))
    .find((m) => m.sources.some((s) => s.url.includes("-allumee")));

  // Série Premium en cours : disponibilités de l'API.
  const dispoPremium = premium ? disponibilites[premium.slug] : undefined;
  const serie =
    dispoPremium?.gamme === "Premium" ? dispoPremium.series[0] : undefined;

  return (
    <main id="contenu" tabIndex={-1}>
      <Hero
        interrupteur={
          imageAllumee
            ? {
                allumee: imageAllumee,
                libelleAllumer: interrupteur.allumer,
                libelleEteindre: interrupteur.eteindre,
              }
            : undefined
        }
        contenu={contenu}
        ctaHref={`/${locale}${
          contenu.cta_chemin.startsWith("/") ? contenu.cta_chemin : ""
        }`}
        surtitre={home.hero.surtitre}
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
          classic={{ produit: classic, aPartirDe: aPartirDe("Classic") }}
          premium={{ produit: premium, aPartirDe: aPartirDe("Premium") }}
          locale={locale}
          textes={home.gammes}
        />
      ) : null}
      <Selection
        produits={produits}
        locale={locale}
        title={home.selection.title}
        empty={home.selection.empty}
        errorTitle={home.selection.errorTitle}
        errorMessage={home.selection.errorMessage}
        disponibilites={disponibilites}
        dispo={home.selection.dispo}
        tous={{
          libelle: home.selection.tousLien,
          href: localePath(locale, "classic"),
        }}
      />
      {premium && serie ? (
        <Serie
          serie={serie}
          href={getProductPath(premium.slug, locale)}
          textes={home.serie}
        />
      ) : null}
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
