"use client";

import { useEffect, useRef, useState } from "react";
import { api, type LignePanier, type Panier as PanierData } from "@/lib/api";
import { publishCart } from "@/lib/cart";
import {
  formatDuree,
  formatPrice,
  formatVatRate,
  interpolate,
} from "@/lib/format";
import { startMocks } from "@/lib/mocks";
import { Button } from "./Button";
import { ErrorState } from "./ErrorState";
import styles from "./Panier.module.css";

export type PanierTextes = {
  title: string;
  loading: string;
  errorTitle: string;
  errorMessage: string;
  retry: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyCta: string;
  numero: string;
  quantity: string;
  decrease: string;
  increase: string;
  remove: string;
  removeLabel: string;
  expires: string;
  remaining: string;
  expired: string;
  updateError: string;
  stockError: string;
  summary: string;
  subtotalHt: string;
  vat: string;
  shipping: string;
  shippingFree: string;
  total: string;
  totalVat: string;
  checkout: string;
};

type Props = {
  locale: string;
  textes: PanierTextes;
  /** Lien vers le catalogue, proposé quand le panier est vide. */
  catalogueHref: string;
  /** Lien vers la commande (E5-02). */
  commandeHref: string;
};

type Etat =
  | { statut: "chargement" }
  | { statut: "erreur" }
  | { statut: "pret"; panier: PanierData };

/**
 * Page panier : le panier vit côté back (cookie HttpOnly), le composant le relit à
 * l'affichage puis applique la réponse de chaque mutation (le back renvoie le panier complet).
 */
export function Panier({ locale, textes, catalogueHref, commandeHref }: Props) {
  const [etat, setEtat] = useState<Etat>({ statut: "chargement" });
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Incrémenté par « Réessayer » pour relancer la lecture du panier.
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    startMocks()
      .catch(() => {
        // Les mocks ne sont qu'un confort de développement.
      })
      .then(() => api.panier({ signal: controller.signal }))
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok) {
          publishCart(result.data);
          setEtat({ statut: "pret", panier: result.data });
        } else {
          setEtat({ statut: "erreur" });
        }
      });
    return () => controller.abort();
  }, [tentative]);

  // Chaque seconde : les lignes dont la réservation est écoulée sont retirées et signalées.
  const panierCourant = etat.statut === "pret" ? etat.panier : null;
  const resynchro = useRef(false);
  useEffect(() => {
    if (!panierCourant) return;
    const verifier = () => {
      const maintenant = Date.now();
      const perimees = panierCourant.lignes.filter(
        (l) =>
          l.reservation_expire_le &&
          new Date(l.reservation_expire_le).getTime() <= maintenant,
      );
      if (perimees.length === 0) return;
      const ids = new Set(perimees.map((l) => l.id));
      setEtat({
        statut: "pret",
        panier: {
          ...panierCourant,
          lignes: panierCourant.lignes.filter((l) => !ids.has(l.id)),
        },
      });
      setMessage(
        perimees
          .map((l) =>
            interpolate(textes.expired, {
              numero: l.numero_piece ?? "",
              nom: `${l.produit.modele} ${l.produit.gamme}`,
            }),
          )
          .join(" "),
      );
      // Le back fait foi (totaux, autres lignes) : on relit le panier.
      if (!resynchro.current) {
        resynchro.current = true;
        void api.panier().then((result) => {
          resynchro.current = false;
          if (result.ok) {
            publishCart(result.data);
            setEtat({ statut: "pret", panier: result.data });
          }
        });
      }
    };
    verifier();
    const timer = setInterval(verifier, 1000);
    return () => clearInterval(timer);
  }, [panierCourant, textes.expired]);

  async function muter(
    id: string,
    action: () => ReturnType<typeof api.modifierLigne>,
  ) {
    setOccupe(id);
    setMessage("");
    const result = await action();
    if (result.ok) {
      publishCart(result.data);
      setEtat({ statut: "pret", panier: result.data });
    } else {
      setMessage(
        result.error.code === "stock_insuffisant"
          ? textes.stockError
          : textes.updateError,
      );
    }
    setOccupe(null);
  }

  if (etat.statut === "chargement") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <p role="status">{textes.loading}</p>
      </div>
    );
  }

  if (etat.statut === "erreur") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <ErrorState
          title={textes.errorTitle}
          message={textes.errorMessage}
          retryLabel={textes.retry}
          onRetry={() => {
            setEtat({ statut: "chargement" });
            setTentative((n) => n + 1);
          }}
        />
      </div>
    );
  }

  const { panier } = etat;

  if (panier.lignes.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{textes.title}</h1>
        <div role="status" className={styles.message}>
          {message}
        </div>
        <div className={styles.empty}>
          <h2>{textes.emptyTitle}</h2>
          <p>{textes.emptyMessage}</p>
          <Button href={catalogueHref}>{textes.emptyCta}</Button>
        </div>
      </div>
    );
  }

  const sousTotalHt = panier.sous_total_centimes - panier.tva_incluse_centimes;
  const taux = formatVatRate(panier.taux_tva, locale);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{textes.title}</h1>
      <div role="status" className={styles.message}>
        {message}
      </div>
      <div className={styles.layout}>
        <ul className={styles.lignes}>
          {panier.lignes.map((ligne) => (
            <Ligne
              key={ligne.id}
              ligne={ligne}
              locale={locale}
              textes={textes}
              occupe={occupe === ligne.id}
              onQuantite={(q) =>
                muter(ligne.id, () => api.modifierLigne(ligne.id, q))
              }
              onRetirer={() =>
                muter(ligne.id, () => api.supprimerLigne(ligne.id))
              }
            />
          ))}
        </ul>
        <section className={styles.summary} aria-labelledby="panier-recap">
          <h2 id="panier-recap">{textes.summary}</h2>
          <dl className={styles.totaux}>
            <div>
              <dt>{textes.subtotalHt}</dt>
              <dd>{formatPrice(sousTotalHt, locale)}</dd>
            </div>
            <div>
              <dt>{interpolate(textes.vat, { rate: taux })}</dt>
              <dd>{formatPrice(panier.tva_incluse_centimes, locale)}</dd>
            </div>
            <div>
              <dt>{textes.shipping}</dt>
              <dd>
                {panier.frais_livraison_centimes === 0
                  ? textes.shippingFree
                  : formatPrice(panier.frais_livraison_centimes, locale)}
              </dd>
            </div>
            <div className={styles.total}>
              <dt>{textes.total}</dt>
              <dd>{formatPrice(panier.total_centimes, locale)}</dd>
            </div>
          </dl>
          <p className={styles.vatNote}>
            {interpolate(textes.totalVat, { rate: taux })}
          </p>
          <Button href={commandeHref}>{textes.checkout}</Button>
        </section>
      </div>
    </div>
  );
}

