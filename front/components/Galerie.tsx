"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Image } from "@/lib/api/types";
import { interpolate } from "@/lib/format";
import styles from "./Galerie.module.css";

export type GalerieTextes = {
  label: string;
  thumbnails: string;
  /** Contient `{index}` et `{total}`. */
  thumbnail: string;
  open: string;
  dialog: string;
  close: string;
  previous: string;
  next: string;
  /** Contient `{index}` et `{total}`. */
  position: string;
  empty: string;
};

type Props = {
  medias: Image[];
  textes: GalerieTextes;
  className?: string;
};

const SWIPE_MIN_PX = 40;

function Photo({
  image,
  sizes,
  eager,
  className,
}: {
  image: Image;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  const sources = [...image.sources].sort((a, b) => a.largeur - b.largeur);
  if (sources.length === 0) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset)
    <img
      className={className}
      src={sources[0].url}
      srcSet={sources.map((s) => `${s.url} ${s.largeur}w`).join(", ")}
      sizes={sizes}
      alt={image.alt}
      width={image.largeur_origine}
      height={image.hauteur_origine}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
    />
  );
}

/**
 * Galerie de la fiche produit : image principale + vignettes, agrandissement plein écran
 * (`<dialog>` modal : focus piégé, Échap pour fermer), flèches du clavier et swipe tactile.
 * Chaque photo garde son `alt` fourni par l'API.
 */
export function Galerie({ medias, textes, className }: Props) {
  const [index, setIndex] = useState(0);
  const [plein, setPlein] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const total = medias.length;

  const aller = useCallback(
    (delta: number) => setIndex((i) => (i + delta + total) % total),
    [total],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (plein && !dialog.open) dialog.showModal();
    if (!plein && dialog.open) dialog.close();
  }, [plein]);

  if (total === 0) {
    return (
      <div className={[styles.empty, className].filter(Boolean).join(" ")}>
        <p>{textes.empty}</p>
      </div>
    );
  }

  const courante = medias[index];
  const position = interpolate(textes.position, { index: index + 1, total });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (total < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      aller(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      aller(-1);
    }
  };

  const swipe = {
    onPointerDown: (e: React.PointerEvent) => {
      startX.current = e.clientX;
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (startX.current === null || total < 2) return;
      const dx = e.clientX - startX.current;
      startX.current = null;
      if (Math.abs(dx) >= SWIPE_MIN_PX) aller(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      startX.current = null;
    },
  };

  const fermer = () => {
    setPlein(false);
    openerRef.current?.focus();
  };

  return (
    <div
      className={[styles.galerie, className].filter(Boolean).join(" ")}
      role="group"
      aria-roledescription="carrousel"
      aria-label={textes.label}
      onKeyDown={onKeyDown}
    >
      <div className={styles.stage} {...swipe}>
        <button
          ref={openerRef}
          type="button"
          className={styles.open}
          aria-label={`${textes.open} — ${courante.alt}`}
          onClick={() => setPlein(true)}
        >
          <Photo
            image={courante}
            eager
            sizes="(min-width: 900px) 50vw, 100vw"
            className={styles.photo}
          />
        </button>
        {total > 1 ? (
          <>
            <button
              type="button"
              className={`${styles.nav} ${styles.prev}`}
              aria-label={textes.previous}
              onClick={() => aller(-1)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              aria-label={textes.next}
              onClick={() => aller(1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        ) : null}
      </div>
      <p role="status" className={styles.position}>
        {position}
      </p>

      {total > 1 ? (
        <ul className={styles.thumbs} aria-label={textes.thumbnails}>
          {medias.map((m, i) => (
            <li key={`${i}-${m.sources[0]?.url}`}>
              <button
                type="button"
                className={styles.thumb}
                aria-current={i === index ? "true" : undefined}
                aria-label={`${interpolate(textes.thumbnail, {
                  index: i + 1,
                  total,
                })} — ${m.alt}`}
                onClick={() => setIndex(i)}
              >
                <Photo image={m} sizes="96px" className={styles.thumbImg} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={textes.dialog}
        onClose={() => setPlein(false)}
        onKeyDown={onKeyDown}
      >
        {plein ? (
          <div className={styles.full} {...swipe}>
            <Photo
              image={courante}
              eager
              sizes="100vw"
              className={styles.fullPhoto}
            />
            <p role="status" className={styles.fullPosition}>
              {position}
            </p>
            <button
              type="button"
              className={`${styles.nav} ${styles.close}`}
              onClick={fermer}
              autoFocus
            >
              {textes.close}
            </button>
            {total > 1 ? (
              <>
                <button
                  type="button"
                  className={`${styles.nav} ${styles.prev}`}
                  aria-label={textes.previous}
                  onClick={() => aller(-1)}
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  type="button"
                  className={`${styles.nav} ${styles.next}`}
                  aria-label={textes.next}
                  onClick={() => aller(1)}
                >
                  <span aria-hidden="true">›</span>
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
