import { preload } from "react-dom";
import type { Image } from "@/lib/api/types";
import styles from "./GalerieEmpilee.module.css";

type Props = {
  medias: Image[];
  /** Cote affichée sur la grande vue (« H 42 cm »), absente si inconnue. */
  cote?: string;
  /** Message quand il n'y a aucune photo. */
  vide: string;
  label: string;
};

const SIZES_GRANDE = "(min-width: 900px) 60vw, 100vw";
const SIZES_CARREE = "(min-width: 900px) 30vw, 50vw";

function sourcesTriees(image: Image) {
  return [...image.sources].sort((a, b) => a.largeur - b.largeur);
}

function Photo({
  image,
  sizes,
  priority,
  className,
}: {
  image: Image;
  sizes: string;
  priority?: boolean;
  className: string;
}) {
  const sources = sourcesTriees(image);
  if (sources.length === 0) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset)
    <img
      className={className}
      src={sources[0].url}
      srcSet={sources.map((s) => `${s.url} ${s.largeur}w`).join(", ")}
      sizes={sizes}
      alt={image.alt}
      width={image.largeur_origine}
      height={image.hauteur_origine}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}

/**
 * Galerie empilée de la fiche (maquette « carnet d'atelier ») : grande vue avec
 * sa cote, deux vues carrées côte à côte, puis un gros plan matière.
 */
export function GalerieEmpilee({ medias, cote, vide, label }: Props) {
  if (medias.length === 0) {
    return (
      <div className={styles.vide}>
        <p>{vide}</p>
      </div>
    );
  }
  const [grande, ...suite] = medias;
  const carrees = suite.slice(0, 2);
  const matiere = suite[2];
  const sources = sourcesTriees(grande);
  if (sources.length > 0) {
    // Image LCP de la fiche : préchargée dès le rendu serveur.
    preload(sources[0].url, {
      as: "image",
      imageSrcSet: sources.map((s) => `${s.url} ${s.largeur}w`).join(", "),
      imageSizes: SIZES_GRANDE,
      fetchPriority: "high",
    });
  }

  return (
    <div className={styles.galerie} role="group" aria-label={label}>
      <figure className={styles.grande}>
        <Photo
          image={grande}
          sizes={SIZES_GRANDE}
          priority
          className={styles.photo}
        />
        {cote ? (
          <>
            <span className={styles.coteTrait} aria-hidden="true" />
            <span className={styles.cote} aria-hidden="true">
              {cote}
            </span>
          </>
        ) : null}
      </figure>
      {carrees.length > 0 ? (
        <div className={styles.carrees}>
          {carrees.map((m, i) => (
            <Photo
              key={`${i}-${m.sources[0]?.url}`}
              image={m}
              sizes={SIZES_CARREE}
              className={styles.carree}
            />
          ))}
        </div>
      ) : null}
      {matiere ? (
        <Photo
          image={matiere}
          sizes={SIZES_GRANDE}
          className={styles.matiere}
        />
      ) : null}
    </div>
  );
}
