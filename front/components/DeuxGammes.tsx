import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { vignetteDe } from "@/lib/image";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getProductPath } from "@/i18n/slugs";
import type { ProduitResume } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";
import { Comparateur } from "./Comparateur";
import { Section } from "./Section";
import styles from "./DeuxGammes.module.css";

export type DeuxGammesTextes = Dictionary["home"]["gammes"];

/** Une collection : le produit mis en avant (image, lien) et le prix le plus bas de la gamme. */
export type GammeComparee = {
  produit: ProduitResume;
  /** Prix TTC « à partir de », en centimes ; à défaut, le prix du produit mis en avant. */
  aPartirDe?: number;
};

type DeuxGammesProps = {
  classic: GammeComparee;
  premium: GammeComparee;
  locale: Locale;
  textes: DeuxGammesTextes;
};

function Panneau({
  gamme,
  locale,
  textes,
}: {
  gamme: GammeComparee;
  locale: Locale;
  textes: DeuxGammesTextes;
}) {
  const { produit } = gamme;
  const premium = produit.gamme === "Premium";
  const vignette = vignetteDe(produit.image_principale);
  const prix = gamme.aPartirDe ?? produit.prix_ttc_centimes;

  return (
    <article
      className={`${styles.panneau} ${premium ? styles.premium : ""}`}
      data-gamme={produit.gamme}
    >
      {vignette ? (
        // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset)
        <img
          className={styles.image}
          src={vignette.src}
          srcSet={vignette.srcSet}
          sizes="(min-width: 900px) 50vw, 100vw"
          alt={vignette.alt}
          width={vignette.width}
          height={vignette.height}
          loading="lazy"
        />
      ) : (
        <div className={styles.placeholder} aria-hidden="true" />
      )}
      <div className={styles.legende}>
        <div>
          <p className={styles.surtitre}>
            {premium ? textes.surtitrePremium : textes.surtitreClassic}
          </p>
          <h3 className={styles.nom}>
            <Link
              href={getProductPath(produit.slug, locale)}
              className={styles.lien}
            >
              {produit.gamme}
            </Link>
          </h3>
        </div>
        <p className={styles.prix}>
          {textes.aPartirDe} {formatPrice(prix, locale)}
        </p>
      </div>
    </article>
  );
}

/**
 * Les deux collections (maquette « Maison de luxe ») : deux grands panneaux côte à côte,
 * Classic puis Premium, empilés sur mobile. Chaque panneau est entièrement cliquable (un seul
 * lien, étendu par ::after) et le comparateur suit sous les panneaux. Prix : toujours l'API.
 */
export function DeuxGammes({
  classic,
  premium,
  locale,
  textes,
}: DeuxGammesProps) {
  const vignetteClassic = vignetteDe(classic.produit.image_principale);
  const vignettePremium = vignetteDe(premium.produit.image_principale);

  return (
    <Section aria-labelledby="gammes-titre">
      <h2 id="gammes-titre" className={styles.titre}>
        {textes.titre} <em>{textes.accent}</em>
      </h2>
      <div className={styles.grille}>
        <Panneau gamme={classic} locale={locale} textes={textes} />
        <Panneau gamme={premium} locale={locale} textes={textes} />
      </div>
      {vignetteClassic && vignettePremium ? (
        <div className={styles.comparateur}>
          <Comparateur
            classic={{
              vignette: vignetteClassic,
              prix: formatPrice(classic.produit.prix_ttc_centimes, locale),
            }}
            premium={{
              vignette: vignettePremium,
              prix: formatPrice(premium.produit.prix_ttc_centimes, locale),
            }}
            textes={textes.comparateur}
          />
        </div>
      ) : null}
    </Section>
  );
}
