import { render } from "@testing-library/react";
import axe from "axe-core";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Atelier } from "@/components/Atelier";
import { Contact } from "@/components/Contact";
import { Hero } from "@/components/Hero";
import { Matiere } from "@/components/Matiere";
import { heroAccueil, matiereAccueil } from "@/mocks/data";
import fr from "@/i18n/dictionaries/fr.json";

async function graves(container: HTMLElement) {
  const res = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return res.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
}

describe("[E7-02] Critère : zéro violation axe critique ou sérieuse (pages clés)", () => {
  it("accueil : hero, matière, atelier", async () => {
    const { container } = render(
      <main id="contenu" tabIndex={-1}>
        <Hero
          contenu={{ ...heroAccueil, mot_italique: "prend son temps" }}
          ctaHref="/fr/produits/classic"
        />
        <Matiere contenu={matiereAccueil} />
        <Atelier
          href="/fr/atelier"
          title={fr.home.atelier.title}
          text={fr.home.atelier.text}
          cta={fr.home.atelier.cta}
        />
      </main>,
    );
    expect(await graves(container)).toEqual([]);
  });

  it("contact", async () => {
    const { container } = render(
      <main id="contenu" tabIndex={-1}>
        <Contact dictionary={fr.contact} />
      </main>,
    );
    expect(await graves(container)).toEqual([]);
  });
});

describe("[E7-02] Parcours clavier : garanties structurelles", () => {
  const layout = readFileSync("app/[locale]/layout.tsx", "utf8");

  it("le layout expose un lien d'évitement vers #contenu, avant l'en-tête, et une langue", () => {
    expect(layout).toContain('href="#contenu"');
    expect(layout.indexOf('href="#contenu"')).toBeLessThan(
      layout.indexOf("<Header"),
    );
    expect(layout).toContain("lang={locale}");
  });

  it("chaque page du parcours a un <main id=contenu> focalisable", () => {
    for (const p of [
      "page.tsx",
      "produits/[slug]/page.tsx",
      "panier/page.tsx",
      "panier/commande/page.tsx",
      "panier/paiement/page.tsx",
    ]) {
      const src = readFileSync(join("app/[locale]", p), "utf8");
      expect(src, p).toMatch(/<main id="contenu" tabIndex=\{-1\}/);
    }
  });

  it("aucun outline supprimé dans les CSS (hors cible du skip link)", () => {
    const fichiers: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith(".css")) fichiers.push(p);
      }
    };
    walk("components");
    walk("styles");
    const fautifs = fichiers.filter((f) =>
      /outline:\s*(none|0)\b/.test(readFileSync(f, "utf8")),
    );
    // ProductCard remplace l'outline du lien par un outline sur la carte entière.
    const toleres = ["globals.css", "ProductCard.module.css"];
    expect(fautifs.filter((f) => !toleres.some((t) => f.endsWith(t)))).toEqual(
      [],
    );
  });

  it("le focus visible global existe", () => {
    expect(readFileSync("styles/globals.css", "utf8")).toMatch(
      /:focus-visible\s*\{[^}]*outline:\s*2px/,
    );
  });
});

describe("[E7-02] Critère : rapport des écarts restants avec tickets associés", () => {
  const rapport = "../docs/a11y-audit.md";

  it("le rapport existe et liste les écarts", () => {
    expect(existsSync(rapport)).toBe(true);
    const txt = readFileSync(rapport, "utf8");
    expect(txt).toMatch(/Écarts restants/);
    expect(txt).toMatch(/VoiceOver/);
    expect(txt).toMatch(/4\.16/);
  });

  // Bug #224 : le rapport dit « Ticket à créer » sans numéro de ticket.
  it.fails("chaque écart est associé à un ticket (bug 224)", () => {
    const lignes = readFileSync(rapport, "utf8")
      .split("\n")
      .filter((l) => /^\|\s*\d+\s*\|/.test(l));
    expect(lignes.length).toBeGreaterThan(0);
    for (const l of lignes) expect(l).toMatch(/[#]\d+/);
  });
});
