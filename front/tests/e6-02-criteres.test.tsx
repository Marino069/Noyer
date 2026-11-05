// Tests indépendants du ticket E6-02 : un bloc par critère d'acceptation.
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
import { PageEditoriale } from "@/components/PageEditoriale";
import { pagesContenu } from "@/mocks/data";
import type { BlocTexte, PageContenu } from "@/lib/api/types";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.draft.isEnabled = false;
});

type BlocImage = Extract<BlocTexte, { type: "image" }>;
const modele = pagesContenu.atelier.contenu.blocs.find(
  (b): b is BlocImage => b.type === "image",
)!;

const para = (texte: string): BlocTexte => ({
  type: "paragraphe",
  segments: [{ texte }],
});
const photo = (alt: string, legende?: string): BlocTexte => ({
  type: "image",
  image: { ...modele.image, alt },
  legende,
});

describe("Critère 1 : mise en page alternant texte et photos documentaires", () => {
  const blocs: BlocTexte[] = [
    para("Texte A"),
    photo("Photo une", "Légende une"),
    para("Texte B"),
    photo("Photo deux"),
  ];

  it("rend texte et photos dans l'ordre de l'API", () => {
    const { container } = render(
      <PageEditoriale titre="T" blocs={blocs} locale="fr" />,
    );
    const ordre = Array.from(container.querySelectorAll("p, figure")).map(
      (e) => (e.tagName === "FIGURE" ? "photo" : "texte"),
    );
    expect(ordre).toEqual(["texte", "photo", "texte", "photo"]);
  });

  it("chaque photo a un texte alternatif et la légende est facultative", () => {
    const { container } = render(
      <PageEditoriale titre="T" blocs={blocs} locale="fr" />,
    );
    expect(screen.getByAltText("Photo une")).toBeInTheDocument();
    expect(screen.getByAltText("Photo deux")).toBeInTheDocument();
    expect(screen.getByText("Légende une").tagName).toBe("FIGCAPTION");
    expect(container.querySelectorAll("figcaption")).toHaveLength(1);
  });

  it("garde un seul h1, le titre de la page", () => {
    render(<PageEditoriale titre="L'atelier" blocs={blocs} locale="fr" />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("toutes les photos sont dans une section", () => {
    const { container } = render(
      <PageEditoriale titre="T" blocs={blocs} locale="fr" />,
    );
    container
      .querySelectorAll("img")
      .forEach((i) => expect(i.closest("section")).not.toBeNull());
  });
});

describe("Critère 2 : au moins une section en registre sombre", () => {
  it("le ton « sombre » donne une section data-tone=dark contenant ses blocs", () => {
    const { container } = render(
      <PageEditoriale
        titre="T"
        locale="fr"
        blocs={[
          para("Clair"),
          { type: "section", ton: "sombre", blocs: [para("Fort")] },
          { type: "section", ton: "alt", blocs: [para("Alterné")] },
        ]}
      />,
    );
    const tons = Array.from(container.querySelectorAll("section")).map((s) =>
      s.getAttribute("data-tone"),
    );
    expect(tons).toEqual(["light", "dark", "alt"]);
    const sombre = container.querySelector('[data-tone="dark"]');
    expect(sombre?.textContent).toContain("Fort");
    expect(sombre?.textContent).not.toContain("Clair");
  });

  it("la page atelier du mock comporte une section sombre", () => {
    const { container } = render(
      <PageEditoriale
        titre="L'atelier"
        locale="fr"
        blocs={pagesContenu.atelier.contenu.blocs}
      />,
    );
    expect(container.querySelector('[data-tone="dark"]')).not.toBeNull();
  });

  it("un ton inconnu ne fait pas planter la page", () => {
    const { container } = render(
      <PageEditoriale
        titre="T"
        locale="fr"
        blocs={
          [
            { type: "section", ton: "fluo", blocs: [para("x")] },
          ] as unknown as BlocTexte[]
        }
      />,
    );
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("une page sans bloc affiche quand même son titre", () => {
    render(<PageEditoriale titre="Vide" blocs={[]} locale="fr" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Vide" }),
    ).toBeInTheDocument();
  });
});

describe("Critère 3 : contenu entièrement géré dans le back-office", () => {
  const page = (slug: string, titre: string, blocs: BlocTexte[]): PageContenu =>
    ({ slug, titre, description: "d", blocs }) as PageContenu;

  it("la route rend ce que l'API renvoie, pour n'importe quel slug", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: page("notre-histoire", "Notre histoire", [
        para("Fondée en 1987 par Zoé."),
        { type: "section", ton: "sombre", blocs: [para("Ça, c'est sombre.")] },
        photo("Portrait inventé"),
      ]),
    });
    const { container } = render(
      await PageRoute({
        params: Promise.resolve({ locale: "fr", slug: "notre-histoire" }),
      }),
    );
    expect(hoisted.api.pageContenu).toHaveBeenCalledWith(
      "notre-histoire",
      expect.anything(),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Notre histoire" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fondée en 1987 par Zoé.")).toBeInTheDocument();
    expect(screen.getByAltText("Portrait inventé")).toBeInTheDocument();
    expect(container.querySelector('[data-tone="dark"]')).not.toBeNull();
  });

  it("le front n'ajoute aucun texte : seuls le titre et les blocs de l'API apparaissent", async () => {
    hoisted.api.pageContenu.mockResolvedValue({
      ok: true,
      data: page("x", "Titre X", [para("Corps X")]),
    });
    const { container } = render(
      await PageRoute({
        params: Promise.resolve({ locale: "fr", slug: "x" }),
      }),
    );
    expect(container.textContent).toBe("Titre XCorps X");
  });

  it("changer le contenu de l'API change le rendu", () => {
    const { container, rerender } = render(
      <PageEditoriale titre="A" blocs={[para("avant")]} locale="fr" />,
    );
    expect(container.textContent).toContain("avant");
    rerender(<PageEditoriale titre="B" blocs={[para("après")]} locale="fr" />);
    expect(container.textContent).toContain("après");
    expect(container.textContent).not.toContain("avant");
  });
});
