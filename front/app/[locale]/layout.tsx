import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MocksProvider } from "@/components/MocksProvider";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
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
  return { title: meta.title, description: meta.description };
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
        <LanguageSwitcher
          current={locale}
          dictionary={dictionary.languageSwitcher}
        />
        <MocksProvider>{children}</MocksProvider>
      </body>
    </html>
  );
}
