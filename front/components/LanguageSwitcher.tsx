import Link from "next/link";
import { locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

export function LanguageSwitcher({
  current,
  dictionary,
}: {
  current: Locale;
  dictionary: Dictionary["languageSwitcher"];
}) {
  // Masqué tant qu'une seule langue est active.
  if (locales.length < 2) return null;

  return (
    <nav aria-label={dictionary.label}>
      <ul>
        {locales.map((locale) => (
          <li key={locale}>
            <Link
              href={`/${locale}`}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? "true" : undefined}
            >
              {dictionary.names[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
