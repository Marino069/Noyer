// Tests indépendants du ticket E6-04 : un bloc par critère d'acceptation.
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  draft: { enable: vi.fn(), disable: vi.fn(), isEnabled: false },
  api: { pageContenu: vi.fn() },
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("next/headers", () => ({ draftMode: async () => hoisted.draft }));
vi.mock("next/navigation", () => ({ notFound: hoisted.notFound }));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import PageRoute from "@/app/[locale]/[slug]/page";
import { Footer } from "@/components/Footer";
import fr from "@/i18n/dictionaries/fr.json";
import { pagesContenu } from "@/mocks/data";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.draft.isEnabled = false;
});

const SLUGS = ["impressum", "cgv", "confidentialite"];

async function rendre(slug: string, locale = "fr") {
  return render(await PageRoute({ params: Promise.resolve({ locale, slug }) }));
}

describe("Critère 1 : trois pages gérées dans le back-office, liées depuis le footer", () => {
  it.each(SLUGS)(
    "la page %s est demandée à l'API (donc éditable) et rendue",
    async (slug) => {
      const page = pagesContenu[slug].contenu;
      hoisted.api.pageContenu.mockResolvedValue({ ok: true, data: page });
      await rendre(slug);
      expect(hoisted.api.pageContenu).toHaveBeenCalledWith(
        slug,
        expect.anything(),
      );
      expect(
        screen.getByRole("heading", { level: 1, name: page.titre }),
      ).toBeInTheDocument();
    },
  );

  it("un texte modifié dans le back-office apparaît tel quel", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: {
        slug: "cgv",
        titre: "CGV révisées",
        description: "d",
        mis_a_jour: "2027-02-03",
        blocs: [{ type: "paragraphe", segments: [{ texte: "Clause neuve." }] }],
      },
    });
    await rendre("cgv");
    expect(screen.getByText("Clause neuve.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "CGV révisées" }),
    ).toBeInTheDocument();
  });

  it("une page absente du back-office donne un 404", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "introuvable" },
    });
    await expect(rendre("impressum")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("le footer lie les trois pages", () => {
    render(
      <Footer locale="fr" dictionary={fr.footer} newsletter={fr.newsletter} />,
    );
    const hrefs = ["Impressum", "CGV", "Confidentialité"].map((n) =>
      screen.getByRole("link", { name: n }).getAttribute("href"),
    );
    expect(hrefs).toEqual(["/fr/impressum", "/fr/cgv", "/fr/confidentialite"]);
  });

  it("les liens du footer correspondent aux slugs servis par les mocks", () => {
    render(
      <Footer locale="fr" dictionary={fr.footer} newsletter={fr.newsletter} />,
    );
    for (const slug of SLUGS) {
      const lien = screen
        .getAllByRole("link")
        .find((a) => a.getAttribute("href") === `/fr/${slug}`);
      expect(lien).toBeDefined();
      expect(pagesContenu[slug]).toBeDefined();
    }
  });
});

describe("Critère 2 : date de dernière mise à jour affichée", () => {
  it.each(SLUGS)("la page %s affiche sa date sous le titre", async (slug) => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: { ...pagesContenu[slug].contenu, mis_a_jour: "2026-03-07" },
    });
    await rendre(slug);
    const date = screen.getByText("Dernière mise à jour : 7 mars 2026");
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(
      h1.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("la date vient de l'API : une autre date change l'affichage", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: { ...pagesContenu.cgv.contenu, mis_a_jour: "2025-12-31" },
    });
    await rendre("cgv");
    expect(
      screen.getByText("Dernière mise à jour : 31 décembre 2025"),
    ).toBeInTheDocument();
  });

  it("le 1er du mois s'écrit « 1 » sans zéro", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: { ...pagesContenu.impressum.contenu, mis_a_jour: "2026-01-01" },
    });
    await rendre("impressum");
    expect(
      screen.getByText("Dernière mise à jour : 1 janvier 2026"),
    ).toBeInTheDocument();
  });

  it("les données de mock des trois pages légales contiennent une date valide", () => {
    for (const slug of SLUGS) {
      expect(pagesContenu[slug].contenu.mis_a_jour).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
    }
  });
});

describe("Contenu de l'Impressum (brief §07, contexte du ticket)", () => {
  it("le mock mentionne adresse (Genève) et numéro IDE", () => {
    const texte = JSON.stringify(pagesContenu.impressum.contenu.blocs);
    expect(texte).toMatch(/Genève/);
    expect(texte).toMatch(/IDE/);
  });
});
