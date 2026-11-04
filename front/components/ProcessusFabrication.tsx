import type { Dictionary } from "@/i18n/get-dictionary";
import { NumerosSerie } from "./NumerosSerie";
import { Section } from "./Section";
import styles from "./ProcessusFabrication.module.css";

/**
 * Fiche Premium (brief §05) : processus de fabrication et numérotation, en registre sombre.
 * À placer sous un `DisponibiliteLive` pour afficher les numéros libres de la série.
 */
export function ProcessusFabrication({
  textes,
}: {
  textes: Dictionary["fiche"]["process"];
}) {
  return (
    <Section
      tone="dark"
      aria-labelledby="processus-titre"
      className={styles.processus}
    >
      <h2 id="processus-titre" className={styles.title}>
        {textes.title}
      </h2>
      <p className={styles.intro}>{textes.intro}</p>
      <ol className={styles.etapes}>
        {textes.steps.map((etape) => (
          <li key={etape.title} className={styles.etape}>
            <h3 className={styles.subtitle}>{etape.title}</h3>
            <p>{etape.text}</p>
          </li>
        ))}
      </ol>
      <div className={styles.numerotation}>
        <h3 className={styles.subtitle}>{textes.numbering.title}</h3>
        <p>{textes.numbering.text}</p>
        <NumerosSerie textes={textes.numbering} />
      </div>
    </Section>
  );
}
