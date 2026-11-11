import { preload } from "react-dom";
import type { HeroAccueil, Image, Media } from "@/lib/api/types";
import { Button } from "./Button";
import { HeroLampe } from "./HeroLampe";
import styles from "./Hero.module.css";

const SIZES = "100vw";

type HeroProps = {
  contenu: Pick<HeroAccueil, "titre" | "mot_italique"> & {
    cta_libelle: string;
    image: HeroAccueil["image"];
  };
  /** Lien du CTA, déjà préfixé par la langue. */
  ctaHref: string;
  /** Surtitre laiton au-dessus du titre (texte éditorial, hors API). */
  surtitre?: string;
  /**
   * Interrupteur : version allumée (affichée par défaut) et libellés.
   * Absent = pas d'interrupteur, seule l'image du contenu s'affiche.
   */
  interrupteur?: {
    allumee: Media;
    libelleAllumer: string;
    libelleEteindre: string;
  };
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

const trier = (image: Image | Media) =>
  [...(image.sources ?? [])].sort((a, b) => a.largeur - b.largeur);

/**
 * Hero de la homepage : lampe en plein écran (≈ 860 px), dégradé vers le fond,
 * surtitre laiton, titre Fraunces, filet laiton et bouton cerclé.
 * L'image affichée au chargement (allumée si l'interrupteur existe) est l'élément LCP :
 * préchargée et chargée en priorité (srcset fourni par l'API).
 */
export function Hero({ contenu, ctaHref, surtitre, interrupteur }: HeroProps) {
  const image = contenu.image;
  const sources = image ? trier(image) : [];
  const avecScene = Boolean(image && sources.length > 0);
  const lcp = interrupteur && avecScene ? interrupteur.allumee : image;
  const sourcesLcp = lcp ? trier(lcp) : [];

  if (avecScene && lcp && sourcesLcp.length > 0) {
    preload(sourcesLcp[0].url, {
      as: "image",
      imageSrcSet: sourcesLcp.map((s) => `${s.url} ${s.largeur}w`).join(", "),
      imageSizes: SIZES,
      fetchPriority: "high",
    });
  }

  return (
    <section className={styles.hero}>
      {image && avecScene ? (
        interrupteur && sourcesLcp.length > 0 ? (
          <HeroLampe jour={image} sizes={SIZES} {...interrupteur} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset), image LCP
          <img
            className={styles.image}
            data-parallaxe=""
            src={sources[0].url}
            srcSet={sources.map((s) => `${s.url} ${s.largeur}w`).join(", ")}
            sizes={SIZES}
            alt={image.alt}
            width={image.largeur_origine}
            height={image.hauteur_origine}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        )
      ) : null}
      <div className={styles.degrade} aria-hidden="true" />
      <div className={styles.contenu}>
        {surtitre ? <p className={styles.surtitre}>{surtitre}</p> : null}
        <h1 className={styles.title}>
          <Titre titre={contenu.titre} accent={contenu.mot_italique} />
        </h1>
        <div className={styles.filet} aria-hidden="true" />
        <Button href={ctaHref} variant="secondary" className={styles.cta}>
          {contenu.cta_libelle}
        </Button>
      </div>
    </section>
  );
}
