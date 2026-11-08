"use client";

import { type ReactNode, useEffect, useRef } from "react";
import styles from "./Frise.module.css";

type Props = {
  /** Nombre d'étapes de la liste ordonnée enfant. */
  etapes: number;
  children: ReactNode;
};

/**
 * Piste de défilement de la frise. Dans les navigateurs qui savent lier une animation
 * au défilement (`animation-timeline`), tout se fait en CSS et ce composant ne fait rien.
 * Sinon, un IntersectionObserver pose `data-etat` (a-venir | atteint | actif) sur chaque
 * étape et `--avancee` (0 à 1) sur la piste. Avec prefers-reduced-motion ou sans JS,
 * l'état final reste affiché : aucune étape n'est masquée.
 */
export function FriseDefilement({ etapes, children }: Props) {
  const racine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = racine.current;
    if (
      !el ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (typeof CSS !== "undefined" &&
        typeof CSS.supports === "function" &&
        CSS.supports("animation-timeline: view()"))
    ) {
      return;
    }
    const items = Array.from(el.querySelectorAll<HTMLElement>("ol > li"));
    const large = window.matchMedia("(min-width: 800px)");
    let observer: IntersectionObserver | undefined;

    const demarrer = () => {
      observer?.disconnect();
      // Grand écran : jalons répartis sur la piste sticky ; mobile : chaque étape.
      const cibles = large.matches
        ? Array.from(el.querySelectorAll<HTMLElement>("[data-jalon]"))
        : items;
      const seuil = large.matches ? 0.5 : 0.8;
      const atteints = new Set<Element>();
      const appliquer = () => {
        let actif = -1;
        cibles.forEach((c, i) => {
          if (atteints.has(c)) actif = i;
        });
        items.forEach((item, i) => {
          item.dataset.etat =
            i === actif ? "actif" : i < actif ? "atteint" : "a-venir";
        });
        el.style.setProperty(
          "--avancee",
          String((actif + 1) / Math.max(items.length, 1)),
        );
      };
      el.dataset.mode = "io";
      observer = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.boundingClientRect.top <= window.innerHeight * seuil) {
            atteints.add(e.target);
          } else {
            atteints.delete(e.target);
          }
        }
        appliquer();
      });
      for (const c of cibles) observer.observe(c);
      appliquer();
    };

    demarrer();
    large.addEventListener("change", demarrer);
    return () => {
      large.removeEventListener("change", demarrer);
      observer?.disconnect();
      delete el.dataset.mode;
      el.style.removeProperty("--avancee");
      for (const item of items) delete item.dataset.etat;
    };
  }, []);

  return (
    <div ref={racine} className={styles.piste}>
      {children}
      {Array.from({ length: etapes }, (_, i) => (
        <span
          key={i}
          data-jalon=""
          aria-hidden="true"
          className={styles.jalon}
        />
      ))}
    </div>
  );
}
