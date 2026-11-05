export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const API_MOCKS = process.env.NEXT_PUBLIC_API_MOCKS === "true";

// Vente en ligne directe (brief §08, décision ouverte) : false = site vitrine, panier masqué.
export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED === "true";

// Secrets serveur (jamais NEXT_PUBLIC_) : webhook de publication et mode aperçu.
export const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? "";
export const PREVIEW_SECRET = process.env.PREVIEW_SECRET ?? "";

// Script de mesure d'audience, chargé uniquement après consentement. Vide = aucun tracker.
export const TRACKER_SRC = process.env.NEXT_PUBLIC_TRACKER_SRC ?? "";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
