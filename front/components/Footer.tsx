import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { localePath } from "@/lib/routes";
import { NewsletterForm } from "./NewsletterForm";
import { Section } from "./Section";
import styles from "./Footer.module.css";

/** Pied de page en registre sombre (brief §05.7) : Genève, contact, newsletter, légal. */
export function Footer({
  locale,
  dictionary,
  newsletter,
}: {
  locale: Locale;
  dictionary: Dictionary["footer"];
  newsletter: Dictionary["newsletter"];
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
          <NewsletterForm dictionary={newsletter} />
        </div>
        <nav aria-label={dictionary.legal.label} className={styles.legal}>
          <ul>
            {legal.map(({ key, label }) => (
              <li key={key}>
                <Link href={localePath(locale, key)} className={styles.link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Section>
    </footer>
  );
}
