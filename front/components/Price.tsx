import { formatPrice, formatVatRate, interpolate } from "@/lib/format";
import styles from "./Price.module.css";

type PriceProps = {
  centimes: number;
  locale: string;
  /** Taux de TVA tel que renvoyé par l'API (ex. « 8.10 »), jamais codé en dur. */
  tauxTva?: string;
  /** Message du dictionnaire avec `{rate}` (ex. « TVA incluse ({rate}) »). */
  vatLabel: string;
  className?: string;
};

/** Prix TTC en CHF + mention « TVA incluse » (le taux n'est affiché que s'il est fourni). */
export function Price({
  centimes,
  locale,
  tauxTva,
  vatLabel,
  className,
}: PriceProps) {
  const rate = tauxTva ? formatVatRate(tauxTva, locale) : "";
  return (
    <div className={[styles.price, className].filter(Boolean).join(" ")}>
      <p className={styles.amount}>{formatPrice(centimes, locale)}</p>
      {rate ? (
        <p className={styles.vat}>{interpolate(vatLabel, { rate })}</p>
      ) : null}
    </div>
  );
}
