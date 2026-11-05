import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Contact } from "@/components/Contact";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const { contact } = await getDictionary(locale);
  return {
    title: contact.meta.title,
    description: contact.meta.description,
    alternates: { canonical: `/${locale}/contact` },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const { contact } = await getDictionary(locale);
  return (
    <main id="contenu" tabIndex={-1}>
      <Contact dictionary={contact} />
    </main>
  );
}
