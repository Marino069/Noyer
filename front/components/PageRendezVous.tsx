import type { Dictionary } from "@/i18n/get-dictionary";
import styles from "./Contact.module.css";
import { RendezVousForm } from "./RendezVousForm";
import { Section } from "./Section";

/** Page /rendez-vous : introduction, adresse de l'atelier et formulaire. */
export function PageRendezVous({
  dictionary,
}: {
  dictionary: Dictionary["rendezVous"];
}) {
  return (
    <Section tone="dark">
      <h1 className={styles.titre}>{dictionary.title}</h1>
      <p className={styles.intro}>{dictionary.intro}</p>
      <address className={styles.adresse}>
        <p>{dictionary.adresse}</p>
      </address>
      <RendezVousForm
        dictionary={dictionary.form}
        objet={dictionary.objet}
        labels={dictionary.labels}
      />
    </Section>
  );
}
