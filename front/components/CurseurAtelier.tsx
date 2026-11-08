"use client";

import { useEffect, useRef } from "react";
import { useSourisFine } from "@/lib/useSourisFine";
import styles from "./CurseurAtelier.module.css";

const CIBLES_LIEN = "a[href], button, summary, [role='button']";

/**
 * Curseur d'atelier : un anneau qui suit la souris, grossit sur les liens et affiche
 * « Voir » au-dessus des éléments marqués `data-curseur="voir"`. Il s'ajoute au curseur
 * système (qui reste visible et utilisable) et n'existe qu'avec `(pointer: fine)` hors
 * reduced-motion : rien n'est rendu sur écran tactile.
 */
export function CurseurAtelier({ libelleVoir }: { libelleVoir: string }) {
  const actif = useSourisFine();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actif) return;
    const onMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el || event.pointerType === "touch") return;
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      const cible = event.target instanceof Element ? event.target : null;
      el.dataset.etat = cible?.closest("[data-curseur='voir']")
        ? "voir"
        : cible?.closest(CIBLES_LIEN)
          ? "lien"
          : "repos";
    };
    const onLeave = () => {
      if (ref.current) ref.current.dataset.etat = "cache";
    };
    document.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [actif]);

  if (!actif) return null;
  return (
    <div
      ref={ref}
      className={styles.curseur}
      data-testid="curseur-atelier"
      data-etat="cache"
      aria-hidden="true"
    >
      <span className={styles.anneau}>
        <span className={styles.libelle}>{libelleVoir}</span>
      </span>
    </div>
  );
}
