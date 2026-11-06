"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Apparition douce des sections au défilement (`[data-reveal]`).
 * Sans JS, avec prefers-reduced-motion ou sans IntersectionObserver : tout reste visible.
 * Seuls opacity et transform sont animés (CLS = 0) ; une section déjà dans l'écran n'est jamais masquée.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    ).filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "shown");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const el of targets) {
      el.setAttribute("data-reveal", "pending");
      observer.observe(el);
    }
    return () => {
      observer.disconnect();
      // Rien ne doit rester masqué si l'observateur est arrêté.
      for (const el of targets) el.setAttribute("data-reveal", "shown");
    };
  }, [pathname]);

  return null;
}
