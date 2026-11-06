"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Image } from "@/lib/api";
import styles from "./ToastAjout.module.css";

/** Durée d'affichage avant fermeture automatique. */
export const TOAST_DUREE_MS = 6000;

type Props = {
  message: string;
  image: Image | null;
  href: string;
  viewCart: string;
  dismiss: string;
  onClose: () => void;
};

/**
 * Confirmation discrète en bas à droite. À rendre DANS une région `role="status"`
 * déjà présente (annonce par les lecteurs d'écran). Se ferme seule, avec Échap
 * ou via le bouton ; ne déplace jamais le focus ni la page.
 */
export function ToastAjout({
  message,
  image,
  href,
  viewCart,
  dismiss,
  onClose,
}: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, TOAST_DUREE_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const sources = image
    ? [...image.sources].sort((a, b) => a.largeur - b.largeur)
    : [];

  return (
    <div className={styles.toast} data-testid="toast-ajout">
      {image && sources.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element -- sources fournies par l'API
        <img
          className={styles.vignette}
          src={sources[0].url}
          alt={image.alt}
          width={56}
          height={56}
        />
      ) : null}
      <div className={styles.texte}>
        <p className={styles.message}>{message}</p>
        <Link href={href} className={styles.lien}>
          {viewCart}
        </Link>
      </div>
      <button
        type="button"
        className={styles.fermer}
        aria-label={dismiss}
        onClick={onClose}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
