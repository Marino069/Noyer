import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import { Hero } from "@/components/Hero";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Section } from "@/components/Section";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localePath } from "@/lib/routes";
import { heroAccueil } from "@/mocks/data";
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

      <Section>
        <h2>Logo</h2>
        <Logo href="#" label="Noyer" />
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
