import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getProductPath } from "@/i18n/slugs";
import type { ApiResult, Disponibilite, ProduitDetail } from "@/lib/api";
import { interpolate } from "@/lib/format";
import { localePath } from "@/lib/routes";
import { AjoutPanier } from "./AjoutPanier";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Galerie } from "./Galerie";
import { Price } from "./Price";
import { Section } from "./Section";
import styles from "./FicheProduit.module.css";

type Props = {
  produit: ProduitDetail;
  disponibilite: ApiResult<Disponibilite>;
  locale: Locale;
  /** Vente en ligne active : « Ajouter au panier » ; sinon « Nous contacter ». */
  shopEnabled: boolean;
  textes: Dictionary["fiche"];
  prix: Dictionary["price"];
  badge: Dictionary["badge"];
};

function Dispo({
  disponibilite,
  textes,
  badge,
}: Pick<Props, "disponibilite" | "badge"> & { textes: Props["textes"] }) {
  if (!disponibilite.ok) return null;
  const d = disponibilite.data;
  if (d.gamme === "Classic") {
    return d.quantite_disponible > 0 ? (
      <p>
        {interpolate(textes.availability.inStock, {
          count: d.quantite_disponible,
        })}
      </p>
    ) : (
      <Badge kind="soldOut" label={badge.soldOut} />
    );
  }
  const restantes = d.series.reduce((t, s) => t + s.pieces_restantes, 0);
  const total = d.series.reduce((t, s) => t + s.taille_serie, 0);
  return restantes > 0 ? (
    <p>
      {interpolate(
        restantes === 1
          ? textes.availability.piece
          : textes.availability.pieces,
        { count: restantes, total },
      )}
    </p>
  ) : (
    <Badge kind="soldOut" label={badge.soldOut} />
  );
}

/** Épuisé = plus aucune unité (Classic) ni aucune pièce numérotée (Premium). */
function estEpuise(disponibilite: ApiResult<Disponibilite>): boolean {
  if (!disponibilite.ok) return false;
  const d = disponibilite.data;
  return d.gamme === "Classic"
    ? d.quantite_disponible <= 0
    : d.series.every((s) => s.pieces_restantes <= 0);
}

/** Fiche produit (brief §05) : galerie, infos, bascule d'une gamme à l'autre, CTA. */
export function FicheProduit({
  produit,
  disponibilite,
  locale,
  shopEnabled,
  textes,
  prix,
  badge,
}: Props) {
  const premium = produit.gamme === "Premium";
  const numeros =
    disponibilite.ok && disponibilite.data.gamme === "Premium"
      ? disponibilite.data.series.flatMap((s) => s.numeros_disponibles)
      : [];
  const epuise = estEpuise(disponibilite);
  const { caracteristiques: c } = produit;

  return (
    <Section
      tone={premium ? "dark" : "light"}
      aria-labelledby="fiche-titre"
      className={styles.fiche}
    >
      <div className={styles.layout}>
        <Galerie medias={produit.medias} textes={textes.gallery} />

        <div className={styles.infos}>
          <p className={styles.gamme}>{produit.gamme}</p>
          <h1 id="fiche-titre" className={styles.title}>
            {produit.modele.nom}
          </h1>
          <p className={styles.description}>{produit.modele.description}</p>

          <Price
            centimes={produit.prix_ttc_centimes}
            locale={locale}
            vatLabel={prix.vatIncluded}
            className={styles.price}
          />

          <dl className={styles.details}>
            <div>
              <dt>{textes.details.dimensions}</dt>
              <dd>
                {textes.details.height} {c.hauteur_cm} cm ·{" "}
                {textes.details.diameter} {c.diametre_cm} cm ·{" "}
                {textes.details.socket} {c.culot}
              </dd>
            </div>
            <div>
              <dt>{textes.details.materials}</dt>
              <dd>
                <ul className={styles.list}>
                  {produit.matieres.map((m) => (
                    <li key={m.nom}>
                      {m.nom} — {m.role}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>{textes.details.care}</dt>
              <dd>
                <ul className={styles.list}>
                  {produit.matieres.map((m) => (
                    <li key={m.nom}>
                      <strong>{m.nom}</strong> : {m.entretien}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>{textes.details.availability}</dt>
              <dd>
                <Dispo
                  disponibilite={disponibilite}
                  textes={textes}
                  badge={badge}
                />
              </dd>
            </div>
          </dl>

          <div className={styles.cta}>
            {shopEnabled ? (
              <AjoutPanier
                slug={produit.slug}
                gamme={produit.gamme}
                numeros={numeros}
                disabled={epuise}
                panierHref={localePath(locale, "panier")}
                textes={textes.cart}
              />
            ) : (
              <Button href={localePath(locale, "contact")}>
                {textes.cart.contact}
              </Button>
            )}
          </div>

          {produit.autre_gamme ? (
            <p className={styles.bascule}>
              <Link href={getProductPath(produit.autre_gamme, locale)}>
                {premium ? textes.switch.toClassic : textes.switch.toPremium}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
