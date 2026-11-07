import Link from "next/link";
import { vignetteDe } from "@/lib/image";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getProductPath } from "@/i18n/slugs";
import type { ApiResult, Disponibilite, Page, ProduitResume } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { ErrorState } from "./ErrorState";
import { ProductCardGrid } from "./ProductCard";
import { Section } from "./Section";
import styles from "./Selection.module.css";

type TextesDispo = Dictionary["home"]["selection"]["dispo"];

type SelectionProps = {
  /** Résultat de `GET /produits/?mis_en_avant=true`. */
  produits: ApiResult<Page<ProduitResume>>;
  locale: Locale;
  title: string;
  empty: string;
  errorTitle: string;
  errorMessage: string;
  /** Disponibilités par slug (`GET /produits/{slug}/disponibilite/`) ; absente = ligne masquée. */
  disponibilites?: Record<string, Disponibilite | undefined>;
  dispo?: TextesDispo;
  /** Lien « Toutes les lampes ». */
  tous?: { libelle: string; href: string };
};

const gabarit = (modele: string, valeurs: Record<string, number>) =>
  Object.entries(valeurs).reduce(
    (texte, [cle, valeur]) => texte.replace(`{${cle}}`, String(valeur)),
    modele,
  );

/** Texte de disponibilité : stock (Classic) ou pièces libres sur la série (Premium). */
export function texteDispo(d: Disponibilite, dispo: TextesDispo): string {
  if (d.gamme === "Classic") {
    return d.quantite_disponible > 0 ? dispo.enStock : dispo.epuise;
  }
  const libres = d.series.reduce((n, s) => n + s.pieces_restantes, 0);
  const total = d.series.reduce((n, s) => n + s.taille_serie, 0);
  return libres > 0
    ? gabarit(dispo.piecesLibres, { libres, total })
    : dispo.serieComplete;
}

function CarteAtelier({
  produit,
  locale,
  disponibilite,
}: {
  produit: ProduitResume;
  locale: Locale;
  disponibilite: string | null;
}) {
  const image = produit.image_principale;
  const vignette = vignetteDe(image);
  return (
    <article className={styles.carte}>
      <div className={styles.media}>
        {vignette ? (
          // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset)
          <img
            src={vignette.src}
            srcSet={vignette.srcSet}
            sizes="(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw"
            alt=""
            width={vignette.width}
            height={vignette.height}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>
      <div className={styles.ligne}>
        <h3 className={styles.nom}>
          <Link
            className={styles.lien}
            href={getProductPath(produit.slug, locale)}
          >
            {produit.modele}
            <span className={styles.gamme}> {produit.gamme}</span>
          </Link>
        </h3>
        <p className={styles.prix}>
          {formatPrice(produit.prix_ttc_centimes, locale)}
        </p>
      </div>
      {disponibilite ? <p className={styles.dispo}>{disponibilite}</p> : null}
    </article>
  );
}

/**
 * « À l'atelier en ce moment » : les produits « mis en avant », en cartes 4:5 avec leur
 * disponibilité (stock ou pièces libres). États vide et erreur gérés ici ;
 * l'état de chargement est `SelectionSkeleton`.
 */
export function Selection({
  produits,
  locale,
  title,
  empty,
  errorTitle,
  errorMessage,
  disponibilites = {},
  dispo,
  tous,
}: SelectionProps) {
  if (!produits.ok) {
    return (
      <Section aria-label={errorTitle}>
        <ErrorState title={errorTitle} message={errorMessage} />
      </Section>
    );
  }

  const liste = produits.data.results;

  return (
    <Section aria-labelledby="selection-titre">
      <div className={styles.entete}>
        <h2 id="selection-titre" className={styles.title}>
          {title}
        </h2>
        {tous ? (
          <Link className={styles.tous} href={tous.href}>
            {tous.libelle}
          </Link>
        ) : null}
      </div>
      {liste.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ProductCardGrid>
          {liste.map((produit) => {
            const d = disponibilites[produit.slug];
            return (
              <CarteAtelier
                key={produit.slug}
                produit={produit}
                locale={locale}
                disponibilite={dispo && d ? texteDispo(d, dispo) : null}
              />
            );
          })}
        </ProductCardGrid>
      )}
    </Section>
  );
}

/** État de chargement : gabarit des cartes, annoncé comme occupé. */
export function SelectionSkeleton({ label }: { label: string }) {
  return (
    <Section aria-busy="true" aria-label={label}>
      <div className={styles.skeletonTitle} aria-hidden="true" />
      <ProductCardGrid>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonCard} aria-hidden="true" />
        ))}
      </ProductCardGrid>
    </Section>
  );
}
