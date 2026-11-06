import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { Atelier } from "@/components/Atelier";
import { Contact } from "@/components/Contact";
import { DeuxGammes } from "@/components/DeuxGammes";
import { Hero } from "@/components/Hero";
import { Matiere } from "@/components/Matiere";
import { PageEditoriale } from "@/components/PageEditoriale";
import { Selection } from "@/components/Selection";
import fr from "@/i18n/dictionaries/fr.json";
import { formatDateLongue } from "@/lib/format";
import {
  heroAccueil,
  matiereAccueil,
  pagesContenu,
  produits,
} from "@/mocks/data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fr",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

/** Violations axe critiques ou sérieuses (WCAG 2.x A/AA). */
async function violations(container: HTMLElement) {
  const res = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    // jsdom ne calcule pas les couleurs : contrastes vérifiés dans e7-02 (tokens).
    rules: { "color-contrast": { enabled: false } },
  });
  return res.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
}

describe("E7-08 · axe sur les pages de contenu", () => {
  it("accueil", async () => {
    const classic = produits.find((p) => p.gamme === "Classic")!;
    const premium = produits.find(
      (p) => p.gamme === "Premium" && p.modele === classic.modele,
    )!;
    const { container } = render(
      <main id="contenu">
        <Hero contenu={heroAccueil} ctaHref="/fr/produits/classic" />
        <Matiere contenu={matiereAccueil} {...fr.home.matiere} />
        <DeuxGammes
          classic={classic}
          premium={premium}
          locale="fr"
          title={fr.home.gammes.title}
          intro={fr.home.gammes.intro}
        />
        <Selection
          produits={{
            ok: true,
            data: {
              count: produits.length,
              next: null,
              previous: null,
              results: produits,
            },
          }}
          locale="fr"
          title={fr.home.selection.title}
          empty={fr.home.selection.empty}
          errorTitle={fr.home.selection.errorTitle}
          errorMessage={fr.home.selection.errorMessage}
        />
        <Atelier
          href="/fr/atelier"
          title={fr.home.atelier.title}
          text={fr.home.atelier.text}
          cta={fr.home.atelier.cta}
        />
      </main>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it.each(["impressum", "cgv", "confidentialite"])(
    "page légale %s",
    async (slug) => {
      const page = pagesContenu[slug].contenu;
      const { container } = render(
        <main id="contenu">
          <PageEditoriale
            titre={page.titre}
            blocs={page.blocs}
            locale="fr"
            miseAJour={`${fr.pageContenu.miseAJour} ${formatDateLongue(page.mis_a_jour!, "fr")}`}
          />
        </main>,
      );
      expect(await violations(container)).toEqual([]);
    },
  );

  it("contact", async () => {
    const { container } = render(
      <main id="contenu">
        <Contact dictionary={fr.contact} />
      </main>,
    );
    expect(await violations(container)).toEqual([]);
  });
});
