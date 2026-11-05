import { timingSafeEqual } from "node:crypto";
import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale } from "@/i18n/config";
import { PREVIEW_SECRET } from "@/lib/env";

function secretValide(recu: string | null): boolean {
  if (!PREVIEW_SECRET || !recu) return false;
  const a = Buffer.from(recu);
  const b = Buffer.from(PREVIEW_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Active le mode aperçu (brouillons) puis redirige vers la page.
 * GET /api/apercu?secret=…&slug=atelier — `?quitter=1` désactive le mode.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const draft = await draftMode();

  if (params.get("quitter")) {
    draft.disable();
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  const slug = params.get("slug") ?? "";
  if (!secretValide(params.get("secret")) || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  }
  draft.enable();
  return NextResponse.redirect(
    new URL(`/${defaultLocale}/${slug}`, request.url),
  );
}
