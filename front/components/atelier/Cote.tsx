"use client";

import { type CSSProperties, useEffect, useRef } from "react";
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

const DUREE = 800;
const NOMBRE = /\d+(?:[.,]\d+)?/;

/**
 * Cote façon plan de menuisier : trait + libellé italique.
 * Purement décorative : masquée aux lecteurs d'écran (l'information
 * doit figurer ailleurs, ex. dans la fiche ou la légende).
 * Le libellé final est dans le HTML dès le départ. À la première entrée à
 * l'écran (une seule fois), le trait se dessine (clip-path) et le nombre
 * compte jusqu'à sa valeur en ~800 ms. Avec prefers-reduced-motion, sans
 * IntersectionObserver ou sans JS : la cote reste affichée telle quelle.
 */
export function Cote({
  label,
  orientation = "horizontal",
  position,
  length = "6rem",
  className,
}: CoteProps) {
  const racine = useRef<HTMLSpanElement>(null);
  const trait = useRef<HTMLSpanElement>(null);
  const texte = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = racine.current;
    if (
      !el ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const libelle = texte.current;
    let frame = 0;
    const vertical = orientation === "vertical";
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect(); // une seule fois
      const t = trait.current;
      if (t && typeof t.animate === "function") {
        const debut = vertical
          ? "inset(-8px -8px 100% -8px)"
          : "inset(-8px 100% -8px -8px)";
        t.animate([{ clipPath: debut }, { clipPath: "inset(-8px)" }], {
          duration: DUREE,
          easing: "ease-out",
        });
      }
      const span = texte.current;
      const m = NOMBRE.exec(label);
      if (!span || !m) return;
      const cible = Number(m[0].replace(",", "."));
      const decimales = m[0].split(/[.,]/)[1]?.length ?? 0;
      const sep = m[0].includes(",") ? "," : ".";
      const debutMs = performance.now();
      const rendre = (v: number) =>
        label.replace(m[0], v.toFixed(decimales).replace(".", sep));
      const tick = (now: number) => {
        const p = Math.min((now - debutMs) / DUREE, 1);
        if (p >= 1) {
          span.textContent = label;
          return;
        }
        span.textContent = rendre(cible * (1 - (1 - p) ** 3));
        frame = requestAnimationFrame(tick);
      };
      span.textContent = rendre(0);
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      if (libelle) libelle.textContent = label;
    };
  }, [label, orientation]);

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
    <span ref={racine} aria-hidden="true" className={classes} style={style}>
      <span ref={trait} className={styles.trait} />
      <span ref={texte} className={styles.label}>
        {label}
      </span>
    </span>
  );
}
