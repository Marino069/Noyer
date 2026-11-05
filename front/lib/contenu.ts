import { draftMode } from "next/headers";
import { api } from "@/lib/api";
import { PREVIEW_SECRET } from "@/lib/env";

/** Page éditoriale : publiée, ou brouillon si le mode aperçu est actif (cookie posé par /api/apercu). */
export async function chargerPageContenu(slug: string) {
  const { isEnabled } = await draftMode();
  const apercu = isEnabled && PREVIEW_SECRET ? PREVIEW_SECRET : undefined;
  const result = await api.pageContenu(slug, { apercu });
  return { result, apercu: Boolean(apercu) };
}
