import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getProductPath } from "@/i18n/slugs";
import type { ProduitDetail, ProduitResume } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";
import { Button } from "./Button";
import { Section } from "./Section";
import styles from "./DeuxGammes.module.css";

export type DeuxGammesTextes = Dictionary["home"]["gammes"];

/** Une gamme à comparer : le résumé du catalogue, sa fiche (pied, finition, dimensions) et la taille de série. */
export type GammeComparee = {
  produit: ProduitResume;
  detail: ProduitDetail | null;
  /** Taille de la série Premium (`disponibilite`), `null` si inconnue. */
  tirage: number | null;
};

type DeuxGammesProps = {
  classic: GammeComparee;
  premium: GammeComparee;
  locale: Locale;
  textes: DeuxGammesTextes;
};

const gabarit = (modele: string, valeurs: Record<string, string | number>) =>
  Object.entries(valeurs).reduce(
    (texte, [cle, valeur]) => texte.replace(`{${cle}}`, String(valeur)),
    modele,
  );

type Ligne = { terme: string; valeur: string };

function lignes(
  { produit, detail, tirage }: GammeComparee,
  textes: DeuxGammesTextes,
): Ligne[] {
  const matiere = (role: string) =>
    detail?.matieres.find((m) => m.role === role)?.nom;
  const pied = matiere("Pied");
  const finition = matiere("Finition");
  const tirageTexte =
    produit.gamme === "Classic"
      ? textes.tirageClassic
      : tirage !== null
        ? gabarit(textes.tirageSerie, { taille: tirage })
        : null;
  const c = detail?.caracteristiques;
  const toutes: (Ligne | null | undefined | "")[] = [
    pied ? { terme: textes.lignes.pied, valeur: pied } : null,
    finition ? { terme: textes.lignes.finition, valeur: finition } : null,
    tirageTexte ? { terme: textes.lignes.tirage, valeur: tirageTexte } : null,
    c
      ? {
          terme: textes.lignes.dimensions,
          valeur: gabarit(textes.dimensions, {
            hauteur: c.hauteur_cm,
            diametre: c.diametre_cm,
            culot: c.culot,
          }),
        }
      : null,
  ];
  return toutes.filter((l): l is Ligne => Boolean(l));
}

function CarteGamme({
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
  const image = produit.image_principale;
  const sources = image
    ? [...image.sources].sort((a, b) => a.largeur - b.largeur)
    : [];
  const rangees = lignes(gamme, textes);

  return (
    <article
      className={`${styles.carte} ${premium ? styles.premium : ""}`}
      data-tone={premium ? "dark" : "light"}
    >
      <div className={styles.media}>
        {image && sources.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element -- sources WebP fournies par l'API (srcset)
          <img
            src={sources[0].url}
            srcSet={sources.map((s) => `${s.url} ${s.largeur}w`).join(", ")}
            sizes="(min-width: 900px) 50vw, 100vw"
            alt={image.alt}
            width={image.largeur_origine}
            height={image.hauteur_origine}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>
      <div className={styles.corps}>
        <p className={styles.gamme}>{produit.gamme.toUpperCase()}</p>
        <h3 className={styles.nom}>{produit.modele}</h3>
        {rangees.length > 0 ? (
          <dl className={styles.liste}>
            {rangees.map((l) => (
              <div key={l.terme} className={styles.ligne}>
                <dt>{l.terme}</dt>
                <dd>{l.valeur}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className={styles.pied}>
          <p className={styles.prix}>
            {formatPrice(produit.prix_ttc_centimes, locale)}
          </p>
          <Button
            href={getProductPath(produit.slug, locale)}
            variant={premium ? "primary" : "secondary"}
            tone={premium ? "dark" : "light"}
            className={styles.cta}
          >
            {premium ? textes.ctaPremium : textes.ctaClassic}
            <span className={styles.srOnly}>
              {" "}
              — {produit.modele} {produit.gamme}
            </span>
          </Button>
        </div>
      </div>
    </article>
  );
}

/**
 * Comparaison des gammes (maquette carnet d'atelier) : Classic en clair, Premium en sombre,
 * mêmes lignes dans une liste de définitions, prix et appel. Cartes entièrement cliquables
 * (lien du bouton étendu à la carte). Aucune valeur en dur : tout vient de l'API.
 */
export function DeuxGammes({
  classic,
  premium,
  locale,
  textes,
}: DeuxGammesProps) {
  return (
    <Section aria-labelledby="gammes-titre">
      <div className={styles.entete}>
        <h2 id="gammes-titre" className={styles.title}>
          {textes.titre} <em>{textes.accent}</em>
        </h2>
        <p className={styles.intro}>{textes.intro}</p>
      </div>
      <div className={styles.grille}>
        <CarteGamme gamme={classic} locale={locale} textes={textes} />
        <CarteGamme gamme={premium} locale={locale} textes={textes} />
      </div>
    </Section>
  );
}
