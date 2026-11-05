import type { ReactNode } from "react";
import type { BlocTexte, TonSection } from "@/lib/api/types";
import { Section } from "./Section";
import { TexteRiche } from "./TexteRiche";

const TONS: Record<TonSection, "light" | "alt" | "dark"> = {
  clair: "light",
  alt: "alt",
  sombre: "dark",
};

type Groupe = { ton: TonSection; blocs: BlocTexte[] };

/** Les blocs « section » ouvrent leur propre registre ; les blocs voisins sans section restent en clair. */
function grouper(blocs: BlocTexte[]): Groupe[] {
  const groupes: Groupe[] = [];
  let courant: Groupe | null = null;
  for (const bloc of blocs) {
    if (bloc.type === "section") {
      groupes.push({ ton: bloc.ton, blocs: bloc.blocs });
      courant = null;
    } else {
      if (!courant) {
        courant = { ton: "clair", blocs: [] };
        groupes.push(courant);
      }
      courant.blocs.push(bloc);
    }
  }
  return groupes;
}

/**
 * Page éditoriale du CMS : sections successives (clair / alt / sombre) alternant texte et
 * photos documentaires. Le titre de page est rendu dans la première section.
 */
export function PageEditoriale({
  titre,
  blocs,
  locale,
  entete,
}: {
  titre: string;
  blocs: BlocTexte[];
  locale: string;
  entete?: ReactNode;
}) {
  const groupes = grouper(blocs);
  if (groupes.length === 0) groupes.push({ ton: "clair", blocs: [] });
  return (
    <>
      {groupes.map((g, i) => (
        <Section key={i} tone={TONS[g.ton] ?? "light"}>
          {i === 0 ? (
            <>
              {entete}
              <h1>{titre}</h1>
            </>
          ) : null}
          <TexteRiche blocs={g.blocs} locale={locale} />
        </Section>
      ))}
    </>
  );
}
