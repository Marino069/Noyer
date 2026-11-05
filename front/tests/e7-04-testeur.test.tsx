import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LocaleError from "@/app/[locale]/error";
import LocaleNotFound from "@/app/[locale]/not-found";

// Tests écrits à partir des critères d'acceptation de l'issue #50 [E7-04].

describe("E7-04 critère 1 : 404 dans le ton de la marque, avec liens vers les gammes", () => {
  it("expose un unique titre h1 et un message d'explication", () => {
    render(<LocaleNotFound />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1 }).textContent?.trim(),
    ).not.toBe("");
    expect(screen.getByText(/n'existe pas/i)).toBeTruthy();
  });

  it("ne ressemble pas à une 404 technique générique", () => {
    const { container } = render(<LocaleNotFound />);
    expect(container.textContent).not.toMatch(
      /\b404\b|not found|could not be found/i,
    );
  });

  it("propose les liens vers les gammes Classic et Premium", () => {
    render(<LocaleNotFound />);
    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/fr/produits/classic");
    expect(hrefs).toContain("/fr/produits/premium");
  });

  it("offre un chemin de retour vers l'accueil", () => {
    render(<LocaleNotFound />);
    expect(
      screen.getAllByRole("link").some((l) => l.getAttribute("href") === "/fr"),
    ).toBe(true);
  });

  it("n'a pas de lien vide ou sans destination", () => {
    render(<LocaleNotFound />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent?.trim()).not.toBe("");
      expect(link.getAttribute("href")).toMatch(/^\//);
    }
  });
});

describe("E7-04 critère 2 : page d'erreur générique sans détail technique exposé", () => {
  const secret = Object.assign(
    new Error("SQLSTATE[HY000] connexion refusée sur db:3306"),
    { digest: "dig-1234567890" },
  );

  it("n'affiche ni message, ni stack, ni digest de l'erreur transmise par Next", () => {
    const props = { error: secret, reset: () => {} } as unknown as Parameters<
      typeof LocaleError
    >[0];
    const { container } = render(<LocaleError {...props} />);
    const text = container.textContent ?? "";
    expect(text).not.toContain(secret.message);
    expect(text).not.toContain("SQLSTATE");
    expect(text).not.toContain("3306");
    expect(text).not.toContain("dig-1234567890");
    expect(text).not.toMatch(/at .+\(.+:\d+:\d+\)|Error:|stack/i);
  });

  it("affiche un message générique en français et une action de nouvel essai", () => {
    let called = 0;
    render(<LocaleError reset={() => void called++} />);
    expect(screen.getByRole("alert").textContent).toMatch(/erreur|n'a pas pu/i);
    screen.getByRole("button", { name: /réessayer/i }).click();
    expect(called).toBe(1);
  });
});
