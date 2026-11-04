import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { ApiResult, Gamme, Page, ProduitResume } from "@/lib/api";
import { ErrorState } from "./ErrorState";
import { ProductCard, ProductCardGrid } from "./ProductCard";
import { Section } from "./Section";
import styles from "./ProduitsListe.module.css";

export const PAGE_SIZE = 24;

export type ProduitsListeTextes = {
  title: string;
  filterLabel: string;
  all: string;
  /** Chaque modèle contient `{count}`. */
  results: { zero: string; one: string; other: string };
  empty: string;
  errorTitle: string;
  errorMessage: string;
  paginationLabel: string;
  previous: string;
  next: string;
  /** Contient `{page}`. */
  pageLabel: string;
};

type Props = {
  produits: ApiResult<Page<ProduitResume>>;
  locale: Locale;
  gamme?: Gamme;
  page: number;
  textes: ProduitsListeTextes;
};

export function listeHref(locale: Locale, gamme?: Gamme, page = 1): string {
  const params = new URLSearchParams();
  if (gamme) params.set("gamme", gamme);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/${locale}/produits${query ? `?${query}` : ""}`;
}

export function resultsLabel(
  count: number,
  textes: ProduitsListeTextes["results"],
): string {
  const modele =
    count === 0 ? textes.zero : count === 1 ? textes.one : textes.other;
  return modele.replace("{count}", String(count));
}

/**
 * Page listing : filtre par gamme et pagination sont de simples liens (l'état vit dans l'URL,
 * rendu serveur, bouton retour natif). Le nombre de résultats est annoncé via `role="status"`.
 */
export function ProduitsListe({
  produits,
  locale,
  gamme,
  page,
  textes,
}: Props) {
  const filtres: { gamme?: Gamme; label: string }[] = [
    { label: textes.all },
    { gamme: "Classic", label: "Classic" },
    { gamme: "Premium", label: "Premium" },
  ];

  return (
    <Section aria-labelledby="produits-titre">
      <h1 id="produits-titre" className={styles.title}>
        {textes.title}
      </h1>
      <nav aria-label={textes.filterLabel} className={styles.filters}>
        <ul className={styles.filterList}>
          {filtres.map((f) => (
            <li key={f.label}>
              <Link
                className={styles.filter}
                href={listeHref(locale, f.gamme)}
                aria-current={f.gamme === gamme ? "page" : undefined}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!produits.ok ? (
        <ErrorState title={textes.errorTitle} message={textes.errorMessage} />
      ) : (
        <Resultats
          data={produits.data}
          locale={locale}
          gamme={gamme}
          page={page}
          textes={textes}
        />
      )}
    </Section>
  );
}

function Resultats({
  data,
  locale,
  gamme,
  page,
  textes,
}: Omit<Props, "produits"> & { data: Page<ProduitResume> }) {
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  return (
    <>
      <p role="status" className={styles.count}>
        {resultsLabel(data.count, textes.results)}
      </p>
      {data.results.length === 0 ? (
        <p className={styles.empty}>{textes.empty}</p>
      ) : (
        <ProductCardGrid>
          {data.results.map((produit) => (
            <ProductCard key={produit.slug} produit={produit} locale={locale} />
          ))}
        </ProductCardGrid>
      )}
      {data.count > PAGE_SIZE ? (
        <nav aria-label={textes.paginationLabel} className={styles.pagination}>
          {page > 1 ? (
            <Link rel="prev" href={listeHref(locale, gamme, page - 1)}>
              {textes.previous}
            </Link>
          ) : null}
          <ul className={styles.pages}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <Link
                  href={listeHref(locale, gamme, n)}
                  aria-current={n === page ? "page" : undefined}
                  aria-label={textes.pageLabel.replace("{page}", String(n))}
                >
                  {n}
                </Link>
              </li>
            ))}
          </ul>
          {page < totalPages ? (
            <Link rel="next" href={listeHref(locale, gamme, page + 1)}>
              {textes.next}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
