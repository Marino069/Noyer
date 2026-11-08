"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Nom de transition partagé par la photo de la carte et la grande photo de la fiche. */
export const NOM_PHOTO_PRODUIT = "photo-produit";

const DELAI_MAX_MS = 3000;

type DocumentVT = Document & {
  startViewTransition?: (callback: () => Promise<void> | void) => {
    finished: Promise<unknown>;
  };
};

function transitionPossible(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (document as DocumentVT).startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Lien interne simple (clic gauche, même onglet) vers une autre page du site. */
function lienInterne(event: MouseEvent): HTMLAnchorElement | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }
  const cible = event.target instanceof Element ? event.target : null;
  const lien = cible?.closest("a[href]") as HTMLAnchorElement | null;
  if (!lien || (lien.target && lien.target !== "_self")) return null;
  if (lien.hasAttribute("download")) return null;
  const url = new URL(lien.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname) return null;
  return lien;
}

/**
 * Transitions entre pages (View Transitions) : la photo d'une carte produit s'agrandit
 * et devient la grande photo de la fiche ; fondu doux entre les autres pages.
 * Sans `document.startViewTransition` ou avec prefers-reduced-motion, la navigation
 * reste celle de Next, sans transition. Le bouton Retour du navigateur n'est pas
 * intercepté : il garde la navigation native (position de défilement restaurée).
 */
export function TransitionsPages() {
  const router = useRouter();
  const pathname = usePathname();
  const attente = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!transitionPossible()) return;
      const lien = lienInterne(event);
      if (!lien) return;
      const url = new URL(lien.href, window.location.href);

      const photo = lien
        .closest("article")
        ?.querySelector<HTMLElement>("img[data-vt-photo]");
      if (photo) photo.style.viewTransitionName = NOM_PHOTO_PRODUIT;

      event.preventDefault();
      const transition = (document as DocumentVT).startViewTransition!(
        () =>
          new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, DELAI_MAX_MS);
            attente.current = () => {
              window.clearTimeout(timer);
              resolve();
            };
            router.push(url.pathname + url.search + url.hash);
          }),
      );
      const nettoyer = () => {
        attente.current = null;
        document
          .querySelectorAll<HTMLElement>("img[data-vt-photo]")
          .forEach((img) => {
            img.style.viewTransitionName = "";
          });
      };
      transition.finished.then(nettoyer, nettoyer);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);

  // La nouvelle page est affichée : la grande photo prend le nom partagé, puis la transition démarre.
  useEffect(() => {
    const fin = attente.current;
    if (!fin) return;
    const grande = document.querySelector<HTMLElement>(
      "img[data-vt-photo]:not([style*='view-transition-name'])",
    );
    if (grande) grande.style.viewTransitionName = NOM_PHOTO_PRODUIT;
    fin();
  }, [pathname]);

  return null;
}
