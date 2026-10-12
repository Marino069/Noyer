import type { Locale } from "@/i18n/config";
import type { ProduitResume } from "@/lib/api/types";
import { ProductCard, ProductCardGrid } from "./ProductCard";
import { Section } from "./Section";
import styles from "./DeuxGammes.module.css";

type DeuxGammesProps = {
  classic: ProduitResume;
  premium: ProduitResume;
  locale: Locale;
  title: string;
  intro: string;
};

/**
 * « Deux gammes » (brief §05.4) : une même forme en Classic et en Premium, côte à côte
 * (empilées sous 600px). Uniquement des `ProductCard`, sans variante locale.
 */
export function DeuxGammes({
  classic,
  premium,
  locale,
  title,
  intro,
}: DeuxGammesProps) {
  return (
    <Section aria-labelledby="gammes-titre">
      <h2 id="gammes-titre" className={styles.title}>
        {title}
      </h2>
      <p className={styles.intro}>{intro}</p>
      <ProductCardGrid className={styles.grid}>
        <ProductCard produit={classic} locale={locale} />
        <ProductCard produit={premium} locale={locale} />
      </ProductCardGrid>
    </Section>
  );
}
