import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Critères du bug #228 : polices hébergées dans le dépôt, plus de next/font/google.
const ROOT = resolve(__dirname, "..");
const IGNORES = new Set(["node_modules", ".next", "coverage", "tests"]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    if (IGNORES.has(nom)) return [];
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return sources(chemin);
    return /\.(tsx?|mjs|mts|js|jsx|css)$/.test(nom) ? [chemin] : [];
  });
}

const layout = readFileSync(join(ROOT, "app/[locale]/layout.tsx"), "utf8");

describe("Bug 228 : polices hébergées", () => {
  it("n'importe plus next/font/google nulle part dans front/", () => {
    const fautifs = sources(ROOT).filter((f) =>
      readFileSync(f, "utf8").includes("next/font/google"),
    );
    expect(fautifs).toEqual([]);
  });

  it("ne référence aucune URL Google Fonts", () => {
    const fautifs = sources(ROOT).filter((f) =>
      /fonts\.(googleapis|gstatic)\.com/.test(readFileSync(f, "utf8")),
    );
    expect(fautifs).toEqual([]);
  });

  it("charge les polices avec next/font/local", () => {
    expect(layout).toMatch(/from "next\/font\/local"/);
  });

  it("garde les mêmes variables CSS et display: swap", () => {
    expect(layout).toContain('variable: "--font-fraunces"');
    expect(layout).toContain('variable: "--font-hanken"');
    expect(layout.match(/display: "swap"/g)).toHaveLength(2);
  });

  it("garde les mêmes graisses (Fraunces 300-600 + italique, Hanken 400-700)", () => {
    expect(layout).toContain('weight: "300 600"');
    expect(layout).toContain('style: "italic"');
    expect(layout).toContain('weight: "400 700"');
  });

  it("applique les deux variables sur <html>", () => {
    expect(layout).toMatch(/fraunces\.variable[\s\S]*hankenGrotesk\.variable/);
  });

  it("chaque fichier référencé existe et est un vrai woff2", () => {
    const chemins = [...layout.matchAll(/path: "(\.\.\/fonts\/[^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(chemins).toHaveLength(3);
    for (const rel of chemins) {
      const fichier = join(ROOT, "app/[locale]", rel);
      expect(existsSync(fichier), rel).toBe(true);
      expect(rel.endsWith(".woff2")).toBe(true);
      const octets = readFileSync(fichier);
      expect(octets.subarray(0, 4).toString("latin1"), rel).toBe("wOF2");
      expect(octets.length).toBeGreaterThan(1000);
    }
  });

  it("fournit les licences OFL des polices", () => {
    for (const f of ["LICENSE-Fraunces.txt", "LICENSE-HankenGrotesk.txt"]) {
      expect(readFileSync(join(ROOT, "app/fonts", f), "utf8")).toMatch(
        /SIL OPEN FONT LICENSE/i,
      );
    }
  });
});
