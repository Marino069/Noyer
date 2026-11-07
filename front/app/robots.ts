import type { MetadataRoute } from "next";
import { API_MOCKS, SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  // Site de démonstration (données fictives) : jamais indexé.
  if (API_MOCKS) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
