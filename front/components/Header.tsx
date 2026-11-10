import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { SHOP_ENABLED } from "@/lib/env";
import { localePath } from "@/lib/routes";
import { CartIndicator } from "./CartIndicator";
import { HeaderVivant } from "./HeaderVivant";
import { Logo } from "./Logo";
import { SiteNav } from "./SiteNav";
import styles from "./Header.module.css";

/**
 * En-tête à 3 colonnes (maquette « Maison de luxe ») : menus à gauche, logo centré,
 * Rendez-vous et Panier à droite. Sous 800 px : burger, logo, panier ; le menu plein
 * écran reprend tous les liens.
 */
export function Header({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["header"];
}) {
  const links = [
    { href: localePath(locale, "classic"), label: dictionary.nav.collections },
    { href: `/${locale}#maison`, label: dictionary.nav.maison },
    { href: localePath(locale, "atelier"), label: dictionary.nav.atelier },
  ];
  const rendezVous = {
    href: localePath(locale, "contact"),
    label: dictionary.nav.rendezVous,
  };

  return (
    <HeaderVivant>
      <div className={styles.inner}>
        <div className={styles.gauche}>
          <SiteNav links={links} cta={rendezVous} labels={dictionary.menu} />
        </div>
        <Logo href={`/${locale}`} label={dictionary.home} />
        <div className={styles.droite}>
          <Link href={rendezVous.href} className={styles.rendezVous}>
            {rendezVous.label}
          </Link>
          {SHOP_ENABLED && (
            <CartIndicator
              href={localePath(locale, "panier")}
              labels={dictionary.cart}
              texte={dictionary.panier}
            />
          )}
        </div>
      </div>
    </HeaderVivant>
  );
}
