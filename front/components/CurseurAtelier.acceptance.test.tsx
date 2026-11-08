// Tests d'acceptation indépendants du ticket E9-11 (issue #307).
import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurseurAtelier } from "./CurseurAtelier";

const racine = join(import.meta.dirname, "..");

type Ecouteur = () => void;
function media(etat: { fine: boolean; reduit: boolean }) {
  const ecouteurs: Ecouteur[] = [];
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    get matches() {
      return q.includes("pointer: fine")
        ? etat.fine
        : q.includes("reduce") && etat.reduit;
    },
    media: q,
    addEventListener: (_: string, cb: Ecouteur) => ecouteurs.push(cb),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  return () => ecouteurs.forEach((cb) => cb());
}

afterEach(() => vi.restoreAllMocks());

describe("Critère 1 : curseur personnalisé seulement avec (pointer: fine) hors reduced-motion", () => {
  it.each([
    ["tactile", { fine: false, reduit: false }],
    ["tactile + reduced-motion", { fine: false, reduit: true }],
    ["souris + reduced-motion", { fine: true, reduit: true }],
  ])("ne rend rien : %s", (_, etat) => {
    media(etat);
    const { container } = render(<CurseurAtelier libelleVoir="Voir" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("est rendu avec une souris hors reduced-motion, et masqué aux lecteurs d'écran", () => {
    media({ fine: true, reduit: false });
    render(<CurseurAtelier libelleVoir="Voir" />);
    expect(screen.getByTestId("curseur-atelier")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("disparaît si reduced-motion est activé en cours de session", () => {
    const etat = { fine: true, reduit: false };
    const declencher = media(etat);
    render(<CurseurAtelier libelleVoir="Voir" />);
    expect(screen.getByTestId("curseur-atelier")).toBeInTheDocument();
    etat.reduit = true;
    act(() => declencher());
    expect(screen.queryByTestId("curseur-atelier")).toBeNull();
  });

  it("ignore les pointeurs tactiles", () => {
    media({ fine: true, reduit: false });
    render(<CurseurAtelier libelleVoir="Voir" />);
    const curseur = screen.getByTestId("curseur-atelier");
    act(() => {
      fireEvent.pointerMove(document.body, {
        pointerType: "touch",
        clientX: 50,
        clientY: 60,
      });
    });
    expect(curseur.style.transform).toBe("");
  });

  it("suit la souris, grossit sur un lien, revient au repos, se cache à la sortie", () => {
    media({ fine: true, reduit: false });
    render(
      <>
        <CurseurAtelier libelleVoir="Voir" />
        <button type="button">Lien</button>
        <p>Texte</p>
      </>,
    );
    const curseur = screen.getByTestId("curseur-atelier");
    act(() => {
      fireEvent.pointerMove(screen.getByText("Lien"), {
        clientX: 10,
        clientY: 20,
      });
    });
    expect(curseur.dataset.etat).toBe("lien");
    expect(curseur.style.transform).toContain("10px, 20px");
    act(() => {
      fireEvent.pointerMove(screen.getByText("Texte"));
    });
    expect(curseur.dataset.etat).toBe("repos");
    act(() => {
      fireEvent.pointerLeave(document.documentElement);
    });
    expect(curseur.dataset.etat).toBe("cache");
  });

  it("affiche le libellé « Voir » reçu du dictionnaire au-dessus d'une lampe", () => {
    media({ fine: true, reduit: false });
    render(
      <>
        <CurseurAtelier libelleVoir="Voir" />
        <div data-curseur="voir">
          <span>lampe</span>
        </div>
      </>,
    );
    act(() => {
      fireEvent.pointerMove(screen.getByText("lampe"));
    });
    expect(screen.getByTestId("curseur-atelier").dataset.etat).toBe("voir");
    expect(screen.getByTestId("curseur-atelier")).toHaveTextContent("Voir");
    const fr = JSON.parse(
      readFileSync(join(racine, "i18n/dictionaries/fr.json"), "utf8"),
    );
    expect(fr.curseur.voir).toBe("Voir");
  });

  it("le curseur système reste utilisable : aucune règle `cursor: none`, anneau sans pointer-events", () => {
    const css = (dir: string): string[] =>
      readdirSync(join(racine, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? css(join(dir, e.name))
          : e.name.endsWith(".css")
            ? [readFileSync(join(racine, dir, e.name), "utf8")]
            : [],
      );
    const tout = [...css("components"), ...css("styles"), ...css("app")].join(
      "\n",
    );
    expect(tout).not.toMatch(/cursor\s*:\s*none/);
    const cssCurseur = readFileSync(
      join(racine, "components/CurseurAtelier.module.css"),
      "utf8",
    );
    expect(cssCurseur).toMatch(/pointer-events:\s*none/);
  });

  it('est monté dans le layout et les cartes produit portent data-curseur="voir"', () => {
    const layout = readFileSync(
      join(racine, "app/[locale]/layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/<CurseurAtelier\b/);
    expect(
      readFileSync(join(racine, "components/ProductCard.tsx"), "utf8"),
    ).toContain('data-curseur="voir"');
  });
});

function luminance(hex: string, fond?: { niveau: number; alpha: number }) {
  const lire = (h: string) =>
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  let c = lire(hex);
  if (fond) c = c.map((v) => fond.alpha * fond.niveau + (1 - fond.alpha) * v);
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

describe("Critère 2 : grain de papier < 10 Ko, contraste du texte ≥ 4.5:1", () => {
  const tokens = readFileSync(join(racine, "styles/tokens.css"), "utf8");
  const token = (n: string) =>
    tokens.match(new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{6})`))![1];
  const globals = readFileSync(join(racine, "styles/globals.css"), "utf8");
  const bloc = globals.match(/body::before\s*\{([^}]*)\}/)![1];
  const opacite = parseFloat(bloc.match(/opacity:\s*([\d.]+)/)![1]);

  it("pèse moins de 10 Ko et est une image statique (sans animation)", () => {
    const f = join(racine, "public/grain.svg");
    expect(statSync(f).size).toBeLessThan(10 * 1024);
    expect(readFileSync(f, "utf8")).not.toMatch(/<animate|<script|@keyframes/);
    expect(bloc).not.toMatch(/animation/);
  });

  it("est posé derrière le contenu, sans capter la souris, sur le fond", () => {
    expect(bloc).toMatch(/grain\.svg/);
    expect(bloc).toMatch(/pointer-events:\s*none/);
    expect(bloc).toMatch(/position:\s*fixed/);
    expect(bloc).toMatch(/z-index:\s*-1/);
  });

  it("garde un contraste ≥ 4.5:1 même si le grain est noir ou blanc pur à pleine densité", () => {
    expect(opacite).toBeLessThanOrEqual(0.1);
    const cas: [string, string][] = [
      ["text", "bg"],
      ["text", "bg-alt"],
      ["text-muted", "bg"],
      ["text-muted", "bg-alt"],
      ["dark-text", "dark-bg"],
      ["dark-text-muted", "dark-bg"],
      ["dark-text-muted", "dark-bg-alt"],
    ];
    for (const [t, f] of cas) {
      for (const grain of [0, 255]) {
        const lf = luminance(token(f), { niveau: grain, alpha: opacite });
        const lt = luminance(token(t));
        expect(
          ratio(lt, lf),
          `${t} sur ${f} + grain ${grain}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
