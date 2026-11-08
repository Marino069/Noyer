"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { api, type Gamme, type Panier } from "@/lib/api";
import { publishCart } from "@/lib/cart";
import { formatDuree, interpolate } from "@/lib/format";
import { PlaqueGravee } from "./atelier/PlaqueGravee";
import { Button } from "./Button";
import { vignetteDe } from "@/lib/image";
import { voler } from "@/lib/vol";
import { PanierLateral, type PanierLateralTextes } from "./PanierLateral";
import styles from "./AjoutPanier.module.css";

export type AjoutPanierTextes = {
  add: string;
  adding: string;
  added: string;
  choose: string;
  numeroButton: string;
  numeroSold: string;
  numeroAuto: string;
  plateLabel: string;
  plateNote: string;
  reserve: string;
  reserveAuto: string;
  reminder: string;
  viewCart: string;
  errorGeneric: string;
  errorUnavailable: string;
  reserved: string;
  suggest: string;
  drawer: Omit<PanierLateralTextes, "viewCart">;
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
  /** Langue d'affichage des montants du panier latéral. */
  locale?: string;
  /** Page de commande ; par défaut `<panierHref>/commande`. */
  commandeHref?: string;
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
  locale = "fr",
  commandeHref,
  textes,
  onUnavailable,
}: Props) {
  const premium = gamme === "Premium";
  const [choix, setChoix] = useState<number | null>(null); // null = automatique
  const [etat, setEtat] = useState<"repos" | "envoi" | "ajoute" | "erreur">(
    "repos",
  );
  const [message, setMessage] = useState("");
  const [panier, setPanier] = useState<Panier | null>(null);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  const fermerTiroir = useCallback(() => setTiroirOuvert(false), []);
  const [declencheur, setDeclencheur] = useState<HTMLElement | null>(null);
  // Numéro refusé (-1 = attribution automatique) : sert à proposer un autre numéro.
  const [conflit, setConflit] = useState<number | null>(null);

  // Un numéro choisi puis réservé par quelqu'un d'autre retombe sur l'attribution automatique.
  const numero = choix !== null && numeros.includes(choix) ? choix : null;
  const sansPiece = premium && numeros.length === 0;

  // Autre numéro libre à proposer après un conflit.
  const suggestion =
    conflit !== null ? (numeros.find((n) => n !== conflit) ?? null) : null;

  // Grille de la série : une case par pièce, pleine = vendue, creuse = libre.
  const grille = useRef<HTMLDivElement>(null);
  const taille = Math.max(total, ...numeros);
  const pieces = Array.from({ length: taille }, (_, i) => i + 1);
  const libres = new Set(numeros);

  function naviguer(e: KeyboardEvent<HTMLDivElement>) {
    const pas = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1],
    }[e.key];
    const actuel = Number((e.target as HTMLElement).dataset.piece);
    if (!pas || !actuel) return;
    e.preventDefault();
    const gabarit = grille.current
      ? getComputedStyle(grille.current).gridTemplateColumns
      : "";
    const colonnes = gabarit.split(" ").filter(Boolean).length || 10;
    const delta = pas[0] !== 0 ? pas[0] : pas[1] * colonnes;
    // Prochaine pièce libre dans la direction demandée.
    for (let n = actuel + delta; n >= 1 && n <= taille; n += delta) {
      if (libres.has(n)) {
        grille.current
          ?.querySelector<HTMLElement>(`[data-piece="${n}"]`)
          ?.focus();
        return;
      }
    }
  }

  async function ajouter(numeroVoulu: number | null = numero) {
    setEtat("envoi");
    setMessage("");
    setTiroirOuvert(false);
    const bouton = document.activeElement;
    const depart = bouton instanceof HTMLElement ? bouton : declencheur;
    setDeclencheur(depart);
    const result = await api.ajouterLigne({
      produit_slug: slug,
      quantite: 1,
      ...(premium && numeroVoulu !== null ? { numero: numeroVoulu } : {}),
    });
    if (result.ok) {
      publishCart(result.data);
      setConflit(null);
      setEtat("ajoute");
      setPanier(result.data);
      const image = result.data.lignes.find((l) => l.produit.slug === slug)
        ?.produit.image_principale;
      // La vignette vole jusqu'à l'icône du panier, puis le panier latéral s'ouvre.
      const source = vignetteDe(image)?.src ?? null;
      void (depart ? voler(depart, source) : Promise.resolve()).then(() =>
        setTiroirOuvert(true),
      );
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
            <div ref={grille} className={styles.grille} onKeyDown={naviguer}>
              {pieces.map((n) =>
                libres.has(n) ? (
                  <button
                    key={n}
                    type="button"
                    className={styles.numero}
                    data-piece={n}
                    aria-pressed={n === numero}
                    onClick={() => setChoix(n === numero ? null : n)}
                  >
                    <span className={styles.point} aria-hidden="true" />
                    <span className={styles.etiquette}>
                      {interpolate(textes.numeroButton, { numero: n })}
                    </span>
                  </button>
                ) : (
                  <span
                    key={n}
                    className={`${styles.numero} ${styles.vendue}`}
                    role="img"
                    aria-label={interpolate(textes.numeroSold, { numero: n })}
                  >
                    <span className={styles.point} aria-hidden="true" />
                  </span>
                ),
              )}
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
        {message}
      </div>
      <PanierLateral
        open={tiroirOuvert}
        onClose={fermerTiroir}
        panier={panier}
        locale={locale}
        textes={{ ...textes.drawer, viewCart: textes.viewCart }}
        panierHref={panierHref}
        commandeHref={commandeHref ?? `${panierHref}/commande`}
        retourFocus={declencheur}
      />
      {etat === "erreur" && suggestion !== null ? (
        <Button variant="secondary" onClick={() => ajouter(suggestion)}>
          {interpolate(textes.suggest, { numero: suggestion })}
        </Button>
      ) : null}
    </div>
  );
}
