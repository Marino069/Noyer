"use client";

import { useCallback, useState } from "react";
import { api, type Gamme, type ImagePrincipale } from "@/lib/api";
import { publishCart } from "@/lib/cart";
import { formatDuree, interpolate } from "@/lib/format";
import { PlaqueGravee } from "./atelier/PlaqueGravee";
import { Button } from "./Button";
import { ToastAjout } from "./ToastAjout";
import styles from "./AjoutPanier.module.css";

export type AjoutPanierTextes = {
  add: string;
  adding: string;
  added: string;
  choose: string;
  numeroButton: string;
  numeroAuto: string;
  plateLabel: string;
  plateNote: string;
  reserve: string;
  reserveAuto: string;
  reminder: string;
  viewCart: string;
  dismiss: string;
  errorGeneric: string;
  errorUnavailable: string;
  reserved: string;
  suggest: string;
};

type Props = {
  slug: string;
  gamme: Gamme;
  /** Numéros de pièce encore libres (Premium) ; vide ou absent pour le Classic. */
  numeros?: number[];
  /** Taille totale de la série (Premium), affichée sur la plaque gravée. */
  total?: number;
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
  total = 0,
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
  const [vignette, setVignette] = useState<ImagePrincipale | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const fermerToast = useCallback(() => setToastVisible(false), []);
  // Numéro refusé (-1 = attribution automatique) : sert à proposer un autre numéro.
  const [conflit, setConflit] = useState<number | null>(null);

  // Un numéro choisi puis réservé par quelqu'un d'autre retombe sur l'attribution automatique.
  const numero = choix !== null && numeros.includes(choix) ? choix : null;
  const sansPiece = premium && numeros.length === 0;

  // Autre numéro libre à proposer après un conflit.
  const suggestion =
    conflit !== null ? (numeros.find((n) => n !== conflit) ?? null) : null;

  async function ajouter(numeroVoulu: number | null = numero) {
    setEtat("envoi");
    setMessage("");
    setToastVisible(false);
    const result = await api.ajouterLigne({
      produit_slug: slug,
      quantite: 1,
      ...(premium && numeroVoulu !== null ? { numero: numeroVoulu } : {}),
    });
    if (result.ok) {
      publishCart(result.data);
      setConflit(null);
      setEtat("ajoute");
      setVignette(
        result.data.lignes.find((l) => l.produit.slug === slug)?.produit
          .image_principale ?? null,
      );
      setToastVisible(true);
      // La pièce qui vient d'être ajoutée est celle dont la réservation expire le plus tard
      // (les réservations plus anciennes de la même fiche sont déjà entamées).
      const ligne = result.data.lignes
        .filter(
          (l) =>
            l.produit.slug === slug &&
            l.reservation_expire_le &&
            (numeroVoulu === null || l.numero_piece === numeroVoulu),
        )
        .reduce<(typeof result.data.lignes)[number] | undefined>(
          (recente, l) =>
            !recente ||
            new Date(l.reservation_expire_le!).getTime() >
              new Date(recente.reservation_expire_le!).getTime()
              ? l
              : recente,
          undefined,
        );
      setMessage(
        ligne?.reservation_expire_le && ligne.numero_piece !== null
          ? interpolate(textes.reserved, {
              numero: ligne.numero_piece,
              duree: formatDuree(
                new Date(ligne.reservation_expire_le).getTime() - Date.now(),
              ),
            })
          : textes.added,
      );
    } else {
      if (result.error.code === "piece_indisponible") {
        setConflit(numeroVoulu ?? -1);
        onUnavailable?.();
      }
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
        <>
          <fieldset className={styles.choix}>
            <legend className={styles.label}>
              {interpolate(textes.choose, {
                libres: numeros.length,
                total: total || numeros.length,
              })}
            </legend>
            <div className={styles.numeros}>
              {numeros.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={styles.numero}
                  aria-pressed={n === numero}
                  onClick={() => setChoix(n === numero ? null : n)}
                >
                  {interpolate(textes.numeroButton, { numero: n })}
                </button>
              ))}
            </div>
            <p className={styles.aide}>{textes.numeroAuto}</p>
          </fieldset>
          <PlaqueGravee
            numero={numero}
            total={total || numeros.length}
            label={textes.plateLabel}
            note={textes.plateNote}
            className={styles.plaque}
          />
        </>
      ) : null}
      <Button
        onClick={() => ajouter()}
        loading={etat === "envoi"}
        disabled={disabled || sansPiece}
      >
        {etat === "envoi"
          ? textes.adding
          : premium
            ? numero !== null
              ? interpolate(textes.reserve, { numero })
              : textes.reserveAuto
            : textes.add}
      </Button>
      {premium && !sansPiece ? (
        <p className={styles.rappel}>{textes.reminder}</p>
      ) : null}
      <div role="status" className={styles.message} data-state={etat}>
        {etat === "ajoute" ? (
          toastVisible ? (
            <ToastAjout
              message={message}
              image={vignette}
              href={panierHref}
              viewCart={textes.viewCart}
              dismiss={textes.dismiss}
              onClose={fermerToast}
            />
          ) : null
        ) : (
          message
        )}
      </div>
      {etat === "erreur" && suggestion !== null ? (
        <Button variant="secondary" onClick={() => ajouter(suggestion)}>
          {interpolate(textes.suggest, { numero: suggestion })}
        </Button>
      ) : null}
    </div>
  );
}
