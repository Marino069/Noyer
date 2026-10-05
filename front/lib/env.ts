export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const API_MOCKS = process.env.NEXT_PUBLIC_API_MOCKS === "true";

// Vente en ligne directe (brief §08, décision ouverte) : false = site vitrine, panier masqué.
export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED === "true";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
