import type { CSSProperties } from "react";
import styles from "./Cote.module.css";

type CoteProps = {
  /** Libellé de la cote, ex. « H 42 cm ». */
  label: string;
  orientation?: "horizontal" | "vertical";
  /** Positionnement absolu sur une image (parent en `position: relative`). */
  position?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  /** Longueur du trait (CSS), ex. « 40% » ou « 8rem ». */
  length?: string;
  className?: string;
};

/**
 * Cote façon plan de menuisier : trait + libellé italique.
 * Purement décorative : masquée aux lecteurs d'écran (l'information
 * doit figurer ailleurs, ex. dans la fiche ou la légende).
 */
export function Cote({
  label,
  orientation = "horizontal",
  position,
  length = "6rem",
  className,
}: CoteProps) {
  const style = { ...position, "--cote-length": length } as CSSProperties;
  const classes = [
    styles.cote,
    orientation === "vertical" ? styles.vertical : styles.horizontal,
    position ? styles.positioned : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span aria-hidden="true" className={classes} style={style}>
      <span className={styles.trait} />
      <span className={styles.label}>{label}</span>
    </span>
  );
}
