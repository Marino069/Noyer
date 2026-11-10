"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { interpolate } from "@/lib/format";
import { CIBLE_PANIER, mouvementReduit } from "@/lib/vol";
import { refreshCart, useCartCount } from "@/lib/cart";
import { startMocks } from "@/lib/mocks";
import styles from "./CartIndicator.module.css";

type Labels = { empty: string; one: string; other: string };

/**
 * Icône panier du header avec le nombre d'articles, mis à jour en direct
 * (`publishCart` après chaque mutation, relecture au retour sur l'onglet).
 * Le libellé accessible porte le nombre (« Panier, 2 articles ») ; le badge visuel est masqué.
 */
export function CartIndicator({
  href,
  labels,
  texte,
}: {
  href: string;
  labels: Labels;
  /** Libellé visible « Panier » (desktop) : affiché en petites capitales avec « (n) ». */
  texte?: string;
}) {
  const count = useCartCount();

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      startMocks()
        .then(() => refreshCart(controller.signal))
        .catch(() => {});
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const n = count ?? 0;

  // Le compteur rebondit quand le nombre d'articles augmente (sauf mouvement réduit).
  const badge = useRef<HTMLSpanElement>(null);
  const precedent = useRef(n);
  useEffect(() => {
    if (
      n > precedent.current &&
      !mouvementReduit() &&
      typeof badge.current?.animate === "function"
    ) {
      badge.current.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.5)", offset: 0.4 },
          { transform: "scale(1)" },
        ],
        { duration: 400, easing: "ease-out" },
      );
    }
    precedent.current = n;
  }, [n]);

  const label =
    n === 0
      ? labels.empty
      : interpolate(n === 1 ? labels.one : labels.other, { count: n });

  return (
    <Link
      href={href}
      className={texte ? `${styles.link} ${styles.avecTexte}` : styles.link}
      {...{ [CIBLE_PANIER]: "" }}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3 4h2.5l2.2 10.5a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2" />
        <circle cx="9.5" cy="19" r="1" />
        <circle cx="17" cy="19" r="1" />
      </svg>
      <span className="visually-hidden" role="status">
        {label}
      </span>
      {n > 0 && (
        <span ref={badge} className={styles.count} aria-hidden="true">
          {n}
        </span>
      )}
      {texte ? (
        <span className={styles.texte} aria-hidden="true">
          {texte} ({n})
        </span>
      ) : null}
    </Link>
  );
}
