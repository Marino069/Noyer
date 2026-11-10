import type { Dictionary } from "@/i18n/get-dictionary";
import { Surtitre } from "./atelier/Surtitre";
import { Button } from "./Button";
import { Image } from "./Image";
import styles from "./RendezVous.module.css";
import { Section } from "./Section";

type RendezVousProps = {
  href: string;
  textes: Dictionary["home"]["rendezVous"];
};

/**
 * « Venez voir la lumière » (maquette Maison de luxe) : image d'atelier en fond sous voile sombre,
 * adresse et bouton cerclé de laiton vers la page de rendez-vous.
 */
export function RendezVous({ href, textes }: RendezVousProps) {
  return (
    <Section
      tone="dark"
      aria-labelledby="rendez-vous-titre"
      className={styles.section}
    >
      <Image
        src={textes.image}
        alt=""
        width={960}
        height={640}
        sizes="100vw"
        className={styles.fond}
      />
      <div className={styles.contenu}>
        <Surtitre>{textes.surtitre}</Surtitre>
        <h2 id="rendez-vous-titre" className={styles.title}>
          {textes.titre} <em>{textes.accent}</em>
        </h2>
        <p className={styles.adresse}>{textes.adresse}</p>
        <Button href={href} variant="secondary">
          {textes.cta}
        </Button>
      </div>
    </Section>
  );
}
