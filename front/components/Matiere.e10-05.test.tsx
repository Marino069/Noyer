/**
 * Tests indépendants du ticket E10-05 (#348), écrits à partir de ses critères
 * d'acceptation : trois gros plans numérotés I à III, légende en petites capitales,
 * loupe conservée, empilé sur mobile.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import frDict from "@/i18n/dictionaries/fr.json";
import { matiereAccueil } from "@/mocks/data";
import { Matiere } from "./Matiere";

const css = readFileSync(join(__dirname, "Matiere.module.css"), "utf8");
const props = frDict.home.matiere;

describe("E10-05 — Noyer & laiton : trois gros plans numérotés", () => {
  it("trois gros plans dans une liste ordonnée", () => {
    const { container } = render(
      <Matiere contenu={matiereAccueil} {...props} />,
    );
    expect(container.querySelectorAll("ol")).toHaveLength(1);
    expect(container.querySelectorAll("ol > li")).toHaveLength(3);
    expect(screen.getAllByRole("figure")).toHaveLength(3);
  });

  it("légendes numérotées en chiffres romains I, II, III dans l'ordre", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    const legendes = screen
      .getAllByRole("figure")
      .map((f) => f.querySelector("figcaption")?.textContent ?? "");
    expect(legendes[0]).toMatch(/^I · /);
    expect(legendes[1]).toMatch(/^II · /);
    expect(legendes[2]).toMatch(/^III · /);
  });

  it("le surtitre « La matière » est affiché", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    const occurrences = screen.getAllByText("La matière");
    expect(occurrences.some((el) => el.tagName === "P")).toBe(true);
  });

  it("la légende est en petites capitales espacées (majuscules + letter-spacing)", () => {
    expect(css).toMatch(
      /\.caption\s*\{[^}]*text-transform:\s*uppercase[^}]*\}/,
    );
    expect(css).toMatch(/\.caption\s*\{[^}]*letter-spacing:/);
  });

  it("la loupe (E9-03) est conservée : chaque figure reste focusable avec son image", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    for (const figure of screen.getAllByRole("figure")) {
      expect(figure).toHaveAttribute("tabindex", "0");
      expect(within(figure).getByRole("img")).toHaveAttribute("alt");
    }
  });

  it("nom latin en italique sur le premier gros plan uniquement", () => {
    render(<Matiere contenu={matiereAccueil} {...props} />);
    const [premier, ...autres] = screen.getAllByRole("figure");
    expect(within(premier).getByText(props.nomLatin).tagName).toBe("EM");
    for (const f of autres) {
      expect(within(f).queryByText(props.nomLatin)).toBeNull();
    }
  });
});

describe("E10-05 — Matière : empilé sur mobile", () => {
  it("une seule colonne par défaut, trois colonnes seulement dès 900 px", () => {
    const [mobile, ...reste] = css.split("@media (min-width: 900px)");
    expect(mobile).toMatch(
      /\.grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s*;/,
    );
    expect(mobile).not.toMatch(/repeat\(3/);
    expect(reste.join("")).toMatch(
      /\.grid\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/,
    );
  });
});

describe("E10-05 — Matière : reduced-motion", () => {
  it("le zoom du grain est désactivé avec prefers-reduced-motion: reduce", () => {
    const i = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(i).toBeGreaterThan(-1);
    const bloc = css.slice(i);
    expect(bloc).toMatch(/transition:\s*none/);
    expect(bloc).toMatch(/transform:\s*none/);
  });
});
