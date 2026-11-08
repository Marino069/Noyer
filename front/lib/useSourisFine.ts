"use client";

import { useEffect, useState } from "react";

const FINE = "(pointer: fine)";
const REDUIT = "(prefers-reduced-motion: reduce)";

/** Vrai seulement avec une souris (pointer: fine) et hors prefers-reduced-motion. */
export function useSourisFine(): boolean {
  const [actif, setActif] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const fine = window.matchMedia(FINE);
    const reduit = window.matchMedia(REDUIT);
    const maj = () => setActif(fine.matches && !reduit.matches);
    maj();
    fine.addEventListener?.("change", maj);
    reduit.addEventListener?.("change", maj);
    return () => {
      fine.removeEventListener?.("change", maj);
      reduit.removeEventListener?.("change", maj);
    };
  }, []);

  return actif;
}
