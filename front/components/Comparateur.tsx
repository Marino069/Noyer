"use client";

import { useEffect, useRef, useState } from "react";
import type { Vignette } from "@/lib/image";
import styles from "./Comparateur.module.css";

export type ComparateurTextes = {
  /** Nom accessible du curseur. */
  label: string;
  classic: string;
  premium: string;
  /** Gabarit de `aria-valuetext`, avec `{valeur}` (ex. « {valeur} % Premium »). */
  valeur: string;
};

type Cote = { vignette: Vignette; prix: string };

type Props = {
  classic: Cote;
  premium: Cote;
  textes: ComparateurTextes;
  sizes?: string;
};

const DEPART = 50;
const PAS = 5;
const borne = (v: number) => Math.min(100, Math.max(0, v));
const clip = (p: number) => `inset(0 0 0 ${p}%)`;
const decale = (p: number) => `translateX(${p}%)`;

function Photo({ vignette, sizes }: { vignette: Vignette; sizes: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset)
    <img
      className={styles.image}
      src={vignette.src}
      srcSet={vignette.srcSet}
      sizes={sizes}
      alt={vignette.alt}
      width={vignette.width}
      height={vignette.height}
      loading="lazy"
      draggable={false}
    />
  );
}

/**
 * Comparateur Classic / Premium : une seule image cadrée pareil, la Classic à gauche,
 * la Premium à droite (clip-path), séparées par une poignée en laiton que l'on fait
 * glisser (souris, doigt) ou que l'on règle au clavier (flèches par pas de 5, Début, Fin).
 * Au premier affichage, un petit aller-retour invite à glisser (sauf reduced-motion).
 */
export function Comparateur({
  classic,
  premium,
  textes,
  sizes = "100vw",
}: Props) {
  const [position, setPosition] = useState(DEPART);
  const piste = useRef<HTMLDivElement>(null);
  const couche = useRef<HTMLDivElement>(null);
  const poignee = useRef<HTMLDivElement>(null);
  const invite = useRef<Animation[]>([]);
  const glisse = useRef(false);

  const arreteInvite = () => {
    invite.current.forEach((a) => a.cancel());
    invite.current = [];
  };

  // Invite : un petit aller-retour, une seule fois, quand le comparateur devient visible.
  useEffect(() => {
    const el = piste.current;
    if (
      !el ||
      typeof IntersectionObserver === "undefined" ||
      typeof couche.current?.animate !== "function" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const etapes = [DEPART, 62, 38, DEPART];
        const options = { duration: 1600, easing: "ease-in-out" };
        invite.current = [
          couche.current!.animate(
            etapes.map((p) => ({ clipPath: clip(p) })),
            options,
          ),
          poignee.current!.animate(
            etapes.map((p) => ({ transform: decale(p) })),
            options,
          ),
        ];
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      arreteInvite();
    };
  }, []);

  const regle = (valeur: number) => {
    arreteInvite();
    setPosition(borne(valeur));
  };

  const depuisPointeur = (clientX: number) => {
    const r = piste.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    regle(((clientX - r.left) / r.width) * 100);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cibles: Record<string, number> = {
      ArrowLeft: position - PAS,
      ArrowDown: position - PAS,
      ArrowRight: position + PAS,
      ArrowUp: position + PAS,
      Home: 0,
      End: 100,
    };
    if (!(e.key in cibles)) return;
    e.preventDefault();
    regle(cibles[e.key]);
  };

  return (
    <figure className={styles.comparateur}>
      <div
        ref={piste}
        className={styles.piste}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          glisse.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          depuisPointeur(e.clientX);
        }}
        onPointerMove={(e) => {
          if (glisse.current) depuisPointeur(e.clientX);
        }}
        onPointerUp={() => {
          glisse.current = false;
        }}
        onPointerCancel={() => {
          glisse.current = false;
        }}
      >
        <Photo vignette={classic.vignette} sizes={sizes} />
        <div
          ref={couche}
          className={styles.couche}
          style={{ clipPath: clip(position) }}
        >
          <Photo vignette={premium.vignette} sizes={sizes} />
        </div>
        <div
          ref={poignee}
          className={styles.poignee}
          style={{ transform: decale(position) }}
        >
          <div
            role="slider"
            tabIndex={0}
            className={styles.curseur}
            aria-label={textes.label}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={position}
            aria-valuetext={textes.valeur.replace("{valeur}", String(position))}
            onKeyDown={onKeyDown}
          >
            <span className={styles.bouton} aria-hidden="true" />
          </div>
        </div>
      </div>
      <figcaption className={styles.legende}>
        <p className={styles.cote}>
          <span className={styles.nom}>{textes.classic}</span>
          <span className={styles.prix}>{classic.prix}</span>
        </p>
        <p className={`${styles.cote} ${styles.droite}`}>
          <span className={styles.nom}>{textes.premium}</span>
          <span className={styles.prix}>{premium.prix}</span>
        </p>
      </figcaption>
    </figure>
  );
}
