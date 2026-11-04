/** Montant en centimes → « CHF 1'240.– » (docs/api.md : jamais de décimale flottante). */
export function formatPrice(centimes: number, locale: string): string {
  const sign = centimes < 0 ? "-" : "";
  const abs = Math.abs(centimes);
  const francs = new Intl.NumberFormat(regionalLocale(locale), {
    maximumFractionDigits: 0,
  }).format(Math.floor(abs / 100));
  const reste = abs % 100;
  return `CHF ${sign}${francs}.${reste === 0 ? "–" : String(reste).padStart(2, "0")}`;
}

/** Taux de TVA reçu de l'API (« 8.10 ») → « 8.1 % » selon la locale. */
export function formatVatRate(taux: string, locale: string): string {
  const value = Number(taux);
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(regionalLocale(locale), {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/** « fr » → « fr-CH » : séparateurs suisses quelle que soit la langue (fr, en, de). */
function regionalLocale(locale: string): string {
  return locale.includes("-") ? locale : `${locale}-CH`;
}

/** Remplace les `{clé}` d'un message du dictionnaire. */
export function interpolate(
  message: string,
  values: Record<string, string | number>,
): string {
  return message.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? ""),
  );
}

/** Millisecondes restantes → « 14 min 05 s » (arrondi à la seconde supérieure). */
export function formatDuree(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const secondes = String(total % 60).padStart(2, "0");
  return `${minutes} min ${secondes} s`;
}
