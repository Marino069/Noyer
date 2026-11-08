"use client";

import styles from "./Interrupteur.module.css";

type Props = {
  /** Lampe allumée ? (état de l'interrupteur) */
  allumee: boolean;
  onBascule: () => void;
  /** Survol ou focus : permet de précharger l'image allumée. */
  onAnticipe?: () => void;
  libelleAllumer: string;
  libelleEteindre: string;
  className?: string;
};

/**
 * Petit interrupteur en laiton (bouton bascule). Réutilisable : il ne porte que
 * l'état et le libellé ; l'effet visuel est géré par le parent (voir LampeAllumable).
 */
export function Interrupteur({
  allumee,
  onBascule,
  onAnticipe,
  libelleAllumer,
  libelleEteindre,
  className,
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={allumee}
      aria-label={allumee ? libelleEteindre : libelleAllumer}
      className={
        className ? `${styles.interrupteur} ${className}` : styles.interrupteur
      }
      onClick={onBascule}
      onPointerEnter={onAnticipe}
      onFocus={onAnticipe}
    >
      <span className={styles.rail} aria-hidden="true">
        <span className={styles.bouton} />
      </span>
    </button>
  );
}
