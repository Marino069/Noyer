import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { ConsentCookies } from "@/components/ConsentCookies";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MocksProvider } from "@/components/MocksProvider";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { SITE_URL, TRACKER_SRC } from "@/lib/env";
import "@/styles/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        <Header locale={locale} dictionary={dictionary.header} />
        <LanguageSwitcher
          current={locale}
          dictionary={dictionary.languageSwitcher}
        />
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
