import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProduitsListe } from "@/components/ProduitsListe";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { api, type Gamme } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    gamme?: string | string[];
    page?: string | string[];
  }>;
};

const premier = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

function parseGamme(v: string | string[] | undefined): Gamme | undefined {
  const g = premier(v);
  return g === "Classic" || g === "Premium" ? g : undefined;
}

function parsePage(v: string | string[] | undefined): number {
  const n = Number(premier(v));
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { catalogue } = await getDictionary(locale);
  return {
    title: catalogue.title,
    alternates: { canonical: `/${locale}/produits` },
  };
}

// Rendu serveur à chaque requête : l'état (gamme, page) vit dans l'URL.
export default async function ProduitsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const sp = await searchParams;
  const gamme = parseGamme(sp.gamme);
  const page = parsePage(sp.page);
  const { catalogue } = await getDictionary(locale);

  const produits = await api.produits({
    gamme,
    page: page > 1 ? page : undefined,
  });

  return (
    <main id="contenu" tabIndex={-1}>
      <ProduitsListe
        produits={produits}
        locale={locale}
        gamme={gamme}
        page={page}
        textes={catalogue}
      />
    </main>
  );
}
