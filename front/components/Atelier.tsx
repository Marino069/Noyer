import Link from "next/link";
import { Section } from "./Section";
import styles from "./Atelier.module.css";

type AtelierProps = {
  href: string;
  title: string;
  text: string;
  cta: string;
};

/**
 * « L'atelier » (brief §05.5) : storytelling de fabrication en registre sombre.
 * Le laiton reste un accent : filet 1px, soulignement du lien au survol et au focus.
 */
export function Atelier({ href, title, text, cta }: AtelierProps) {
  return (
    <Section tone="dark" aria-labelledby="atelier-titre">
      <div className={styles.content}>
        <span className={styles.rule} aria-hidden="true" />
        <h2 id="atelier-titre" className={styles.title}>
          {title}
        </h2>
        <p className={styles.text}>{text}</p>
        <Link href={href} className={styles.link}>
          {cta}
        </Link>
      </div>
    </Section>
  );
}
