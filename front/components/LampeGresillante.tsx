"use client";

import { useState, useSyncExternalStore } from "react";
import { Interrupteur } from "./Interrupteur";
import styles from "./LampeGresillante.module.css";

type Props = {
  messageGresille: string;
  messageAllumee: string;
  libelleAllumer: string;
  libelleEteindre: string;
};

/**
 * Lampe de la page 404 : elle grésille (sans clignotement rapide) jusqu'à ce qu'on
 * l'allume avec l'interrupteur. En reduced-motion, elle s'affiche directement allumée.
 */
export function LampeGresillante({
  messageGresille,
  messageAllumee,
  libelleAllumer,
  libelleEteindre,
}: Props) {
  const reduit = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [choix, setChoix] = useState<boolean>();
  const allumee = choix ?? reduit;

  return (
    <div className={styles.lampe}>
      <span
        className={styles.ampoule}
        data-allumee={allumee}
        aria-hidden="true"
      />
      <Interrupteur
        allumee={allumee}
        onBascule={() => setChoix(!allumee)}
        libelleAllumer={libelleAllumer}
        libelleEteindre={libelleEteindre}
      />
      <p role="status" className={styles.message}>
        {allumee ? messageAllumee : messageGresille}
      </p>
    </div>
  );
}
