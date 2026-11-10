import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AjoutPanier } from "@/components/AjoutPanier";
import { Atelier } from "@/components/Atelier";
import { BandeauAtelier } from "@/components/atelier/BandeauAtelier";
import { Cote } from "@/components/atelier/Cote";
import { Filet } from "@/components/atelier/Filet";
import { LegendeFigure } from "@/components/atelier/LegendeFigure";
import { PlaqueGravee } from "@/components/atelier/PlaqueGravee";
import { Surtitre } from "@/components/atelier/Surtitre";
import { Button } from "@/components/Button";
import { ConsentCookies } from "@/components/ConsentCookies";
import { Galerie } from "@/components/Galerie";
import { DeuxGammes } from "@/components/DeuxGammes";
import { Frise } from "@/components/Frise";
import { Hero } from "@/components/Hero";
import { Manifeste } from "@/components/Manifeste";
import { Serie } from "@/components/Serie";
import { Logo } from "@/components/Logo";
import { Matiere } from "@/components/Matiere";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Panier } from "@/components/Panier";
import { Section } from "@/components/Section";
import { Selection, SelectionSkeleton } from "@/components/Selection";
import { TexteRiche } from "@/components/TexteRiche";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { networkError, type ProduitResume } from "@/lib/api";
import { localePath } from "@/lib/routes";
import {
  detailDe,
  heroAccueil,
  matiereAccueil,
  pagesContenu,
  produits,
} from "@/mocks/data";
import { CartIndicatorDemo } from "./CartIndicatorDemo";
import { InterrupteurDemo } from "./InterrupteurDemo";
import styles from "./page.module.css";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

const tones = ["light", "alt", "dark"] as const;
const variants = ["primary", "secondary"] as const;

/** Variantes d'un bouton : variantes × états, sur un registre donné. */
function ButtonVariants({ tone }: { tone: "light" | "dark" }) {
  return (
    <div className={styles.grid}>
      {variants.map((variant) => (
        <div key={variant} className={styles.row}>
          <Button variant={variant} tone={tone}>
            {variant}
          </Button>
          <Button variant={variant} tone={tone} disabled>
            {variant} disabled
          </Button>
          <Button variant={variant} tone={tone} loading>
            {variant} loading
          </Button>
          <Button variant={variant} tone={tone} href="#">
            {variant} lien
          </Button>
        </div>
      ))}
    </div>
  );
}

