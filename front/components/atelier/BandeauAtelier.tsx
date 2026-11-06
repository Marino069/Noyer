import type { ReactNode } from "react";
import styles from "./BandeauAtelier.module.css";

type BandeauAtelierProps = {
  /** Infos du bandeau (adresse, coordonnées, livraison…), une par entrée. */
  items: ReactNode[];
  className?: string;
};

/** Bandeau d'atelier : bande fine en haut de page, filet 1 px en dessous. */
export function BandeauAtelier({ items, className }: BandeauAtelierProps) {
  return (
    <div className={[styles.bandeau, className].filter(Boolean).join(" ")}>
      <div className={styles.inner}>
        {items.map((item, index) => (
          <span key={index}>{item}</span>
        ))}
      </div>
    </div>
  );
}
