import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localePath } from "@/lib/routes";
import { ConsentPreferencesButton } from "./ConsentPreferencesButton";
import { NewsletterForm } from "./NewsletterForm";
import { Section } from "./Section";
import styles from "./Footer.module.css";

/** Pied de page en 4 colonnes : maison, collections, la maison, lettre de l'atelier ; puis légal. */
export function Footer({
  locale,
  dictionary,
  newsletter,
  consentLabel,
}: {
  locale: Locale;
  dictionary: Dictionary["footer"];
  newsletter: Dictionary["newsletter"];
  /** Présent seulement si des trackers existent : libellé du lien « Cookies ». */
  consentLabel?: string;
}) {
  const legal = [
    { key: "impressum", label: dictionary.legal.impressum },
    { key: "cgv", label: dictionary.legal.cgv },
    { key: "confidentialite", label: dictionary.legal.privacy },
  ] as const;

  return (
    <footer>
      <Section tone="dark">
        <div className={styles.grid}>
          <div>
            <p className={styles.brand}>Noyer</p>
            <p className={styles.tagline}>{dictionary.tagline}</p>
            <address className={styles.address}>
              {dictionary.address.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
            <p>
              <Link
                href={localePath(locale, "contact")}
                className={styles.link}
              >
                {dictionary.contact}
              </Link>
            </p>
          </div>
          <nav aria-label={dictionary.collections.titre}>
            <p className={styles.titre}>{dictionary.collections.titre}</p>
            <ul className={styles.liens}>
              <li>
                <Link href={localePath(locale, "classic")}>
                  {dictionary.collections.classic}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "premium")}>
                  {dictionary.collections.premium}
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={dictionary.maison.titre}>
            <p className={styles.titre}>{dictionary.maison.titre}</p>
            <ul className={styles.liens}>
              <li>
                <Link href={localePath(locale, "atelier")}>
                  {dictionary.maison.atelier}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "contact")}>
                  {dictionary.maison.contact}
                </Link>
              </li>
            </ul>
          </nav>
          <NewsletterForm dictionary={newsletter} />
        </div>
        <nav aria-label={dictionary.legal.label} className={styles.legal}>
          <p className={styles.copyright}>{dictionary.copyright}</p>
          <ul>
            {legal.map(({ key, label }) => (
              <li key={key}>
                <Link href={localePath(locale, key)} className={styles.link}>
                  {label}
                </Link>
              </li>
            ))}
            {consentLabel ? (
              <li>
                <ConsentPreferencesButton label={consentLabel} />
              </li>
            ) : null}
          </ul>
        </nav>
      </Section>
    </footer>
  );
}
