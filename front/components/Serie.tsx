import type { Disponibilite } from "@/lib/api";
import { interpolate } from "@/lib/format";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Surtitre } from "./atelier/Surtitre";
import { Button } from "./Button";
import { Section } from "./Section";
import styles from "./Serie.module.css";

type SeriePremium = Extract<
  Disponibilite,
  { gamme: "Premium" }
>["series"][number];

type SerieProps = {
  /** Série Premium en cours (disponibilité de l'API). */
  serie: SeriePremium;
  /** Lien vers la fiche Premium. */
  href: string;
  textes: Dictionary["home"]["serie"];
};

/**
 * « La série » (maquette Maison de luxe) : texte et bouton à gauche, grille des pièces à droite
 * (points pleins = vendues, cerclés = libres). La grille est décorative : le résumé
 * « 12 pièces libres sur 50 » est lu par les lecteurs d'écran.
 */
export function Serie({ serie, href, textes }: SerieProps) {
  const total = serie.taille_serie;
  const libres = new Set(serie.numeros_disponibles);
  const nbLibres = serie.pieces_restantes;
  const resume = interpolate(
    nbLibres === 1 ? textes.resumeUne : textes.resume,
    { libres: nbLibres, total },
  );

  return (
    <Section tone="alt" aria-labelledby="serie-titre">
      <div className={styles.layout}>
        <div>
          <Surtitre>{textes.surtitre}</Surtitre>
          <h2 id="serie-titre" className={styles.title}>
            {textes.titre} <em>{textes.accent}</em>
          </h2>
          <p className={styles.texte}>{textes.texte}</p>
          <Button href={href}>{textes.cta}</Button>
        </div>
        <div>
          <p className={styles.resume}>{resume}</p>
          <div className={styles.grille} aria-hidden="true">
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
              <span
                key={n}
                className={libres.has(n) ? styles.libre : styles.vendue}
              />
            ))}
          </div>
          <p className={styles.legende} aria-hidden="true">
            <span>● {textes.vendue}</span>
            <span>
              ○ {textes.libre} · {nbLibres}
            </span>
          </p>
        </div>
      </div>
    </Section>
  );
}
