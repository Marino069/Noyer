// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const front = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(front, "package.json"), "utf8"));
const readme = readFileSync(join(front, "README.md"), "utf8");
const config = readFileSync(join(front, "vitest.config.mts"), "utf8");

function runVitest(source: string) {
  const dir = mkdtempSync(join(front, ".tmp-e0-07-"));
  try {
    writeFileSync(join(dir, "sample.test.ts"), source);
    return spawnSync(
      join(front, "node_modules/.bin/vitest"),
      ["run", "--dir", dir],
      { cwd: front, encoding: "utf8", env: { ...process.env, CI: "" } },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const passing = `import { it, expect } from "vitest";
it("ok", () => { expect(1).toBe(1); });`;
const failing = `import { it, expect } from "vitest";
it("ko", () => { expect(1).toBe(2); });`;

describe("E0-07 : outillage de tests", () => {
  it("fournit un script test lançant vitest une seule fois (sans watch)", () => {
    expect(pkg.scripts.test).toMatch(/vitest run/);
    expect(pkg.scripts.test).not.toMatch(/--watch/);
  });

  it("déclare Vitest, Testing Library (react, jest-dom) et jsdom", () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of [
      "vitest",
      "@testing-library/react",
      "@testing-library/jest-dom",
      "jsdom",
    ]) {
      expect(deps[name], name).toBeDefined();
    }
  });

  it("tourne sans navigateur : environnement DOM simulé (jsdom)", () => {
    expect(config).toMatch(/environment:\s*"jsdom"/);
    expect(config).not.toMatch(/browser/i);
  });

  it("un test qui réussit donne le code de sortie 0", () => {
    expect(runVitest(passing).status).toBe(0);
  }, 60_000);

  it("un test qui échoue donne un code de sortie non nul", () => {
    const r = runVitest(failing);
    expect(r.status).not.toBeNull();
    expect(r.status).not.toBe(0);
  }, 60_000);
});

describe("E0-07 : documentation", () => {
  it("contient une section « Tests »", () => {
    expect(readme).toMatch(/^#{1,6}\s+Tests\s*$/m);
  });

  it("explique comment lancer les tests", () => {
    expect(readme).toContain("npm --prefix front run test");
  });

  it("explique où placer les tests", () => {
    expect(readme).toMatch(/\.test\.tsx?/);
    expect(readme).toMatch(/à côté du fichier testé/);
  });
});
