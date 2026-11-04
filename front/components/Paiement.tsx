"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { interpolate } from "@/lib/format";
import { startMocks } from "@/lib/mocks";
import { Button } from "./Button";
import styles from "./Paiement.module.css";

export type PaiementTextes = {
  title: string;
  intro: string;
  methods: string;
  secure: string;
  pay: string;
  redirecting: string;
  missingTitle: string;
  missingMessage: string;
  backToCart: string;
  alreadyPaidTitle: string;
  alreadyPaidMessage: string;
  cancelledTitle: string;
  cancelledMessage: string;
  failedTitle: string;
  failedMessage: string;
  timeoutTitle: string;
  timeoutMessage: string;
  errorTitle: string;
  errorMessage: string;
  retry: string;
};

/** Issue du retour depuis Stripe (`?retour=`), posée par le back dans les URL de retour. */
export type RetourPaiement = "annule" | "echec" | null;

type Props = {
  textes: PaiementTextes;
  reference: string | null;
  retour: RetourPaiement;
  panierHref: string;
  /** Redirection vers le prestataire ; injectable pour les tests. */
  redirect?: (url: string) => void;
};

type Probleme = "annule" | "echec" | "timeout" | "erreur" | "payee";

/** Seules les pages de paiement Stripe (HTTPS) sont des destinations valides. */
export function urlStripeValide(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && /(^|\.)stripe\.com$/.test(hostname);
  } catch {
    return false;
  }
}

const allerVers = (url: string) => window.location.assign(url);

/**
 * Paiement : demande au back la session Stripe Checkout de la commande puis y redirige.
 * TWINT et carte sont gérés par la page hébergée de Stripe ; rien ne transite par ce front.
 * Un seul appel à la fois (double clic) et la même commande est reprise, jamais recréée.
 */
export function Paiement({
  textes,
  reference,
  retour,
  panierHref,
  redirect = allerVers,
}: Props) {
  const [enCours, setEnCours] = useState(false);
  const [probleme, setProbleme] = useState<Probleme | null>(retour);
  // Verrou synchrone : le state n'est pas encore à jour entre deux clics rapprochés.
  const verrou = useRef(false);

  useEffect(() => {
    // Retour arrière depuis Stripe (cache de navigation) : la page revient telle
    // qu'elle était quittée, bouton bloqué compris. On la rend de nouveau utilisable.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      verrou.current = false;
      setEnCours(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (!reference) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <div className={styles.body}>
          <h2>{textes.missingTitle}</h2>
          <p>{textes.missingMessage}</p>
          <Button href={panierHref}>{textes.backToCart}</Button>
        </div>
      </div>
    );
  }

  const commande = reference;

  async function payer() {
    if (verrou.current) return;
    verrou.current = true;
    setEnCours(true);
    setProbleme(null);
    await startMocks().catch(() => {
      // Les mocks ne sont qu'un confort de développement.
    });
    const result = await api.payer(commande, "stripe");
    if (
      result.ok &&
      result.data.methode === "stripe" &&
      urlStripeValide(result.data.url_paiement)
    ) {
      // Le verrou reste posé : on quitte la page.
      redirect(result.data.url_paiement);
      return;
    }
    verrou.current = false;
    setEnCours(false);
    if (!result.ok && result.error.code === "deja_payee") {
      setProbleme("payee");
    } else if (!result.ok && result.error.kind === "timeout") {
      setProbleme("timeout");
    } else {
      setProbleme("erreur");
    }
  }

  const messages: Record<Probleme, { titre: string; message: string }> = {
    annule: { titre: textes.cancelledTitle, message: textes.cancelledMessage },
    echec: { titre: textes.failedTitle, message: textes.failedMessage },
    timeout: { titre: textes.timeoutTitle, message: textes.timeoutMessage },
    erreur: { titre: textes.errorTitle, message: textes.errorMessage },
    payee: {
      titre: textes.alreadyPaidTitle,
      message: textes.alreadyPaidMessage,
    },
  };
  const courant = probleme ? messages[probleme] : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{textes.title}</h1>
      <div className={styles.body}>
        <div role="alert" className={styles.status}>
          {courant ? (
            <>
              <h2>{courant.titre}</h2>
              <p>{courant.message}</p>
            </>
          ) : null}
        </div>
        <p>{interpolate(textes.intro, { reference: commande })}</p>
        <p className={styles.muted}>{textes.methods}</p>
        <p className={styles.muted}>{textes.secure}</p>
        {probleme === "payee" ? (
          <Button href={panierHref}>{textes.backToCart}</Button>
        ) : (
          <Button type="button" onClick={payer} loading={enCours}>
            {probleme ? textes.retry : textes.pay}
          </Button>
        )}
        <p role="status" className={styles.muted}>
          {enCours ? textes.redirecting : ""}
        </p>
      </div>
    </div>
  );
}
