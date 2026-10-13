import Link from "next/link";
import { Section } from "./Section";
import styles from "./Atelier.module.css";

type AtelierProps = {
  title: string;
  paragraphs: string[];
  link: { href: string; label: string };
};

/**
 * « L'atelier » (brief §05.5) : storytelling de fabrication en registre sombre.
 * Laiton limité aux accents : filet au-dessus du titre, soulignement du lien au survol.
 */
export function Atelier({ title, paragraphs, link }: AtelierProps) {
  return (
    <Section tone="dark" aria-labelledby="atelier-titre">
      <div className={styles.content}>
        <span className={styles.rule} aria-hidden="true" />
        <h2 id="atelier-titre" className={styles.title}>
          {title}
        </h2>
        {paragraphs.map((text) => (
          <p key={text} className={styles.text}>
            {text}
          </p>
        ))}
        <Link href={link.href} className={styles.link}>
          {link.label}
        </Link>
      </div>
    </Section>
  );
}
