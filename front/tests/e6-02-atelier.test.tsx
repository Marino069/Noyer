import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageEditoriale } from "@/components/PageEditoriale";
import { pagesContenu } from "@/mocks/data";

describe("Page L'atelier (E6-02)", () => {
  const page = pagesContenu.atelier.contenu;

  it("alterne texte et photos documentaires avec alt et légende", () => {
    const { container } = render(
      <PageEditoriale titre={page.titre} blocs={page.blocs} locale="fr" />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "L'atelier" }),
    ).toBeInTheDocument();
    const figures = container.querySelectorAll("figure");
    expect(figures.length).toBeGreaterThanOrEqual(2);
    figures.forEach((f) =>
      expect(f.querySelector("img")?.getAttribute("alt")).toBeTruthy(),
    );
    expect(screen.getByText(/L'huilage/)).toBeInTheDocument();
  });

  it("contient au moins une section en registre sombre", () => {
    const { container } = render(
      <PageEditoriale titre={page.titre} blocs={page.blocs} locale="fr" />,
    );
    const sombre = container.querySelector('[data-tone="dark"]');
    expect(sombre).not.toBeNull();
    expect(sombre?.querySelector("blockquote")).not.toBeNull();
    expect(container.querySelector('[data-tone="light"]')).not.toBeNull();
  });

  it("tout le contenu vient de l'API : une autre page change le rendu", () => {
    render(
      <PageEditoriale
        titre="Notre histoire"
        locale="fr"
        blocs={[
          {
            type: "section",
            ton: "alt",
            blocs: [
              { type: "paragraphe", segments: [{ texte: "Depuis 2020." }] },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("Depuis 2020.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Notre histoire" }),
    ).toBeInTheDocument();
  });
});
