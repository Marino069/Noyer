import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { localePath } from "@/lib/routes";
import { Atelier } from "./Atelier";

const renderAtelier = () =>
  render(
    <Atelier
      href={localePath("fr", "atelier")}
      title={fr.home.atelier.title}
      text={fr.home.atelier.text}
      cta={fr.home.atelier.cta}
    />,
  );

// css: false dans Vitest : les styles se vérifient sur les feuilles source.
const css = readFileSync(join(__dirname, "Atelier.module.css"), "utf8");

describe("[E3-04] L'atelier : section en tone=dark", () => {
  it("rend une section en registre sombre", () => {
    const { container } = renderAtelier();
    expect(container.querySelector("section")).toHaveAttribute(
      "data-tone",
      "dark",
    );
  });

  it("est nommée par son titre h2", () => {
    renderAtelier();
    expect(
      screen.getByRole("heading", { level: 2, name: "L'atelier" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "L'atelier" }),
    ).toBeInTheDocument();
  });

  it("affiche le texte de storytelling", () => {
    renderAtelier();
    expect(screen.getByText(fr.home.atelier.text)).toBeVisible();
  });
});

describe("[E3-04] L'atelier : lien vers la page L'atelier", () => {
  it("contient un lien vers /atelier", () => {
    renderAtelier();
    expect(
      screen.getByRole("link", { name: fr.home.atelier.cta }),
    ).toHaveAttribute("href", "/fr/atelier");
  });
});

describe("[E3-04] L'atelier : laiton limité aux accents", () => {
  it("le filet laiton fait 1px et n'est pas un aplat", () => {
    expect(css).toMatch(
      /\.rule\s*\{[^}]*border-top:\s*1px solid var\(--brass\)/,
    );
    expect(css).toMatch(/\.rule\s*\{[^}]*height:\s*0/);
  });

  it("le soulignement du lien devient laiton au survol et au focus seulement", () => {
    expect(css).toMatch(/\.link\s*\{[^}]*text-decoration-color:\s*transparent/);
    expect(css).toMatch(
      /\.link:hover,\s*\.link:focus-visible\s*\{[^}]*text-decoration-color:\s*var\(--brass\)/,
    );
  });

  it("aucun fond ni texte laiton", () => {
    expect(css).not.toMatch(/background(-color)?:[^;]*brass/);
    expect(css).not.toMatch(/(^|[^-])color:\s*var\(--brass\)/m);
  });

  it("n'utilise aucune couleur littérale hors tokens", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|hsl)a?\(/);
  });
});
