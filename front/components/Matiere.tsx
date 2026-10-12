import type { MatiereAccueil } from "@/lib/api/types";
import { Section } from "./Section";
import styles from "./Matiere.module.css";

const SIZES = "(min-width: 900px) 25vw, (min-width: 600px) 50vw, 80vw";

type MatiereProps = { contenu: MatiereAccueil };

/**
 * « La matière » (brief §05.3) : 4 gros plans bois / laiton.
 * 4 colonnes desktop, 2 tablette, défilement horizontal mobile. Images en lazy loading.
 */
export function Matiere({ contenu }: MatiereProps) {
  return (
    <Section tone="alt" aria-labelledby="matiere-titre">
      <h2 id="matiere-titre" className={styles.title}>
        {contenu.titre}
      </h2>
      <ul className={styles.grid}>
        {contenu.gros_plans.map(({ legende, image }) => {
          const sources = [...image.sources].sort(
            (a, b) => a.largeur - b.largeur,
          );
          return (
            <li key={legende} className={styles.item}>
              <figure className={styles.figure}>
                <div className={styles.media}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset) */}
                  <img
                    className={styles.image}
                    src={sources[0]?.url}
                    srcSet={sources
                      .map((s) => `${s.url} ${s.largeur}w`)
                      .join(", ")}
                    sizes={SIZES}
                    alt={image.alt}
                    width={image.largeur_origine}
                    height={image.hauteur_origine}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className={styles.caption}>{legende}</figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
