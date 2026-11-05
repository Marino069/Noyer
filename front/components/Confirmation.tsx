"use client";

import { useEffect, useState } from "react";
import { api, type Commande } from "@/lib/api";
import { cleEmailCommande } from "@/lib/commande";
import { formatPrice, interpolate } from "@/lib/format";
import { startMocks } from "@/lib/mocks";
import { Button } from "./Button";
import styles from "./Confirmation.module.css";

export type ConfirmationTextes = {
  title: string;
  paidTitle: string;
  pendingTitle: string;
  paidIntro: string;
  pendingIntro: string;
  recap: string;
  quantity: string;
  pieceNumber: string;
  total: string;
  nextTitle: string;
  nextPaid: string;
  nextPending: string;
  cancelledTitle: string;
  cancelledMessage: string;
  loading: string;
  unavailableTitle: string;
  unavailableMessage: string;
  errorTitle: string;
  errorMessage: string;
  backToCatalogue: string;
};

type Props = {
  textes: ConfirmationTextes;
  locale: string;
  reference: string | null;
  catalogueHref: string;
};

type Etat =
  | { type: "chargement" }
  | { type: "indisponible" }
  | { type: "erreur" }
  | { type: "ok"; commande: Commande };

/** Confirmation : récapitulatif de la commande, numéro de pièce Premium et prochaine étape. */
export function Confirmation({
  textes,
  locale,
  reference,
  catalogueHref,
}: Props) {
  const [etat, setEtat] = useState<Etat>(
    reference ? { type: "chargement" } : { type: "indisponible" },
  );

  useEffect(() => {
    if (!reference) return;
    let email: string | null = null;
    try {
      email = sessionStorage.getItem(cleEmailCommande(reference));
    } catch {
      email = null;
    }
    const controller = new AbortController();
    (async () => {
      if (!email) {
        setEtat({ type: "indisponible" });
        return;
      }
      await startMocks().catch(() => {
        // Les mocks ne sont qu'un confort de développement.
      });
      const result = await api.commande(reference, email, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (result.ok) setEtat({ type: "ok", commande: result.data });
      else if (result.error.status === 404) setEtat({ type: "indisponible" });
      else setEtat({ type: "erreur" });
    })();
    return () => controller.abort();
  }, [reference]);

  if (etat.type === "chargement") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <p role="status" className={styles.muted}>
          {textes.loading}
        </p>
      </div>
    );
  }

  if (etat.type !== "ok") {
    const indisponible = etat.type === "indisponible";
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <div className={styles.body} role="alert">
          <h2>{indisponible ? textes.unavailableTitle : textes.errorTitle}</h2>
          <p>
            {indisponible ? textes.unavailableMessage : textes.errorMessage}
          </p>
          <Button href={catalogueHref}>{textes.backToCatalogue}</Button>
        </div>
      </div>
    );
  }

  const { commande } = etat;
  if (commande.statut === "Annulee") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.cancelledTitle}</h1>
        <div className={styles.body}>
          <p>{textes.cancelledMessage}</p>
          <Button href={catalogueHref}>{textes.backToCatalogue}</Button>
        </div>
      </div>
    );
  }

  const payee = commande.statut !== "EnAttente";
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        {payee ? textes.paidTitle : textes.pendingTitle}
      </h1>
      <div className={styles.body}>
        <p>
          {interpolate(payee ? textes.paidIntro : textes.pendingIntro, {
            reference: commande.reference,
          })}
        </p>
        <h2>{textes.recap}</h2>
        <ul className={styles.lignes}>
          {commande.lignes.map((ligne, i) => (
            <li key={i} className={styles.ligne}>
              <span>
                {ligne.nom_produit}
                <br />
                <span className={styles.muted}>
                  {ligne.numero_piece !== null
                    ? interpolate(textes.pieceNumber, {
                        numero: ligne.numero_piece,
                      })
                    : interpolate(textes.quantity, {
                        quantite: ligne.quantite,
                      })}
                </span>
              </span>
              <span>
                {formatPrice(
                  ligne.prix_unitaire_centimes * ligne.quantite,
                  locale,
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          <span>{textes.total}</span>
          <span>{formatPrice(commande.total_centimes, locale)}</span>
        </p>
        <h2>{textes.nextTitle}</h2>
        <p>{payee ? textes.nextPaid : textes.nextPending}</p>
        <Button href={catalogueHref}>{textes.backToCatalogue}</Button>
      </div>
    </div>
  );
}
