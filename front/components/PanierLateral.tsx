"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { api, type LignePanier, type Panier } from "@/lib/api";
import { publishCart } from "@/lib/cart";
import { formatPrice, interpolate } from "@/lib/format";
import { vignetteDe } from "@/lib/image";
import { Button } from "./Button";
import styles from "./PanierLateral.module.css";

export type PanierLateralTextes = {
  title: string;
  close: string;
  empty: string;
  numero: string;
  quantity: string;
  decrease: string;
  increase: string;
  remove: string;
  removeLabel: string;
  subtotal: string;
  checkout: string;
  viewCart: string;
  updateError: string;
  stockError: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Panier renvoyé par l'ajout qui vient d'ouvrir le tiroir. */
  panier: Panier | null;
  locale: string;
  textes: PanierLateralTextes;
  panierHref: string;
  commandeHref: string;
  /** Élément qui reprend le focus à la fermeture (le bouton d'ajout). */
  retourFocus?: HTMLElement | null;
};

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Panier latéral : mêmes appels API que la page panier (le back calcule tous les montants).
 * Boîte de dialogue modale : focus piégé, Échap et clic à côté pour fermer, focus rendu au bouton.
 */
export function PanierLateral({
  open,
  onClose,
  panier: initial,
  locale,
  textes,
  panierHref,
  commandeHref,
  retourFocus,
}: Props) {
  const [panier, setPanier] = useState<Panier | null>(initial);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const boite = useRef<HTMLDivElement>(null);
  const fermer = useRef<HTMLButtonElement>(null);

  // Le panier de l'ajout fait foi dès qu'un nouvel ajout le remplace.
  const [initialVu, setInitialVu] = useState(initial);
  if (initialVu !== initial) {
    setInitialVu(initial);
    setPanier(initial);
    setMessage("");
  }

  // Focus dans le panneau à l'ouverture, rendu au bouton à la fermeture.
  useEffect(() => {
    if (!open) return;
    const retour =
      retourFocus ?? (document.activeElement as HTMLElement | null);
    fermer.current?.focus();
    return () => retour?.focus?.();
  }, [open, retourFocus]);

  // Le fond de page ne défile pas tant que le panier est ouvert.
  useEffect(() => {
    if (!open) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, [open]);

  const surTouche = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !boite.current) return;
      const cibles = Array.from(
        boite.current.querySelectorAll<HTMLElement>(FOCUSABLES),
      ).filter((el) => el.getAttribute("aria-disabled") !== "true");
      if (cibles.length === 0) return;
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      const actif = document.activeElement;
      const dehors = !boite.current.contains(actif);
      if (event.shiftKey && (actif === premier || dehors)) {
        event.preventDefault();
        dernier.focus();
      } else if (!event.shiftKey && (actif === dernier || dehors)) {
        event.preventDefault();
        premier.focus();
      }
    },
    [onClose],
  );

  // Échap fonctionne aussi si le focus a quitté le panneau.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !boite.current?.contains(event.target as Node)
      )
        onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function muter(
    id: string,
    action: () => ReturnType<typeof api.modifierLigne>,
  ) {
    setOccupe(id);
    setMessage("");
    const result = await action();
    if (result.ok) {
      publishCart(result.data);
      setPanier(result.data);
    } else {
      setMessage(
        result.error.code === "stock_insuffisant"
          ? textes.stockError
          : textes.updateError,
      );
    }
    setOccupe(null);
  }

  if (!open || typeof document === "undefined") return null;

  const rempli = panier !== null && panier.lignes.length > 0;

  return createPortal(
    <div
      className={styles.fond}
      data-testid="panier-lateral-fond"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={boite}
        className={styles.panneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panier-lateral-titre"
        onKeyDown={surTouche}
      >
        <header className={styles.entete}>
          <h2 id="panier-lateral-titre" className={styles.titre}>
            {textes.title}
          </h2>
          <button
            ref={fermer}
            type="button"
            className={styles.fermer}
            aria-label={textes.close}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div role="status" className={styles.message}>
          {message}
        </div>
        {rempli ? (
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
        ) : (
          <p className={styles.vide}>{textes.empty}</p>
        )}
        <footer className={styles.pied}>
          {rempli ? (
            <>
              <p className={styles.sousTotal}>
                <span>{textes.subtotal}</span>
                <strong>
                  {formatPrice(panier.sous_total_centimes, locale)}
                </strong>
              </p>
              <Button href={commandeHref}>{textes.checkout}</Button>
            </>
          ) : null}
          <Link href={panierHref} className={styles.lien}>
            {textes.viewCart}
          </Link>
        </footer>
      </div>
    </div>,
    document.body,
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
  textes: PanierLateralTextes;
  occupe: boolean;
  onQuantite: (quantite: number) => void;
  onRetirer: () => void;
}) {
  const { produit } = ligne;
  const nom = `${produit.modele} ${produit.gamme}`;
  const vignette = vignetteDe(produit.image_principale);
  return (
    <li className={styles.ligne} aria-busy={occupe || undefined}>
      {vignette ? (
        // eslint-disable-next-line @next/next/no-img-element -- sources fournies par l'API
        <img
          className={styles.vignette}
          src={vignette.src}
          alt={vignette.alt}
          width={64}
          height={64}
        />
      ) : (
        <span className={styles.vignette} aria-hidden="true" />
      )}
      <div className={styles.info}>
        <p className={styles.nom}>{nom}</p>
        {ligne.numero_piece !== null ? (
          <p className={styles.detail}>
            {interpolate(textes.numero, { numero: ligne.numero_piece })}
          </p>
        ) : null}
        {produit.gamme === "Classic" ? (
          <div
            className={styles.quantite}
            role="group"
            aria-label={interpolate(textes.quantity, { nom })}
          >
            <button
              type="button"
              className={styles.pas}
              disabled={occupe || ligne.quantite <= 1}
              aria-label={interpolate(textes.decrease, { nom })}
              onClick={() => onQuantite(ligne.quantite - 1)}
            >
              −
            </button>
            <output aria-live="polite">{ligne.quantite}</output>
            <button
              type="button"
              className={styles.pas}
              disabled={occupe}
              aria-label={interpolate(textes.increase, { nom })}
              onClick={() => onQuantite(ligne.quantite + 1)}
            >
              +
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className={styles.retirer}
          disabled={occupe}
          aria-label={interpolate(textes.removeLabel, { nom })}
          onClick={onRetirer}
        >
          {textes.remove}
        </button>
      </div>
      <p className={styles.prix}>
        {formatPrice(produit.prix_ttc_centimes * ligne.quantite, locale)}
      </p>
    </li>
  );
}
