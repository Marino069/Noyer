// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const front = resolve(import.meta.dirname, "..");

function testFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name.startsWith(".")) return [];
    const p = join(dir, e.name);
    if (e.isDirectory()) return testFiles(p);
    return /\.test\.tsx?$/.test(e.name) && p !== import.meta.filename
      ? [p]
      : [];
  });
}

// Fichiers dont le vi.mock("@/lib/api") n'utilise pas importOriginal.
function filesReplacingWholeApiModule(): string[] {
  return testFiles(front)
    .filter((f) => {
      const src = readFileSync(f, "utf8");
      const m = /vi\.mock\(\s*["']@\/lib\/api["']\s*,([\s\S]*?)\);\s*\n/.exec(
        src,
      );
      return m !== null && !m[1].includes("importOriginal");
    })
    .map((f) => relative(front, f));
}

describe("[B-129] Tests de la homepage : ne mocker que les fonctions vérifiées", () => {
  it("page.test.tsx surcharge l'API via importOriginal et mocke les trois fonctions de la homepage", () => {
    const src = readFileSync(join(front, "app/[locale]/page.test.tsx"), "utf8");
    expect(src).toMatch(
      /vi\.mock\(\s*["']@\/lib\/api["']\s*,\s*async\s*\(\s*importOriginal/,
    );
    expect(src).toContain("...original");
    for (const fn of ["heroAccueil", "matiereAccueil", "produits"]) {
      expect(src).toMatch(new RegExp(`${fn}\\s*:`));
    }
  });

  it("front/CLAUDE.md interdit de remplacer tout le module API dans un test", () => {
    const md = readFileSync(join(front, "CLAUDE.md"), "utf8");
    expect(md).toMatch(/Un test ne doit jamais remplacer tout le module API/);
    expect(md).toContain("importOriginal");
  });

  // Bug 134 : app/[locale]/page.gammes.test.tsx remplace tout le module.
  it.fails("aucun test ne remplace tout le module @/lib/api", () => {
    expect(filesReplacingWholeApiModule()).toEqual([]);
  });
});
