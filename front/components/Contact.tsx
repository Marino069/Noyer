import type { Dictionary } from "@/i18n/get-dictionary";
import { CarteShowroom } from "./CarteShowroom";
import styles from "./Contact.module.css";
import { ContactForm } from "./ContactForm";
import { Section } from "./Section";

/** Page contact : formulaire (honeypot + consentement nLPD), adresse et horaires du showroom, plan à la demande. */
export function Contact({ dictionary }: { dictionary: Dictionary["contact"] }) {
  const { showroom } = dictionary;
  return (
    <>
      <Section>
        <h1 className={styles.titre}>{dictionary.title}</h1>
        <p className={styles.intro}>{dictionary.intro}</p>
        <ContactForm dictionary={dictionary.form} />
      </Section>
      <Section tone="alt" aria-labelledby="showroom-titre">
        <h2 id="showroom-titre" className={styles["sous-titre"]}>
          {showroom.title}
        </h2>
        <p className={styles.intro}>{showroom.intro}</p>
        <p className={styles.label}>{showroom.addressLabel}</p>
        <address className={styles.adresse}>
          {showroom.address.map((ligne) => (
            <p key={ligne}>{ligne}</p>
          ))}
        </address>
        <p className={styles.label}>{showroom.hoursLabel}</p>
        <dl className={styles.horaires}>
          {showroom.hours.map((h) => (
            <div key={h.jour} style={{ display: "contents" }}>
              <dt>{h.jour}</dt>
              <dd>{h.horaire}</dd>
            </div>
          ))}
        </dl>
        <h3 className={styles["sous-titre"]}>{dictionary.map.title}</h3>
        <CarteShowroom dictionary={dictionary.map} />
      </Section>
    </>
  );
}
