import Link from "next/link";
import { preload } from "react-dom";
import type { HeroAccueil, Image } from "@/lib/api/types";
import { Button } from "./Button";
import { LampeAllumable } from "./LampeAllumable";
import { Section } from "./Section";
import { Cote } from "./atelier/Cote";
import { Surtitre } from "./atelier/Surtitre";
import styles from "./Hero.module.css";

const SIZES = "(min-width: 900px) 50vw, 100vw";

/** Habillage « carnet d'atelier » du hero (textes éditoriaux, hors API). */
export type HeroAtelier = {
  surtitre: string;
  lien: { libelle: string; href: string };
  coteHauteur: string;
  coteDiametre: string;
  piece: string;
  filetsLabel: string;
  filets: { label: string; valeur: string }[];
};

type HeroProps = {
  contenu: Pick<HeroAccueil, "titre" | "mot_italique" | "sous_titre"> & {
    cta_libelle: string;
    image: HeroAccueil["image"];
  };
  /** Lien du CTA, déjà préfixé par la langue. */
  ctaHref: string;
  atelier?: HeroAtelier;
  /** Interrupteur : version allumée et libellés (absent = pas d'interrupteur). */
  interrupteur?: {
    allumee: Image;
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

/**
 * Hero de la homepage : accroche en Fraunces, CTA + lien, photo en contexte
 * avec cotes et étiquette de pièce, bandeau de filets matière.
 * L'image est l'élément LCP : préchargée et chargée en priorité (srcset fourni par l'API).
 */
export function Hero({ contenu, ctaHref, atelier, interrupteur }: HeroProps) {
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
          {atelier ? <Surtitre>{atelier.surtitre}</Surtitre> : null}
          <h1 className={styles.title}>
            <Titre titre={contenu.titre} accent={contenu.mot_italique} />
          </h1>
          <p className={styles.subtitle}>{contenu.sous_titre}</p>
          <div className={styles.actions}>
            <Button href={ctaHref}>{contenu.cta_libelle}</Button>
            {atelier ? (
              <Link href={atelier.lien.href} className={styles.lien}>
                {atelier.lien.libelle}
              </Link>
            ) : null}
          </div>
        </div>
        {image && sources.length > 0 ? (
          <figure className={styles.figure}>
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
              {interrupteur ? (
                <LampeAllumable sizes={SIZES} {...interrupteur} />
              ) : null}
            </div>
            {atelier ? (
              <>
                <Cote
                  label={atelier.coteHauteur}
                  orientation="vertical"
                  position={{ top: "10%", right: "22%" }}
                  length="73%"
                  className={styles.coteHauteur}
                />
                <Cote
                  label={atelier.coteDiametre}
                  position={{ top: "4%", left: "38%" }}
                  length="22%"
                  className={styles.coteDiametre}
                />
                <figcaption className={styles.piece}>
                  {atelier.piece}
                </figcaption>
              </>
            ) : null}
          </figure>
        ) : null}
      </div>
      {atelier ? (
        <ul className={styles.filets} aria-label={atelier.filetsLabel}>
          {atelier.filets.map((f) => (
            <li key={f.label} className={styles.filet}>
              <span className={styles.filetLabel}>{f.label} —</span> {f.valeur}
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
