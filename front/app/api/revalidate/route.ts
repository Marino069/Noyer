import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { REVALIDATE_SECRET } from "@/lib/env";

function secretValide(recu: string | null): boolean {
  if (!REVALIDATE_SECRET || !recu) return false;
  const a = Buffer.from(recu);
  const b = Buffer.from(REVALIDATE_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook de publication : le back l'appelle quand un contenu est publié.
 * POST avec l'en-tête `x-webhook-secret` et, au choix, `{ "slug": "atelier" }`
 * (une page) ou un corps vide (tous les contenus).
 */
export async function POST(request: NextRequest) {
  if (!secretValide(request.headers.get("x-webhook-secret"))) {
    return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  }
  let slug: string | undefined;
  try {
    const body = (await request.json()) as { slug?: unknown };
    if (typeof body.slug === "string" && /^[a-z0-9-]+$/.test(body.slug))
      slug = body.slug;
  } catch {
    // corps vide ou invalide : on revalide tout
  }
  const tag = slug ? `contenu:${slug}` : "contenu";
  // expire: 0 → le prochain visiteur reçoit déjà la version publiée.
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalide: tag });
}
