import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Critère #224 : chaque écart du rapport a-11y renvoie à un ticket réel,
// renseigné dans la colonne « Suite ».
const rapport = readFileSync("../docs/a11y-audit.md", "utf8");
const lignes = rapport.split("\n").filter((l) => /^\|\s*\d+\s*\|/.test(l));

describe("[E7-02 / bug 224] Rapport d'écarts : tickets associés", () => {
  it("le rapport liste les 4 écarts", () => {
    expect(lignes).toHaveLength(4);
  });

  it("la colonne « Suite » de chaque écart contient un numéro de ticket", () => {
    for (const l of lignes) {
      const cellules = l.split("|").map((c) => c.trim());
      const suite = cellules[cellules.length - 2];
      expect(suite, l).toMatch(/#\d+/);
    }
  });

  it("chaque écart a son propre ticket (pas de numéro partagé)", () => {
    const numeros = lignes.map((l) => {
      const cellules = l.split("|").map((c) => c.trim());
      return cellules[cellules.length - 2].match(/#(\d+)/)![1];
    });
    expect(new Set(numeros).size).toBe(numeros.length);
  });

  it("plus aucune mention « Ticket à créer » ni « à ouvrir par le responsable »", () => {
    expect(rapport).not.toMatch(/ticket à créer/i);
    expect(rapport).not.toMatch(/à ouvrir par le responsable/i);
  });
});
