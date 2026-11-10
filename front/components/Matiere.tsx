import type { MatiereAccueil } from "@/lib/api/types";
import { Surtitre } from "./atelier/Surtitre";
import { Loupe } from "./Loupe";
import { Section } from "./Section";
import styles from "./Matiere.module.css";

const SIZES = "(min-width: 900px) 33vw, 100vw";
const ROMAINS = ["I", "II", "III"];

type MatiereProps = {
  contenu: MatiereAccueil;
  /** Surtitre en petites capitales (« La matière »). */
  surtitre: string;
  /** Texte d'introduction, à droite du titre. */
  intro: string;
  /** Nom latin du noyer, en italique dans la légende du premier gros plan. */
  nomLatin: string;
};

/**
 * « Noyer & laiton » (maquette Maison de luxe) : trois gros plans de même taille,
 * numérotés I à III, légende en petites capitales. La loupe (E9-03) reste active.
 * Empilés sur mobile, trois colonnes dès 900 px.
 */
export function Matiere({ contenu, surtitre, intro, nomLatin }: MatiereProps) {
  const grosPlans = contenu.gros_plans.slice(0, 3);

  return (
    <Section tone="alt" aria-labelledby="matiere-titre">
      <div className={styles.entete}>
        <div>
          <Surtitre>{surtitre}</Surtitre>
          <h2 id="matiere-titre" className={styles.title}>
            {contenu.titre}
          </h2>
        </div>
        <p className={styles.intro}>{intro}</p>
      </div>
      <ol className={styles.grid}>
        {grosPlans.map((gros, i) => (
          <li key={gros.legende} className={styles.item}>
            <Figure
              gros={gros}
              numero={ROMAINS[i]}
              latin={i === 0 ? nomLatin : undefined}
            />
          </li>
        ))}
      </ol>
    </Section>
  );
}

type FigureProps = {
  gros: MatiereAccueil["gros_plans"][number];
  numero: string;
  latin?: string;
};

function Figure({ gros, numero, latin }: FigureProps) {
  const { legende, image } = gros;
  const sources = [...image.sources].sort((a, b) => a.largeur - b.largeur);
  return (
    // Focusable pour que le zoom du grain suive aussi le focus clavier.
    <figure className={styles.figure} tabIndex={0}>
      <div className={styles.media}>
        <Loupe
          source={sources.find((s) => s.largeur === 1600)?.url}
          className={styles.loupeZone}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset) */}
          <img
            className={styles.image}
            src={sources[0]?.url}
            srcSet={sources.map((s) => `${s.url} ${s.largeur}w`).join(", ")}
            sizes={SIZES}
            alt={image.alt}
            width={image.largeur_origine}
            height={image.hauteur_origine}
            loading="lazy"
            decoding="async"
          />
        </Loupe>
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.numero}>{numero}</span>
        <span aria-hidden="true"> · </span>
        <span className={styles.nom}>{legende}</span>
        {latin ? (
          <>
            {" — "}
            <em className={styles.latin}>{latin}</em>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
