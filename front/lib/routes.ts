import type { Locale } from "@/i18n/config";

// Chemins publics (sans préfixe de langue). Les pages sont créées par les tickets de contenu.
export const routes = {
  classic: "/produits/classic",
  premium: "/produits/premium",
  atelier: "/atelier",
  contact: "/contact",
  rendezVous: "/rendez-vous",
  panier: "/panier",
  impressum: "/impressum",
  cgv: "/cgv",
  confidentialite: "/confidentialite",
} as const;

export type RouteKey = keyof typeof routes;

export function localePath(locale: Locale, key: RouteKey): string {
  return `/${locale}${routes[key]}`;
}