/** Page de démonstration du design system : visible en local uniquement. */
export default async function DesignSystemPage({ params }: Props) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dictionary = await getDictionary(locale);
  const { selection: texts } = dictionary.home;
  const selection = {
    locale,
    title: texts.title,
    empty: texts.empty,
    errorTitle: texts.errorTitle,
    errorMessage: texts.errorMessage,
  };
  const page = (results: ProduitResume[]) => ({
    count: results.length,
    next: null,
    previous: null,
    results,
  });

  return (
    <main>
      <Section>
        <h1>Design system</h1>
        <p>Tous les composants existants, avec toutes leurs variantes.</p>
      </Section>

      <Section>
        <h2>Charte sombre</h2>
        <p className="eyebrow">Surtitre en petites capitales 11 px</p>
        <hr className="filet-laiton" />
        <h3>Titres Fraunces 300, texte Hanken Grotesk</h3>
        <p>Texte principal #F5F1E8 sur #29251F.</p>
        <p style={{ color: "var(--text-muted)" }}>
          Texte secondaire #DED3C2 sur #29251F.
        </p>
      </Section>

      <Section tone="alt">
        <h2>Section alternée</h2>
        <p>Texte principal #F5F1E8 sur #3A3028.</p>
        <p style={{ color: "var(--text-muted)" }}>
          Texte secondaire #DED3C2 sur #3A3028.
        </p>
      </Section>

      <Section>
        <h2>Button</h2>
        <h3>
          Principal (laiton, texte sombre) et secondaire (cerclé de laiton)
        </h3>
        <ButtonVariants tone="light" />
        <h3>tone=&quot;dark&quot; (identique : le sombre est la règle)</h3>
        <ButtonVariants tone="dark" />
      </Section>

      <Section tone="dark">
        <h2>Button dans une section sombre</h2>
        <p>Le bouton garde le registre sombre.</p>
        <ButtonVariants tone="light" />
      </Section>

      <h2 className={styles.heading}>Hero</h2>
      <Hero
        contenu={heroAccueil}
        ctaHref="#"
        surtitre={dictionary.home.hero.surtitre}
      />
      <h3 className={styles.heading}>sans image</h3>
      <Hero
        contenu={{
          titre: dictionary.home.title,
          mot_italique: null,
          cta_libelle: dictionary.home.hero.cta,
          image: null,
        }}
        ctaHref="#"
      />

      <h3 className={styles.heading}>
        avec interrupteur (lampe allumée par défaut)
      </h3>
      <Hero
        contenu={heroAccueil}
        ctaHref="#"
        surtitre={dictionary.home.hero.surtitre}
        interrupteur={{
          allumee: {
            alt: "",
            largeur_origine: 1600,
            hauteur_origine: 1200,
            sources: [480, 960, 1600].map((largeur) => ({
              largeur: largeur as 480 | 960 | 1600,
              url: `/mocks/lucerne-premium-allumee-${largeur}.webp`,
            })),
          },
          libelleAllumer: dictionary.interrupteur.allumer,
          libelleEteindre: dictionary.interrupteur.eteindre,
        }}
      />

      <h2 className={styles.heading}>Interrupteur</h2>
      <Section>
        <div className={styles.row}>
          <InterrupteurDemo
            libelleAllumer={dictionary.interrupteur.allumer}
            libelleEteindre={dictionary.interrupteur.eteindre}
          />
        </div>
      </Section>

      <h2 className={styles.heading}>Manifeste</h2>
      <Manifeste {...dictionary.home.manifeste} />

      <h2 className={styles.heading}>Matière</h2>
      <Matiere contenu={matiereAccueil} {...dictionary.home.matiere} />

      <h2 className={styles.heading}>La série</h2>
      <Serie
        serie={{
          id: 1,
          taille_serie: 50,
          pieces_restantes: 12,
          numeros_disponibles: [3, 8, 15, 16, 21, 22, 30, 34, 41, 44, 47, 50],
        }}
        href={`/${locale}/produits/premium`}
        textes={dictionary.home.serie}
      />

      <h2 className={styles.heading}>Frise du processus</h2>
      <Frise textes={dictionary.home.frise} />

      <h2 className={styles.heading}>Texte riche</h2>
      <TexteRiche blocs={pagesContenu.atelier.contenu.blocs} locale={locale} />

      <h2 className={styles.heading}>Comparaison des gammes</h2>
      <DeuxGammes
        classic={{ produit: produits[0], aPartirDe: 39000 }}
        premium={{ produit: produits[1] }}
        locale={locale}
        textes={dictionary.home.gammes}
      />

      <h2 className={styles.heading}>Sélection</h2>
      <h3 className={styles.heading}>chargée</h3>
      <Selection
        {...selection}
        produits={{ ok: true, data: page(produits) }}
        dispo={texts.dispo}
        disponibilites={{
          "lucerne-classic": { gamme: "Classic", quantite_disponible: 7 },
          "lucerne-premium": {
            gamme: "Premium",
            series: [
              {
                id: 1,
                taille_serie: 50,
                pieces_restantes: 12,
                numeros_disponibles: [3, 8, 15],
              },
            ],
          },
          "leman-classic": { gamme: "Classic", quantite_disponible: 0 },
        }}
      />
      <h3 className={styles.heading}>vide</h3>
      <Selection {...selection} produits={{ ok: true, data: page([]) }} />
      <h3 className={styles.heading}>erreur</h3>
      <Selection
        {...selection}
        produits={{ ok: false, error: networkError() }}
      />
      <h3 className={styles.heading}>chargement</h3>
      <SelectionSkeleton label={dictionary.home.selection.loading} />

      <h2 className={styles.heading}>Atelier</h2>
      <Atelier
        href={localePath(locale, "atelier")}
        title={dictionary.home.atelier.title}
        text={dictionary.home.atelier.text}
        cta={dictionary.home.atelier.cta}
      />

      <Section>
        <h2>Logo</h2>
        <Logo href="#" label="Noyer" />
      </Section>

      <Section>
        <h2>Galerie</h2>
        <p>Plusieurs photos (vignettes, plein écran, flèches, swipe).</p>
        <Galerie
          medias={detailDe(produits[0]).medias}
          textes={dictionary.fiche.gallery}
        />
        <h3>Une seule photo</h3>
        <Galerie
          medias={detailDe(produits[0]).medias.slice(0, 1)}
          textes={dictionary.fiche.gallery}
        />
        <h3>Sans photo</h3>
        <Galerie medias={[]} textes={dictionary.fiche.gallery} />
      </Section>

      <Section>
        <h2>AjoutPanier</h2>
        <p>Classic (quantité 1) puis Premium (choix du numéro de pièce).</p>
        <div className={styles.row}>
          <AjoutPanier
            slug="lucerne-classic"
            gamme="Classic"
            panierHref={localePath(locale, "panier")}
            textes={dictionary.fiche.cart}
          />
          <AjoutPanier
            slug="lucerne-premium"
            gamme="Premium"
            numeros={[3, 8, 15]}
            total={50}
            panierHref={localePath(locale, "panier")}
            textes={dictionary.fiche.cart}
          />
          <AjoutPanier
            slug="lucerne-classic"
            gamme="Classic"
            disabled
            panierHref={localePath(locale, "panier")}
            textes={dictionary.fiche.cart}
          />
        </div>
      </Section>

      <Section>
        <h2>CartIndicator</h2>
        <p>
          Affiché dans le header uniquement si NEXT_PUBLIC_SHOP_ENABLED=true.
        </p>
        <CartIndicatorDemo
          href={localePath(locale, "panier")}
          labels={dictionary.header.cart}
        />
      </Section>

      <Section>
        <h2>ConsentCookies</h2>
        <p>
          Bannière nLPD : « Refuser » et « Accepter » au même poids. Affichée
          sur le site seulement si NEXT_PUBLIC_TRACKER_SRC est défini.
        </p>
        <ConsentCookies dictionary={dictionary.consent} demo />
      </Section>

      <Section>
        <h2>Panier</h2>
        <p>
          Chargement, lignes Classic (quantité) et Premium, récapitulatif, état
          vide et erreur : l&apos;état affiché dépend du panier des mocks.
        </p>
        <Panier
          locale={locale}
          textes={dictionary.panier}
          catalogueHref={`/${locale}/produits`}
          commandeHref={`/${locale}/panier/commande`}
        />
      </Section>

      <Section tone="dark">
        <h2>NewsletterForm</h2>
        <p>Tous les états (erreurs, chargement, succès) via la soumission.</p>
        <NewsletterForm dictionary={dictionary.newsletter} />
      </Section>

      <Section>
        <h2>Éléments graphiques d&apos;atelier</h2>
        <h3>BandeauAtelier</h3>
        <BandeauAtelier
          items={[
            "ATELIER · RUE DES [ADRESSE], GENÈVE",
            "46°12′ N — 6°09′ E",
            "Livraison offerte en Suisse · Retrait à l'atelier",
          ]}
        />
        <h3>Surtitre</h3>
        <Surtitre>Carnet d&apos;atelier — N° 01</Surtitre>
        <Surtitre accent>Avec filet laiton</Surtitre>
        <h3>Filet</h3>
        <Filet />
        <br />
        <Filet accent />
        <h3>Cote (horizontale, verticale, sur une image)</h3>
        <div className={styles.row}>
          <Cote label="Ø 28 cm" />
          <Cote label="H 42 cm" orientation="vertical" length="6rem" />
        </div>
        <figure className={styles.figure}>
          <div className={styles.image} />
          <Cote
            label="H 42 cm"
            orientation="vertical"
            length="60%"
            position={{ top: "10%", right: "22%" }}
          />
          <Cote label="Ø 28 cm" position={{ top: "6%", left: "38%" }} />
          <LegendeFigure numero={1} titre="Le grain" surImage />
        </figure>
        <h3>LegendeFigure</h3>
        <figure>
          <LegendeFigure numero={2} />
        </figure>
        <figure>
          <LegendeFigure numero={3} titre="La patine" />
        </figure>
        <h3>PlaqueGravee</h3>
        <PlaqueGravee
          numero={7}
          total={50}
          label="Votre pièce"
          note="Numéro gravé sous le pied, certificat signé joint."
        />
        <br />
        <PlaqueGravee numero={12} total={50} />
      </Section>

      <h2 className={styles.heading}>Section</h2>
      {tones.map((tone) => (
        <Section key={tone} tone={tone}>
          <h3>{`<Section tone="${tone}">`}</h3>
          <p>Texte courant.</p>
          <p className={styles.muted}>Texte secondaire.</p>
          <div className={styles.row}>
            <Button>Primaire</Button>
            <Button variant="secondary">Secondaire</Button>
          </div>
        </Section>
      ))}
    </main>
  );
}
