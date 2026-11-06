import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DesignSystemPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      panier: vi.fn(() => new Promise(() => {})),
    },
  };
});

// Critère E8-02 : « Chaque composant a ses variantes sur app/[locale]/design-system »
async function renderPage() {
  const ui = await DesignSystemPage({
    params: Promise.resolve({ locale: "fr" }),
  });
  return render(ui);
}

describe("[E8-02] page design-system : éléments graphiques d'atelier", () => {
  it("montre le BandeauAtelier", async () => {
    await renderPage();
    expect(screen.getByText(/Retrait à l'atelier/)).toBeInTheDocument();
  });

  it("montre les variantes du Surtitre (simple et laiton)", async () => {
    await renderPage();
    expect(screen.getByText("Avec filet laiton").className).toMatch(/accent/);
    const simple = screen.getByText(/Carnet d'atelier — N° 01/);
    expect(simple.className).not.toMatch(/accent/);
  });

  it("montre le Filet simple et laiton", async () => {
    const { container } = await renderPage();
    const filets = Array.from(container.querySelectorAll("hr")).filter((h) =>
      /filet/i.test(h.className),
    );
    expect(filets.some((f) => /accent/.test(f.className))).toBe(true);
    expect(filets.some((f) => !/accent/.test(f.className))).toBe(true);
  });

  it("montre les Cotes horizontale, verticale et positionnée, toutes aria-hidden", async () => {
    const { container } = await renderPage();
    const cotes = Array.from(container.querySelectorAll("span")).filter((s) =>
      /cote/.test(s.className),
    );
    expect(cotes.length).toBeGreaterThanOrEqual(3);
    cotes.forEach((c) => expect(c).toHaveAttribute("aria-hidden", "true"));
    expect(cotes.some((c) => /vertical/.test(c.className))).toBe(true);
    expect(cotes.some((c) => /horizontal/.test(c.className))).toBe(true);
    expect(cotes.some((c) => /positioned/.test(c.className))).toBe(true);
  });

  it("montre les LegendeFigure (avec/sans titre, sur image) lisibles", async () => {
    await renderPage();
    expect(screen.getByText("FIG. 01 — Le grain").className).toMatch(
      /surImage/,
    );
    expect(screen.getByText("FIG. 02").tagName).toBe("FIGCAPTION");
    expect(screen.getByText("FIG. 03 — La patine")).toBeInTheDocument();
  });

  it("montre la PlaqueGravee complète et minimale", async () => {
    await renderPage();
    expect(screen.getAllByText("Votre pièce").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/N° 07/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/N° 12/).length).toBeGreaterThan(0);
  });
});
