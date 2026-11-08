import Link from "next/link";
import { LampeGresillante } from "@/components/LampeGresillante";
import { Section } from "@/components/Section";
import fr from "@/i18n/dictionaries/fr.json";
import { localePath } from "@/lib/routes";

/** 404 dans le ton de la marque, avec des liens vers les deux gammes. */
export default function LocaleNotFound() {
  const t = fr.notFound;
  return (
    <main id="contenu" tabIndex={-1}>
      <Section aria-labelledby="404-titre">
        <h1 id="404-titre">{t.title}</h1>
        <p>{t.message}</p>
        <LampeGresillante
          messageGresille={t.lampe.gresille}
          messageAllumee={t.lampe.allumee}
          libelleAllumer={t.lampe.allumer}
          libelleEteindre={t.lampe.eteindre}
        />
        <nav aria-label={t.gammesLabel}>
          <ul>
            <li>
              <Link href={localePath("fr", "classic")}>{t.classic}</Link>
            </li>
            <li>
              <Link href={localePath("fr", "premium")}>{t.premium}</Link>
            </li>
            <li>
              <Link href="/fr">{t.home}</Link>
            </li>
          </ul>
        </nav>
      </Section>
    </main>
  );
}
