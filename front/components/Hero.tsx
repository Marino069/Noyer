import { preload } from "react-dom";
import type { HeroAccueil } from "@/lib/api/types";
import { Button } from "./Button";
import { Section } from "./Section";
import styles from "./Hero.module.css";

const SIZES = "(min-width: 900px) 50vw, 100vw";

type HeroProps = {
  contenu: Pick<HeroAccueil, "titre" | "mot_italique" | "sous_titre"> & {
    cta_libelle: string;
    image: HeroAccueil["image"];
  };
  /** Lien du CTA, déjà préfixé par la langue. */
  ctaHref: string;
};

/** Titre avec, au plus, un fragment en italique (accent ponctuel, brief §03). */
function Titre({ titre, accent }: { titre: string; accent: string | null }) {
  const index = accent ? titre.indexOf(accent) : -1;
  if (!accent || index === -1) return <>{titre}</>;
  return (
    <>
      {titre.slice(0, index)}
      <em>{accent}</em>
      {titre.slice(index + accent.length)}
    </>
  );
}

/**
 * Hero de la homepage : accroche en Fraunces, CTA primaire, photo en contexte.
 * L'image est l'élément LCP : préchargée et chargée en priorité (srcset fourni par l'API).
 */
export function Hero({ contenu, ctaHref }: HeroProps) {
  const image = contenu.image;
  const sources = image
    ? [...image.sources].sort((a, b) => a.largeur - b.largeur)
    : [];
  const srcSet = sources.map((s) => `${s.url} ${s.largeur}w`).join(", ");

  if (image && sources.length > 0) {
    preload(sources[0].url, {
      as: "image",
      imageSrcSet: srcSet,
      imageSizes: SIZES,
      fetchPriority: "high",
    });
  }

  return (
    <Section className={styles.hero}>
      <div className={styles.layout}>
        <div className={styles.text}>
          <h1 className={styles.title}>
            <Titre titre={contenu.titre} accent={contenu.mot_italique} />
          </h1>
          <p className={styles.subtitle}>{contenu.sous_titre}</p>
          <Button href={ctaHref}>{contenu.cta_libelle}</Button>
        </div>
        {image && sources.length > 0 ? (
          <div className={styles.media}>
            {/* eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset), image LCP */}
            <img
              className={styles.image}
              src={sources[0].url}
              srcSet={srcSet}
              sizes={SIZES}
              alt={image.alt}
              width={image.largeur_origine}
              height={image.hauteur_origine}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
}
