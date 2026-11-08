import type { MatiereAccueil } from "@/lib/api/types";
import { Loupe } from "./Loupe";
import { Section } from "./Section";
import styles from "./Matiere.module.css";

const SIZES_GRANDE = "(min-width: 900px) 60vw, 100vw";
const SIZES_PETITE = "(min-width: 900px) 30vw, 100vw";

type MatiereProps = {
  contenu: MatiereAccueil;
  /** Texte d'introduction, à droite du titre. */
  intro: string;
  /** Nom latin du noyer, en italique dans la légende de la grande figure. */
  nomLatin: string;
  /** Titre court de la FIG. 01 (« Le grain »). */
  titreGrain: string;
};

/**
 * « La matière » (brief §05.3, maquette carnet d'atelier) : grille asymétrique,
 * une grande figure et deux petites, légendes numérotées. Au survol et au focus,
 * le grain zoome légèrement (désactivé avec prefers-reduced-motion).
 */
export function Matiere({
  contenu,
  intro,
  nomLatin,
  titreGrain,
}: MatiereProps) {
  const [grande, ...petites] = contenu.gros_plans.slice(0, 3);

  return (
    <Section tone="alt" aria-labelledby="matiere-titre">
      <div className={styles.entete}>
        <h2 id="matiere-titre" className={styles.title}>
          {contenu.titre}
        </h2>
        <p className={styles.intro}>{intro}</p>
      </div>
      <div className={styles.grid}>
        {grande ? (
          <Figure
            gros={grande}
            index={1}
            grande
            sizes={SIZES_GRANDE}
            latin={nomLatin}
            titreFigure={titreGrain}
          />
        ) : null}
        {petites.length > 0 ? (
          <div className={styles.petites}>
            {petites.map((gros, i) => (
              <Figure
                key={gros.legende}
                gros={gros}
                index={i + 2}
                sizes={SIZES_PETITE}
              />
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

type FigureProps = {
  gros: MatiereAccueil["gros_plans"][number];
  index: number;
  sizes: string;
  grande?: boolean;
  latin?: string;
  titreFigure?: string;
};

function Figure({
  gros,
  index,
  sizes,
  grande = false,
  latin,
  titreFigure,
}: FigureProps) {
  const { legende, image } = gros;
  const sources = [...image.sources].sort((a, b) => a.largeur - b.largeur);
  return (
    // Focusable pour que le zoom du grain suive aussi le focus clavier.
    <figure
      className={`${styles.figure} ${grande ? styles.grande : styles.petite}`}
      tabIndex={0}
    >
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
            sizes={sizes}
            alt={image.alt}
            width={image.largeur_origine}
            height={image.hauteur_origine}
            loading="lazy"
            decoding="async"
          />
        </Loupe>
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.nom}>
          {legende}
          {latin ? (
            <>
              {" "}
              <em className={styles.latin}>{latin}</em>
            </>
          ) : null}
        </span>
        <span className={styles.numero}>
          <span>FIG.</span> <span>{String(index).padStart(2, "0")}</span>
          {titreFigure ? <span> — {titreFigure}</span> : null}
        </span>
      </figcaption>
    </figure>
  );
}
