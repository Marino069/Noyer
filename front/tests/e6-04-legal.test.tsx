import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/Footer";
import { PageEditoriale } from "@/components/PageEditoriale";
import fr from "@/i18n/dictionaries/fr.json";
import { formatDateLongue } from "@/lib/format";
import { pagesContenu } from "@/mocks/data";

describe("Pages légales (E6-04)", () => {
  it.each(["impressum", "cgv", "confidentialite"])(
    "la page %s vient de l'API avec une date de mise à jour",
    (slug) => {
      const page = pagesContenu[slug].contenu;
      expect(page.mis_a_jour).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      render(
        <PageEditoriale
          titre={page.titre}
          blocs={page.blocs}
          locale="fr"
          miseAJour={`${fr.pageContenu.miseAJour} ${formatDateLongue(page.mis_a_jour!, "fr")}`}
        />,
      );
      expect(
        screen.getByRole("heading", { level: 1, name: page.titre }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Dernière mise à jour : 1 novembre 2026"),
      ).toBeInTheDocument();
    },
  );

  it("le pied de page lie les trois pages", () => {
    render(
      <Footer locale="fr" dictionary={fr.footer} newsletter={fr.newsletter} />,
    );
    const hrefs = ["Impressum", "CGV", "Confidentialité"].map((nom) =>
      screen.getByRole("link", { name: nom }).getAttribute("href"),
    );
    expect(hrefs).toEqual(["/fr/impressum", "/fr/cgv", "/fr/confidentialite"]);
  });

  it("formate la date en toutes lettres", () => {
    expect(formatDateLongue("2026-11-01", "fr")).toBe("1 novembre 2026");
  });
});
