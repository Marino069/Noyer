import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { getProductPath } from "@/i18n/slugs";
import { formatPrice } from "@/lib/format";
import type { ProduitResume } from "@/lib/api/types";
import styles from "./ProductCard.module.css";

type ProductCardProps = {
  produit: ProduitResume;
  locale: Locale;
  className?: string;
};

/**
 * Carte produit : même silhouette pour les deux gammes, le Premium passe au registre sombre
 * avec un filet laiton 1px et le mot « Premium » en laiton (seules occurrences de laiton).
 * Un seul lien (le nom) dont la zone cliquable couvre toute la carte.
 */
export function ProductCard({ produit, locale, className }: ProductCardProps) {
  const premium = produit.gamme === "Premium";
  const image = produit.image_principale;
  const sources = image
    ? [...image.sources].sort((a, b) => a.largeur - b.largeur)
    : [];
  const classes = [
    styles.card,
    premium ? styles.premium : styles.classic,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes} data-tone={premium ? "dark" : "light"}>
      <div className={styles.media}>
        {image && sources.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset)
          <img
            className={styles.image}
            src={sources[0].url}
            srcSet={sources.map((s) => `${s.url} ${s.largeur}w`).join(", ")}
            sizes="(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw"
            alt={image.alt}
            width={image.largeur_origine}
            height={image.hauteur_origine}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.gamme}>{produit.gamme}</p>
        <h3 className={styles.name}>
          <Link
            className={styles.link}
            href={getProductPath(produit.slug, locale)}
          >
            {produit.modele}
            <span className={styles.srOnly}> {produit.gamme}</span>
          </Link>
        </h3>
        <p className={styles.price}>
          {formatPrice(produit.prix_ttc_centimes, locale)}
        </p>
      </div>
    </article>
  );
}

/** Conteneur des cartes : côte à côte > 900px, empilées < 600px (brief §07). */
export function ProductCardGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={[styles.grid, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
