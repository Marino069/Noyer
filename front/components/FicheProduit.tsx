import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getProductPath } from "@/i18n/slugs";
import type { ApiResult, Disponibilite, ProduitDetail } from "@/lib/api";
import { localePath } from "@/lib/routes";
import { AchatLive } from "./AchatLive";
import { Button } from "./Button";
import { DispoLive } from "./DispoLive";
import { DisponibiliteLive } from "./DisponibiliteLive";
import { Galerie } from "./Galerie";
import { Price } from "./Price";
import { ProcessusFabrication } from "./ProcessusFabrication";
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
  const { caracteristiques: c } = produit;

  return (
    <DisponibiliteLive slug={produit.slug} initial={disponibilite}>
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
                  <DispoLive textes={textes} badge={badge} />
                </dd>
              </div>
            </dl>

            <div className={styles.cta}>
              {shopEnabled ? (
                <AchatLive
                  slug={produit.slug}
                  gamme={produit.gamme}
                  panierHref={localePath(locale, "panier")}
                  textes={textes.cart}
                  alerte={textes.soldOut}
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
      {premium ? <ProcessusFabrication textes={textes.process} /> : null}
    </DisponibiliteLive>
  );
}
