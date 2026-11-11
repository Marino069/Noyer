"use client";

import { useState } from "react";
import type { Image, Media } from "@/lib/api/types";
import { Interrupteur } from "./Interrupteur";
import styles from "./HeroLampe.module.css";

type Props = {
  /** Version jour de la lampe (image du contenu éditable), chargée à la demande. */
  jour: Image;
  /** Version allumée : état par défaut, image LCP (eager, priorité haute). */
  allumee: Media;
  sizes: string;
  libelleAllumer: string;
  libelleEteindre: string;
};

const srcSetDe = (image: Media) =>
  [...(image.sources ?? [])]
    .sort((a, b) => a.largeur - b.largeur)
    .map((s) => `${s.url} ${s.largeur}w`)
    .join(", ");

/**
 * Scène du hero : lampe allumée par défaut, interrupteur discret en bas à droite.
 * Éteindre bascule vers la version jour, qui n'est demandée qu'au survol, au focus
 * ou au premier clic (l'image allumée reste la seule image critique).
 */
export function HeroLampe({
  jour,
  allumee,
  sizes,
  libelleAllumer,
  libelleEteindre,
}: Props) {
  const [on, setOn] = useState(true);
  const [jourCharge, setJourCharge] = useState(false);

  const sourcesAllumee = [...(allumee.sources ?? [])].sort(
    (a, b) => a.largeur - b.largeur,
  );
  const sourcesJour = [...jour.sources].sort((a, b) => a.largeur - b.largeur);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset), image LCP */}
      <img
        className={styles.image}
        data-parallaxe=""
        data-visible={on}
        src={sourcesAllumee[0]?.url ?? allumee.url}
        srcSet={srcSetDe(allumee)}
        sizes={sizes}
        alt={on ? jour.alt : ""}
        aria-hidden={on ? undefined : true}
        width={allumee.largeur_origine}
        height={allumee.hauteur_origine}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      {jourCharge && sourcesJour.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset), chargées à la demande
        <img
          className={styles.image}
          data-parallaxe=""
          data-visible={!on}
          src={sourcesJour[0].url}
          srcSet={srcSetDe(jour)}
          sizes={sizes}
          alt={on ? "" : jour.alt}
          aria-hidden={on ? true : undefined}
          width={jour.largeur_origine}
          height={jour.hauteur_origine}
          decoding="async"
        />
      ) : null}
      <Interrupteur
        className={styles.interrupteur}
        allumee={on}
        onAnticipe={() => setJourCharge(true)}
        onBascule={() => {
          setJourCharge(true);
          setOn((v) => !v);
        }}
        libelleAllumer={libelleAllumer}
        libelleEteindre={libelleEteindre}
      />
    </>
  );
}
