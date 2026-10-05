import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import { hasLocale } from "@/i18n/config";
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
