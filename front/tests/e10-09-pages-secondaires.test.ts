import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = (f: string) =>
  readFileSync(join(process.cwd(), "components", f), "utf8");

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const PAGES = [
  "Panier.module.css",
  "Checkout.module.css",
  "Paiement.module.css",
  "Confirmation.module.css",
];

describe("[E10-09] Pages secondaires au style Maison de luxe", () => {
  it.each(PAGES)("%s : titre Fraunces 300, sans couleur codée en dur", (f) => {
    const s = css(f);
    expect(s).toMatch(/\.title \{[^}]*font-weight: 300/);
    expect(s).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba?\(/);
  });

  it("le catalogue n'a plus de carte bordée ni de filtre en aplat de couleur hors laiton", () => {
    expect(css("ProductCard.module.css")).toMatch(/border: 0;/);
    expect(css("ProduitsListe.module.css")).toMatch(
      /text-transform: uppercase/,
    );
  });

  it("formulaires : champs sur fond sombre, focus laiton, erreur à bordure épaisse", () => {
    const s = css("Field.module.css");
    expect(s).toMatch(
      /\.control:focus-visible \{[^}]*outline: 2px solid var\(--brass\)/,
    );
    expect(s).toMatch(/\.control\[aria-invalid="true"\] \{\s*border: 2px/);
    expect(s).toMatch(/\.control \{[^}]*background: var\(--bg-alt\)/);
  });

  it.each([
    ["--text", "--bg"],
    ["--text", "--bg-alt"],
    ["--text-muted", "--bg"],
    ["--text-muted", "--bg-alt"],
    ["--brass", "--bg"],
  ])("contraste %s sur %s ≥ 4.5:1 (tokens)", (fg, bg) => {
    const tokens = readFileSync(
      join(process.cwd(), "styles", "tokens.css"),
      "utf8",
    );
    const val = (n: string) =>
      new RegExp(`${n}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)![1];
    expect(ratio(val(fg), val(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
