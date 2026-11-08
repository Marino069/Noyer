"use client";

import { useEffect } from "react";
import { useSourisFine } from "@/lib/useSourisFine";

const FORCE = 0.2;
const MAX_PX = 6;

function reinitialiser(el: HTMLElement | null) {
  el?.style.removeProperty("--aimant-x");
  el?.style.removeProperty("--aimant-y");
}

/**
 * Aimantation légère des boutons (`[data-aimant]`) : ils se décalent de quelques pixels
 * vers la souris. Seulement avec `(pointer: fine)` hors reduced-motion ; sinon rien n'est
 * écouté. Le décalage passe par des variables CSS lues dans `transform`.
 */
export function AimantBoutons() {
  const actif = useSourisFine();

  useEffect(() => {
    if (!actif) return;
    let courant: HTMLElement | null = null;
    const borne = (v: number) => Math.max(-MAX_PX, Math.min(MAX_PX, v * FORCE));
    const onMove = (event: PointerEvent) => {
      const cible = event.target instanceof Element ? event.target : null;
      const el = cible?.closest<HTMLElement>("[data-aimant]") ?? null;
      if (el !== courant) {
        reinitialiser(courant);
        courant = el;
      }
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = event.clientX - (r.left + r.width / 2);
      const dy = event.clientY - (r.top + r.height / 2);
      el.style.setProperty("--aimant-x", `${borne(dx)}px`);
      el.style.setProperty("--aimant-y", `${borne(dy)}px`);
    };
    document.addEventListener("pointermove", onMove);
    return () => {
      document.removeEventListener("pointermove", onMove);
      reinitialiser(courant);
    };
  }, [actif]);

  return null;
}
