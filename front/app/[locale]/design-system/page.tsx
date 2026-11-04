import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AjoutPanier } from "@/components/AjoutPanier";
import { Atelier } from "@/components/Atelier";
import { Button } from "@/components/Button";
import { Galerie } from "@/components/Galerie";
import { Hero } from "@/components/Hero";
import { Logo } from "@/components/Logo";
import { Matiere } from "@/components/Matiere";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Section } from "@/components/Section";
import { Selection, SelectionSkeleton } from "@/components/Selection";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { networkError, type ProduitResume } from "@/lib/api";
import { localePath } from "@/lib/routes";
import { detailDe, heroAccueil, matiereAccueil, produits } from "@/mocks/data";
import { CartIndicatorDemo } from "./CartIndicatorDemo";
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
        <h2>Button</h2>
        <h3>tone=&quot;light&quot;</h3>
        <ButtonVariants tone="light" />
        <h3>tone=&quot;dark&quot; (forcé, sur fond clair)</h3>
        <ButtonVariants tone="dark" />
      </Section>

      <Section tone="dark">
        <h2>Button dans une section sombre</h2>
        <p>Le bouton prend automatiquement le registre sombre.</p>
        <ButtonVariants tone="light" />
      </Section>

      <h2 className={styles.heading}>Hero</h2>
      <Hero
        contenu={{ ...heroAccueil, mot_italique: "prend son temps" }}
        ctaHref="#"
      />
      <Hero
        contenu={{
          titre: dictionary.home.title,
          mot_italique: null,
          sous_titre: dictionary.home.tagline,
          cta_libelle: dictionary.home.hero.cta,
          image: null,
        }}
        ctaHref="#"
      />

      <h2 className={styles.heading}>Matière</h2>
      <Matiere contenu={matiereAccueil} />

      <h2 className={styles.heading}>Sélection</h2>
      <h3 className={styles.heading}>chargée</h3>
      <Selection {...selection} produits={{ ok: true, data: page(produits) }} />
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

      <Section tone="dark">
        <h2>NewsletterForm</h2>
        <p>Tous les états (erreurs, chargement, succès) via la soumission.</p>
        <NewsletterForm dictionary={dictionary.newsletter} />
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
