import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { SHOP_ENABLED } from "@/lib/env";
import { localePath } from "@/lib/routes";
import { BandeauAtelier } from "./atelier/BandeauAtelier";
import { CartIndicator } from "./CartIndicator";
import { Logo } from "./Logo";
import { SiteNav } from "./SiteNav";
import styles from "./Header.module.css";

/** En-tête sticky : logo + navigation (burger sous 800 px, brief §07). */
export function Header({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["header"];
}) {
  const links = [
    { href: localePath(locale, "classic"), label: dictionary.nav.classic },
    { href: localePath(locale, "premium"), label: dictionary.nav.premium },
    { href: localePath(locale, "atelier"), label: dictionary.nav.atelier },
  ];

  return (
    <>
      <BandeauAtelier className={styles.bandeau} items={dictionary.bandeau} />
      <header className={styles.header}>
        <div className={styles.inner}>
          <Logo href={`/${locale}`} label={dictionary.home} />
          <div className={styles.actions}>
            {SHOP_ENABLED && (
              <CartIndicator
                href={localePath(locale, "panier")}
                labels={dictionary.cart}
              />
            )}
            <SiteNav
              links={links}
              cta={{
                href: localePath(locale, "contact"),
                label: dictionary.nav.contact,
              }}
              labels={dictionary.menu}
            />
          </div>
        </div>
      </header>
    </>
  );
}
