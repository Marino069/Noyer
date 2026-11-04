"use client";

import { interpolate } from "@/lib/format";
import type { Dictionary } from "@/i18n/get-dictionary";
import { useDisponibilite } from "./DisponibiliteLive";
import styles from "./ProcessusFabrication.module.css";

/** Numéros encore libres de la série, rafraîchis avec la disponibilité. */
export function NumerosSerie({
  textes,
}: {
  textes: Dictionary["fiche"]["process"]["numbering"];
}) {
  const { disponibilite: d } = useDisponibilite();
  if (d?.gamme !== "Premium") return null;

  const numeros = d.series
    .flatMap((s) => s.numeros_disponibles)
    .sort((a, b) => a - b);
  const total = d.series.reduce((t, s) => t + s.taille_serie, 0);

  return (
    <div className={styles.numeros}>
      <h3 className={styles.subtitle}>{textes.available}</h3>
      {numeros.length > 0 ? (
        <ul className={styles.numerosListe} aria-label={textes.available}>
          {numeros.map((n) => (
            <li key={n} className={styles.numero}>
              {interpolate(textes.piece, { numero: n, total })}
            </li>
          ))}
        </ul>
      ) : (
        <p>{textes.complete}</p>
      )}
    </div>
  );
}
