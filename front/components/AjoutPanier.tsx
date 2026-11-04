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
};

/** CTA « Ajouter au panier » : Classic = quantité 1, Premium = choix du numéro de pièce. */
export function AjoutPanier({
  slug,
  gamme,
  numeros = [],
  disabled = false,
  panierHref,
  textes,
}: Props) {
  const premium = gamme === "Premium";
  const [numero, setNumero] = useState<number | undefined>(numeros[0]);
  const [etat, setEtat] = useState<"repos" | "envoi" | "ajoute" | "erreur">(
    "repos",
  );
  const [message, setMessage] = useState("");

  const sansPiece = premium && numero === undefined;

  async function ajouter() {
    setEtat("envoi");
    setMessage("");
    const result = await api.ajouterLigne({
      produit_slug: slug,
      quantite: 1,
      ...(premium ? { numero } : {}),
    });
    if (result.ok) {
      publishCart(result.data);
      setEtat("ajoute");
      setMessage(textes.added);
    } else {
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
            value={numero}
            onChange={(e) => setNumero(Number(e.target.value))}
          >
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
