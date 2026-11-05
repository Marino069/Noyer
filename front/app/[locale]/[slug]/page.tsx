import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageEditoriale } from "@/components/PageEditoriale";
import { hasLocale } from "@/i18n/config";
import { chargerPageContenu } from "@/lib/contenu";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const { result, apercu } = await chargerPageContenu(slug);
  if (!result.ok) return {};
  return {
    title: result.data.titre,
    description: result.data.description,
    alternates: { canonical: `/${locale}/${slug}` },
    // Un brouillon n'est jamais indexé.
    ...(apercu && { robots: { index: false, follow: false } }),
  };
}

export default async function PageContenuRoute({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const { result, apercu } = await chargerPageContenu(slug);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    throw new Error(result.error.message);
  }
  const page = result.data;

  return (
    <main id="contenu" tabIndex={-1}>
      <PageEditoriale
        titre={page.titre}
        blocs={page.blocs}
        locale={locale}
        entete={
          apercu ? (
            <form role="status" action="/api/apercu" method="get">
              Aperçu du brouillon —{" "}
              <input type="hidden" name="quitter" value="1" />
              <button type="submit">quitter</button>
            </form>
          ) : null
        }
      />
    </main>
  );
}
