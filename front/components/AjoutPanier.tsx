"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type Gamme } from "@/lib/api";
import { publishCart } from "@/lib/cart";
import { Button } from "./Button";
import styles from "./AjoutPanier.module.css";

export type AjoutPanierTextes = {
  add: string;
  adding: string;
  added: string;
  numero: string;
  numeroAuto: string;
  viewCart: string;
  errorGeneric: string;
  errorUnavailable: string;
};

type Props = {
  slug: string;
  gamme: Gamme;
  /** Numéros de pièce encore libres (Premium) ; vide ou absent pour le Classic. */
  numeros?: number[];
  disabled?: boolean;
  panierHref: string;
  textes: AjoutPanierTextes;
  /** Appelé quand l'API refuse une pièce déjà réservée (pour rafraîchir la disponibilité). */
  onUnavailable?: () => void;
};

/**
 * CTA « Ajouter au panier » : Classic = quantité 1, Premium = numéro choisi dans la liste
 * des numéros libres, ou attribué automatiquement par le back (choix par défaut).
 */
export function AjoutPanier({
  slug,
  gamme,
  numeros = [],
  disabled = false,
  panierHref,
  textes,
  onUnavailable,
}: Props) {
  const premium = gamme === "Premium";
  const [choix, setChoix] = useState<number | null>(null); // null = automatique
  const [etat, setEtat] = useState<"repos" | "envoi" | "ajoute" | "erreur">(
    "repos",
  );
  const [message, setMessage] = useState("");

  // Un numéro choisi puis réservé par quelqu'un d'autre retombe sur l'attribution automatique.
  const numero = choix !== null && numeros.includes(choix) ? choix : null;
  const sansPiece = premium && numeros.length === 0;

  async function ajouter() {
    setEtat("envoi");
    setMessage("");
    const result = await api.ajouterLigne({
      produit_slug: slug,
      quantite: 1,
      ...(premium && numero !== null ? { numero } : {}),
    });
    if (result.ok) {
      publishCart(result.data);
      setEtat("ajoute");
      setMessage(textes.added);
    } else {
      if (result.error.code === "piece_indisponible") onUnavailable?.();
      setEtat("erreur");
      setMessage(
        result.error.code === "piece_indisponible"
          ? textes.errorUnavailable
          : textes.errorGeneric,
      );
    }
  }

  return (
    <div className={styles.bloc}>
      {premium && numeros.length > 0 ? (
        <div className={styles.field}>
          <label htmlFor={`numero-${slug}`} className={styles.label}>
            {textes.numero}
          </label>
          <select
            id={`numero-${slug}`}
            className={styles.select}
            value={numero ?? ""}
            onChange={(e) =>
              setChoix(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">{textes.numeroAuto}</option>
            {numeros.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <Button
        onClick={ajouter}
        loading={etat === "envoi"}
        disabled={disabled || sansPiece}
      >
        {etat === "envoi" ? textes.adding : textes.add}
      </Button>
      <div role="status" className={styles.message} data-state={etat}>
        {message}
        {etat === "ajoute" ? (
          <>
            {" "}
            <Link href={panierHref}>{textes.viewCart}</Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
