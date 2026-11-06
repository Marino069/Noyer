import { Section } from "./Section";
import styles from "./Manifeste.module.css";

type ManifesteProps = {
  texte: string;
  /** Fin de la citation, en italique. */
  accent: string;
  signature: string;
};

/** Citation « manifeste » du fondateur, sous le hero. */
export function Manifeste({ texte, accent, signature }: ManifesteProps) {
  return (
    <Section>
      <figure className={styles.manifeste}>
        <blockquote className={styles.citation}>
          {texte} <em>{accent}</em>
        </blockquote>
        <figcaption className={styles.signature}>— {signature}</figcaption>
      </figure>
    </Section>
  );
}
