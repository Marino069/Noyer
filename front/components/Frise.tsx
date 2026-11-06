import type { Dictionary } from "@/i18n/get-dictionary";
import { Surtitre } from "./atelier/Surtitre";
import { Image } from "./Image";
import { Section } from "./Section";
import styles from "./Frise.module.css";

export type FriseTextes = Dictionary["home"]["frise"];

/**
 * Frise du processus (maquette carnet d'atelier) : registre sombre, filet horizontal
 * à puces laiton, quatre étapes numérotées (ol), puis la lampe allumée et une citation.
 * Réutilisable sur la page Atelier. Les durées sont des placeholders à confirmer par le client.
 */
export function Frise({ textes }: { textes: FriseTextes }) {
  return (
    <Section tone="dark" aria-labelledby="frise-titre">
      <Surtitre tone="dark">{textes.surtitre}</Surtitre>
      <h2 id="frise-titre" className={styles.title}>
        {textes.titre} <em>{textes.accent}</em>
      </h2>
      <div className={styles.frise}>
        <div aria-hidden="true" className={styles.filet} />
        <ol className={styles.etapes} aria-label={textes.etapesLabel}>
          {textes.etapes.map((etape, i) => (
            <li key={etape.titre} className={styles.etape}>
              <span aria-hidden="true" className={styles.puce} />
              <p className={styles.numero} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className={styles.etapeTitre}>{etape.titre}</h3>
              <p className={styles.texte}>{etape.texte}</p>
              <p className={styles.duree}>{etape.duree}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.finale}>
        <div className={styles.photo}>
          <Image
            src={textes.image.src}
            alt={textes.image.alt}
            width={1600}
            height={900}
            sizes="(min-width: 900px) 60vw, 100vw"
          />
        </div>
        <blockquote className={styles.citation}>
          <p>
            <em>« {textes.citation} »</em>
          </p>
        </blockquote>
      </div>
    </Section>
  );
}
