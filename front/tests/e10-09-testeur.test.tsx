import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ContactForm } from "@/components/ContactForm";
import { Input } from "@/components/Input";
import fr from "@/i18n/dictionaries/fr.json";

// Tests du testeur indépendant : critères de l'issue #352.
const root = process.cwd();
const tokens = readFileSync(join(root, "styles", "tokens.css"), "utf8");
const brief = readFileSync(join(root, "..", "docs", "brief.md"), "utf8");
const tok = (n: string) =>
  new RegExp(`${n}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)![1].toLowerCase();

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const SECONDAIRES = [
  "Panier",
  "Checkout",
  "Paiement",
  "Confirmation",
  "Contact",
  "ContactForm",
  "Atelier",
  "TexteRiche",
  "ProduitsListe",
  "ProductCard",
  "Field",
].map((n) => join(root, "components", `${n}.module.css`));

describe("[E10-09] Contrastes ≥ 4.5:1 partout", () => {
  it("les tokens du code correspondent au brief", () => {
    for (const n of ["--bg", "--bg-alt", "--text-muted", "--brass"]) {
      expect(brief.toLowerCase()).toContain(`${n}:${tok(n)}`);
    }
  });

  it.each(["--bg", "--bg-alt"])("texte et texte atténué sur %s", (bg) => {
    expect(ratio(tok("--text"), tok(bg))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(tok("--text-muted"), tok(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it("le laiton, utilisé en texte, tient 4.5:1 sur --bg", () => {
    expect(ratio(tok("--brass"), tok("--bg"))).toBeGreaterThanOrEqual(4.5);
  });

  it("la bordure laiton des champs ressort à ≥ 3:1 sur le fond du champ", () => {
    expect(ratio(tok("--brass"), tok("--bg-alt"))).toBeGreaterThanOrEqual(3);
  });
});

describe("[E10-09] Aucune couleur, police ou rayon hors tokens", () => {
  it.each(SECONDAIRES)("%s", (f) => {
    const s = readFileSync(f, "utf8");
    expect(s).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(s).not.toMatch(/\brgba?\(|\bhsla?\(/);
    for (const m of s.matchAll(/font-family:\s*([^;]+);/g))
      expect(m[1]).toMatch(/var\(--(serif|sans)\)/);
    for (const m of s.matchAll(/border-radius:\s*([^;]+);/g))
      expect(m[1].trim()).toMatch(/^(0|var\(--radius\)|50%)$/);
  });

  it("aucun CSS de components/ ne code une couleur en dur", () => {
    for (const f of readdirSync(join(root, "components")).filter((x) =>
      x.endsWith(".module.css"),
    )) {
      expect(readFileSync(join(root, "components", f), "utf8"), f).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b/,
      );
    }
  });
});

describe("[E10-09] Formulaires lisibles en sombre", () => {
  it("une erreur est annoncée, liée au champ et marquée par une icône", () => {
    render(<Input label="Nom" error="Champ requis" />);
    const champ = screen.getByLabelText(/Nom/);
    expect(champ).toHaveAttribute("aria-invalid", "true");
    const p = screen.getByText("Champ requis").closest("p")!;
    expect(champ.getAttribute("aria-describedby")).toContain(p.id);
    expect(p.textContent).toContain("!");
  });

  it("le formulaire de contact signale les erreurs à la soumission vide", async () => {
    const { container } = render(<ContactForm dictionary={fr.contact.form} />);
    await userEvent.click(screen.getByRole("button", { name: /envoy/i }));
    expect(
      container.querySelectorAll('[aria-invalid="true"]').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("focus visible : contour laiton, jamais supprimé", () => {
    const field = readFileSync(SECONDAIRES.at(-1)!, "utf8");
    expect(field).toMatch(
      /\.control:focus-visible \{[^}]*outline: 2px solid var\(--brass\)/,
    );
    for (const f of SECONDAIRES) {
      const css = readFileSync(f, "utf8");
      if (/outline:\s*(none|0)\s*;/.test(css)) {
        // Autorisé seulement si le contour est reporté sur le conteneur (:has).
        expect(css, f).toMatch(
          /:has\([^)]*:focus-visible\)\s*\{[^}]*outline: 2px solid/,
        );
      }
    }
  });
});
