import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LocaleError from "@/app/[locale]/error";
import LocaleNotFound from "@/app/[locale]/not-found";

describe("Critère 1 : 404 dans le ton de la marque, avec liens vers les gammes", () => {
  it("affiche un titre de marque et des liens vers Classic et Premium", () => {
    render(<LocaleNotFound />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /lampe/i,
    );
    expect(
      screen.getByRole("link", { name: /Classic/ }).getAttribute("href"),
    ).toBe("/fr/produits/classic");
    expect(
      screen.getByRole("link", { name: /Premium/ }).getAttribute("href"),
    ).toBe("/fr/produits/premium");
  });
});

describe("Critère 2 : erreur générique sans détail technique", () => {
  it("n'expose ni message, ni stack, ni digest", () => {
    const { container } = render(<LocaleError reset={() => {}} />);
    expect(container.textContent).not.toMatch(/SQL|boom|3306|digest|Error:/);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });
});
