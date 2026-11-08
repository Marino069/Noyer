"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Révélation des grands titres (h1, h2 de `main`) à l'entrée dans l'écran : le titre monte
 * derrière un masque (clip-path + transform). Le titre reste un seul élément du DOM, le texte
 * n'est ni découpé ni dupliqué. Sans JS, avec prefers-reduced-motion ou sans IntersectionObserver,
 * rien n'est masqué. Un titre déjà dans l'écran n'est jamais masqué (pas de CLS, pas de LCP retardé).
 */
export function RevelationTitres() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const cibles = Array.from(
      document.querySelectorAll<HTMLElement>("main h1, main h2"),
    ).filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    if (cibles.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-titre", "montre");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const el of cibles) {
      el.setAttribute("data-titre", "attente");
      observer.observe(el);
    }
    return () => {
      observer.disconnect();
      for (const el of cibles) el.removeAttribute("data-titre");
    };
  }, [pathname]);

  return null;
}
