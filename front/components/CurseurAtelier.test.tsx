import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AimantBoutons } from "./AimantBoutons";
import { Button } from "./Button";
import { CurseurAtelier } from "./CurseurAtelier";

function media({ fine, reduit }: { fine: boolean; reduit: boolean }) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("pointer: fine")
      ? fine
      : q.includes("reduce") && reduit,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => vi.restoreAllMocks());

describe("CurseurAtelier", () => {
  it("n'existe pas sur écran tactile", () => {
    media({ fine: false, reduit: false });
    render(<CurseurAtelier libelleVoir="Voir" />);
    expect(screen.queryByTestId("curseur-atelier")).toBeNull();
  });

  it("n'existe pas en reduced-motion", () => {
    media({ fine: true, reduit: true });
    render(<CurseurAtelier libelleVoir="Voir" />);
    expect(screen.queryByTestId("curseur-atelier")).toBeNull();
  });

  it("grossit sur un lien, affiche « Voir » sur une lampe, reste masqué aux lecteurs d'écran", () => {
    media({ fine: true, reduit: false });
    render(
      <>
        <CurseurAtelier libelleVoir="Voir" />
        <button type="button">Lien</button>
        <div data-curseur="voir" data-testid="lampe" />
      </>,
    );
    const curseur = screen.getByTestId("curseur-atelier");
    expect(curseur).toHaveAttribute("aria-hidden", "true");
    act(() => {
      fireEvent.pointerMove(screen.getByText("Lien"));
    });
    expect(curseur.dataset.etat).toBe("lien");
    act(() => {
      fireEvent.pointerMove(screen.getByTestId("lampe"));
    });
    expect(curseur.dataset.etat).toBe("voir");
    expect(curseur).toHaveTextContent("Voir");
  });
});

describe("AimantBoutons", () => {
  it("décale légèrement le bouton vers la souris (≤ 6 px) avec une souris", () => {
    media({ fine: true, reduit: false });
    render(
      <>
        <AimantBoutons />
        <Button>Ajouter</Button>
      </>,
    );
    const bouton = screen.getByRole("button", { name: "Ajouter" });
    act(() => {
      fireEvent.pointerMove(bouton, { clientX: 500, clientY: 500 });
    });
    expect(bouton.style.getPropertyValue("--aimant-x")).toBe("6px");
  });

  it("ne bouge pas en reduced-motion", () => {
    media({ fine: true, reduit: true });
    render(
      <>
        <AimantBoutons />
        <Button>Ajouter</Button>
      </>,
    );
    const bouton = screen.getByRole("button", { name: "Ajouter" });
    fireEvent.pointerMove(bouton, { clientX: 500, clientY: 500 });
    expect(bouton.style.getPropertyValue("--aimant-x")).toBe("");
  });
});

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe("Grain de papier", () => {
  it("pèse moins de 10 Ko", () => {
    const taille = statSync(join(__dirname, "../public/grain.svg")).size;
    expect(taille).toBeLessThan(10 * 1024);
  });

  it("garde le contraste du texte ≥ 4.5:1 même au pire cas", () => {
    const css = readFileSync(join(__dirname, "../styles/globals.css"), "utf8");
    const tokens = readFileSync(
      join(__dirname, "../styles/tokens.css"),
      "utf8",
    );
    const bloc = css.match(/body::before\s*\{[^}]*\}/)![0];
    expect(bloc).toContain("/grain.svg");
    const opacite = parseFloat(bloc.match(/opacity:\s*([\d.]+)/)![1]);
    // Pire cas : grain opaque de la couleur --text sur le fond, à l'opacité déclarée.
    const fond = [0xf5, 0xf1, 0xe8];
    const grain = [0x29, 0x25, 0x1f];
    const mix = fond.map((v, i) =>
      Math.round(v * (1 - opacite) + grain[i] * opacite),
    );
    const hex = "#" + mix.map((v) => v.toString(16).padStart(2, "0")).join("");
    for (const token of ["--text-muted", "--text"]) {
      const couleur = tokens.match(
        new RegExp(`${token}:\\s*(#[0-9a-f]{6})`),
      )![1];
      expect(ratio(luminance(couleur), luminance(hex))).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
});