function Ligne({
  ligne,
  locale,
  textes,
  occupe,
  onQuantite,
  onRetirer,
}: {
  ligne: LignePanier;
  locale: string;
  textes: PanierTextes;
  occupe: boolean;
  onQuantite: (quantite: number) => void;
  onRetirer: () => void;
}) {
  const { produit } = ligne;
  const classic = produit.gamme === "Classic";
  const nom = `${produit.modele} ${produit.gamme}`;
  return (
    <li className={styles.ligne} aria-busy={occupe || undefined}>
      <div className={styles.info}>
        <p className={styles.nom}>{nom}</p>
        {ligne.numero_piece !== null ? (
          <p className={styles.detail}>
            {interpolate(textes.numero, { numero: ligne.numero_piece })}
          </p>
        ) : null}
        {ligne.reservation_expire_le ? (
          <Decompte
            expireLe={ligne.reservation_expire_le}
            modele={textes.remaining}
            className={styles.detail}
          />
        ) : null}
        {ligne.reservation_expire_le ? (
          <p className={styles.detail}>
            {interpolate(textes.expires, {
              heure: new Intl.DateTimeFormat(`${locale}-CH`, {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(ligne.reservation_expire_le)),
            })}
          </p>
        ) : null}
      </div>
      {classic ? (
        <div
          className={styles.quantite}
          role="group"
          aria-label={interpolate(textes.quantity, { nom })}
        >
          <Button
            variant="secondary"
            disabled={occupe || ligne.quantite <= 1}
            aria-label={interpolate(textes.decrease, { nom })}
            onClick={() => onQuantite(ligne.quantite - 1)}
          >
            −
          </Button>
          <output aria-live="polite">{ligne.quantite}</output>
          <Button
            variant="secondary"
            disabled={occupe}
            aria-label={interpolate(textes.increase, { nom })}
            onClick={() => onQuantite(ligne.quantite + 1)}
          >
            +
          </Button>
        </div>
      ) : null}
      <p className={styles.prix}>
        {formatPrice(produit.prix_ttc_centimes * ligne.quantite, locale)}
      </p>
      <Button
        variant="secondary"
        disabled={occupe}
        aria-label={interpolate(textes.removeLabel, { nom })}
        onClick={onRetirer}
      >
        {textes.remove}
      </Button>
    </li>
  );
}

/** Durée restante de la réservation, mise à jour chaque seconde (non annoncée à chaque tick). */
function Decompte({
  expireLe,
  modele,
  className,
}: {
  expireLe: string;
  modele: string;
  className: string;
}) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const reste = new Date(expireLe).getTime() - maintenant;
  return (
    <p className={className} data-testid="decompte">
      {interpolate(modele, { duree: formatDuree(reste) })}
    </p>
  );
}
