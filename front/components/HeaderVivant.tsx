"use client";

import { type ReactNode, useEffect, useRef } from "react";
import styles from "./Header.module.css";

/** Distance de défilement (px) avant que l'en-tête puisse se cacher. */
export const SEUIL_CACHE = 120;

/**
 * Enveloppe de l'en-tête : se cache en descendant (après 120 px) et réapparaît en
 * remontant. Reste visible si un élément de l'en-tête a le focus ou si le menu est
 * ouvert (aria-expanded="true"). Un trait laiton décoratif (aria-hidden) indique la
 * progression dans la page. Seuls `transform` est animé : pas de CLS (l'en-tête reste
 * sticky, sa place dans le flux ne change pas). Avec prefers-reduced-motion, l'en-tête
 * ne se cache jamais.
 */
export function HeaderVivant({ children }: { children: ReactNode }) {
  const header = useRef<HTMLElement>(null);
  const trait = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const reduit =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dernier = window.scrollY;
    let attente = false;

    const doitRester = () =>
      el.contains(document.activeElement) ||
      el.querySelector('[aria-expanded="true"]') !== null;

    const afficher = (visible: boolean) => {
      el.dataset.cache = visible ? "false" : "true";
    };

    const maj = () => {
      attente = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
      trait.current?.style.setProperty("--progression", String(p));

      if (reduit || doitRester() || y <= SEUIL_CACHE) {
        afficher(true);
      } else if (y > dernier) {
        afficher(false);
      } else if (y < dernier) {
        afficher(true);
      }
      dernier = y;
    };

    const surDefilement = () => {
      if (attente) return;
      attente = true;
      requestAnimationFrame(maj);
    };
    const surFocus = () => afficher(true);

    el.addEventListener("focusin", surFocus);
    el.addEventListener("click", surFocus);
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement, { passive: true });
    maj();
    return () => {
      el.removeEventListener("focusin", surFocus);
      el.removeEventListener("click", surFocus);
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
    };
  }, []);

  return (
    <header ref={header} className={styles.header} data-cache="false">
      <span ref={trait} aria-hidden="true" className={styles.progression} />
      {children}
    </header>
  );
}
