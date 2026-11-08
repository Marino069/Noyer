"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Loupe.module.css";

/** Grossissement de la loupe. */
export const GROSSISSEMENT = 2.5;
/** Durée de l'appui long (tactile) avant d'afficher la loupe, en ms. */
export const APPUI_LONG_MS = 400;
/** Déplacement toléré pendant l'appui long avant d'y renoncer (le doigt défile), en px. */
const TOLERANCE_PX = 10;

type Props = {
  /** URL de l'image 1600 px, chargée seulement à la première interaction. */
  source: string | undefined;
  /** L'image affichée (avec son alt descriptif) : la loupe ne la remplace jamais. */
  children: ReactNode;
  className?: string;
};

/**
 * Loupe d'atelier : un cercle cerclé de laiton qui suit la souris et grossit
 * ×2,5 l'image. Tactile : appui long pour l'afficher, glisser pour la déplacer.
 * Purement décorative (aria-hidden) : l'alt de l'image enfant reste la description.
 * Position pilotée en `transform` uniquement, sans re-rendu à chaque mouvement.
 */
export function Loupe({ source, children, className }: Props) {
  const zone = useRef<HTMLDivElement>(null);
  const lentille = useRef<HTMLDivElement>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const tactileActif = useRef(false);
  const [chargee, setChargee] = useState(false);
  const [visible, setVisible] = useState(false);

  function placer(clientX: number, clientY: number) {
    const el = zone.current;
    const len = lentille.current;
    if (!el || !len) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(clientY - r.top, 0), r.height);
    len.style.setProperty("--x", `${x}px`);
    len.style.setProperty("--y", `${y}px`);
    len.style.setProperty("--zw", `${r.width * GROSSISSEMENT}px`);
    len.style.setProperty("--zh", `${r.height * GROSSISSEMENT}px`);
    len.style.setProperty("--g", String(GROSSISSEMENT));
  }

  function annulerMinuteur() {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
  }

  function afficher(clientX: number, clientY: number) {
    setChargee(true);
    setVisible(true);
    placer(clientX, clientY);
  }

  useEffect(() => annulerMinuteur, []);

  // Pendant le glisser tactile, la page ne doit pas défiler. L'écouteur doit
  // être non passif pour pouvoir appeler preventDefault().
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const bloquer = (e: TouchEvent) => {
      if (tactileActif.current && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", bloquer, { passive: false });
    return () => el.removeEventListener("touchmove", bloquer);
  }, []);

  function fin() {
    annulerMinuteur();
    depart.current = null;
    tactileActif.current = false;
    setVisible(false);
  }

  function onPointerEnter(e: React.PointerEvent) {
    if (e.pointerType === "mouse") afficher(e.clientX, e.clientY);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" || !source) return;
    depart.current = { x: e.clientX, y: e.clientY };
    const { clientX, clientY } = e;
    annulerMinuteur();
    minuteur.current = setTimeout(() => {
      tactileActif.current = true;
      afficher(clientX, clientY);
    }, APPUI_LONG_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === "mouse") {
      if (source) afficher(e.clientX, e.clientY);
      return;
    }
    if (tactileActif.current) {
      placer(e.clientX, e.clientY);
      return;
    }
    const d = depart.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > TOLERANCE_PX) {
      // Le doigt défile : ce n'est pas un appui long.
      annulerMinuteur();
      depart.current = null;
    }
  }

  function onPointerLeave(e: React.PointerEvent) {
    if (e.pointerType === "mouse") fin();
  }

  return (
    <div
      ref={zone}
      className={className ? `${styles.zone} ${className}` : styles.zone}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={fin}
      onPointerCancel={fin}
      onContextMenu={(e) => {
        // L'appui long ne doit pas ouvrir le menu contextuel de l'image.
        if (tactileActif.current || minuteur.current) e.preventDefault();
      }}
    >
      {children}
      {source ? (
        <div
          ref={lentille}
          className={styles.loupe}
          data-visible={visible}
          aria-hidden="true"
        >
          {chargee ? (
            // eslint-disable-next-line @next/next/no-img-element -- gros plan 1600 px, chargé à la première interaction
            <img
              className={styles.grain}
              src={source}
              alt=""
              aria-hidden="true"
              decoding="async"
              draggable={false}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
