import type { Locale } from "@/i18n/config";
import type { ApiResult, Page, ProduitResume } from "@/lib/api";
import { ErrorState } from "./ErrorState";
import { ProductCard, ProductCardGrid } from "./ProductCard";
import { Section } from "./Section";
import styles from "./Selection.module.css";

type SelectionProps = {
  /** Résultat de `GET /produits/?mis_en_avant=true`. */
  produits: ApiResult<Page<ProduitResume>>;
  locale: Locale;
  title: string;
  empty: string;
  errorTitle: string;
  errorMessage: string;
};

/**
 * « Sélection produits » (brief §05.6) : les produits marqués « mis en avant » côté catalogue.
 * États vide et erreur gérés ici ; l'état de chargement est `SelectionSkeleton`.
 */
export function Selection({
  produits,
  locale,
  title,
  empty,
  errorTitle,
  errorMessage,
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
      <h2 id="selection-titre" className={styles.title}>
        {title}
      </h2>
      {liste.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ProductCardGrid>
          {liste.map((produit) => (
            <ProductCard key={produit.slug} produit={produit} locale={locale} />
          ))}
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
