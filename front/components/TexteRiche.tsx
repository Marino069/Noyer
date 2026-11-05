import { Fragment, type ReactNode } from "react";
import type { BlocTexte, SegmentTexte } from "@/lib/api/types";
import styles from "./TexteRiche.module.css";

/** Chemin public interne ("/atelier") ou URL https : tout le reste (javascript:, data:…) est refusé. */
export function lienSur(lien: string, locale: string): string | null {
  if (lien.startsWith("//")) return null;
  if (lien.startsWith("/")) return `/${locale}${lien}`;
  try {
    return new URL(lien).protocol === "https:" ? lien : null;
  } catch {
    return null;
  }
}

function Segments({
  segments,
  locale,
}: {
  segments: SegmentTexte[];
  locale: string;
}) {
  return segments.map((s, i) => {
    let node: ReactNode = s.texte;
    if (s.gras) node = <strong>{node}</strong>;
    if (s.italique) node = <em>{node}</em>;
    const href = s.lien ? lienSur(s.lien, locale) : null;
    if (href) {
      const externe = href.startsWith("https:");
      node = (
        <a
          href={href}
          className={styles.lien}
          {...(externe && { rel: "noopener noreferrer" })}
        >
          {node}
        </a>
      );
    }
    return <Fragment key={i}>{node}</Fragment>;
  });
}

/**
 * Rend le texte riche du CMS en composants typographiques de la charte :
 * titres en Fraunces, corps en Hanken, citation en italique avec filet laiton.
 * Aucun HTML brut venant du CMS n'est injecté.
 */
export function TexteRiche({
  blocs,
  locale,
}: {
  blocs: BlocTexte[];
  locale: string;
}) {
  return (
    <div className={styles.texte}>
      {blocs.map((bloc, i) => {
        switch (bloc.type) {
          case "titre": {
            const Tag = bloc.niveau === 2 ? "h2" : "h3";
            return (
              <Tag
                key={i}
                className={bloc.niveau === 2 ? styles.titre2 : styles.titre3}
              >
                <Segments segments={bloc.segments} locale={locale} />
              </Tag>
            );
          }
          case "paragraphe":
            return (
              <p key={i} className={styles.paragraphe}>
                <Segments segments={bloc.segments} locale={locale} />
              </p>
            );
          case "citation":
            return (
              <blockquote key={i} className={styles.citation}>
                <p>
                  <Segments segments={bloc.segments} locale={locale} />
                </p>
                {bloc.auteur ? (
                  <cite className={styles.auteur}>{bloc.auteur}</cite>
                ) : null}
              </blockquote>
            );
          case "liste": {
            const Tag = bloc.ordonnee ? "ol" : "ul";
            return (
              <Tag key={i} className={styles.liste}>
                {bloc.items.map((item, j) => (
                  <li key={j}>
                    <Segments segments={item} locale={locale} />
                  </li>
                ))}
              </Tag>
            );
          }
          default:
            return null; // type de bloc inconnu (back plus récent que le front)
        }
      })}
    </div>
  );
}
