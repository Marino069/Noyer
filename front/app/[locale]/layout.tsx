import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AimantBoutons } from "@/components/AimantBoutons";
import { CurseurAtelier } from "@/components/CurseurAtelier";
import { BandeauDemo } from "@/components/BandeauDemo";
import { ConsentCookies } from "@/components/ConsentCookies";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RevealObserver } from "@/components/RevealObserver";
import { TransitionsPages } from "@/components/TransitionsPages";
import { RevelationTitres } from "@/components/RevelationTitres";
import { MocksProvider } from "@/components/MocksProvider";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { API_MOCKS, SITE_URL, TRACKER_SRC } from "@/lib/env";
import "@/styles/globals.css";

// Polices hébergées dans le dépôt (licence OFL) : le build ne dépend plus de Google.
const fraunces = localFont({
  src: [
    {
      path: "../fonts/fraunces-latin-wght-normal.woff2",
      weight: "300 600",
      style: "normal",
    },
    {
      path: "../fonts/fraunces-latin-wght-italic.woff2",
      weight: "300 600",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-fraunces",
});

const hankenGrotesk = localFont({
  src: [
    {
      path: "../fonts/hanken-grotesk-latin-wght-normal.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-hanken",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { meta } = await getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: meta.title,
    description: meta.description,
    // Site de démonstration : jamais indexé.
    ...(API_MOCKS && { robots: { index: false, follow: false } }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  // Démo : les données fictives (MSW) ne sont servies qu'à l'exécution, pas pendant
  // `next build`. On rend donc chaque page à la demande au lieu de la pré-générer.
  if (API_MOCKS) await connection();
  const dictionary = await getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${hankenGrotesk.variable}`}
    >
      <body>
        <a href="#contenu" className="skip-link">
          {dictionary.a11y.skipToContent}
        </a>
        {API_MOCKS && <BandeauDemo texte={dictionary.demo.bandeau} />}
        <Header locale={locale} dictionary={dictionary.header} />
        <LanguageSwitcher
          current={locale}
          dictionary={dictionary.languageSwitcher}
        />
        <RevealObserver />
        <RevelationTitres />
        <TransitionsPages />
        <AimantBoutons />
        <CurseurAtelier libelleVoir={dictionary.curseur.voir} />
        <MocksProvider>{children}</MocksProvider>
        <Footer
          locale={locale}
          dictionary={dictionary.footer}
          newsletter={dictionary.newsletter}
          consentLabel={TRACKER_SRC ? dictionary.consent.footerLink : undefined}
        />
        <ConsentCookies
          dictionary={dictionary.consent}
          trackerSrc={TRACKER_SRC}
        />
      </body>
    </html>
  );
}
