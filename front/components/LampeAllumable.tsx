"use client";

import { useEffect, useState } from "react";
import type { Image } from "@/lib/api/types";
import { Interrupteur } from "./Interrupteur";
import styles from "./LampeAllumable.module.css";

type Props = {
  /** Version allumée de la lampe (`<slug>-allumee`), chargée seulement à la demande. */
  allumee: Image;
  sizes: string;
  libelleAllumer: string;
  libelleEteindre: string;
};

/**
 * À placer dans un conteneur `position: relative` qui porte la photo : superpose,
 * en fondu, la version allumée et un halo chaud, réchauffe le fond de la page,
 * et affiche l'interrupteur. L'image allumée n'est demandée qu'au premier survol,
 * focus ou clic.
 */
export function LampeAllumable({
  allumee,
  sizes,
  libelleAllumer,
  libelleEteindre,
}: Props) {
  const [allumeeOn, setAllumeeOn] = useState(false);
  const [chargee, setChargee] = useState(false);

  // Fond de page légèrement réchauffé (voir globals.css), retiré au démontage.
  useEffect(() => {
    if (!allumeeOn) return;
    const racine = document.documentElement;
    racine.dataset.lampe = "allumee";
    return () => {
      delete racine.dataset.lampe;
    };
  }, [allumeeOn]);

  const sources = [...allumee.sources].sort((a, b) => a.largeur - b.largeur);

  return (
    <>
      {chargee && sources.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset), chargées à la demande
        <img
          className={styles.allumee}
          data-allumee={allumeeOn}
          src={sources[0].url}
          srcSet={sources.map((s) => `${s.url} ${s.largeur}w`).join(", ")}
          sizes={sizes}
          alt=""
          aria-hidden="true"
          width={allumee.largeur_origine}
          height={allumee.hauteur_origine}
          decoding="async"
        />
      ) : null}
      <span
        className={styles.halo}
        data-allumee={allumeeOn}
        aria-hidden="true"
      />
      <Interrupteur
        className={styles.interrupteur}
        allumee={allumeeOn}
        onAnticipe={() => setChargee(true)}
        onBascule={() => {
          setChargee(true);
          setAllumeeOn((v) => !v);
        }}
        libelleAllumer={libelleAllumer}
        libelleEteindre={libelleEteindre}
      />
    </>
  );
}
