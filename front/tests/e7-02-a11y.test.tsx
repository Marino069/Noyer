import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { detailDe, produits } from "@/mocks/data";

const hoisted = vi.hoisted(() => ({
  api: { panier: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/fr",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: { ...original.api, ...hoisted.api } };
});

import { Checkout } from "@/components/Checkout";
import { FicheProduit } from "@/components/FicheProduit";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Paiement } from "@/components/Paiement";
import { Panier } from "@/components/Panier";
import fr from "@/i18n/dictionaries/fr.json";

const { api } = hoisted;

/** Violations axe critiques ou sérieuses du conteneur (WCAG 2.x A/AA). */
async function violations(container: HTMLElement) {
  const res = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    // jsdom ne calcule ni la mise en page ni les couleurs : les contrastes
    // sont vérifiés à part, sur les tokens (voir plus bas).
    rules: { "color-contrast": { enabled: false } },
  });
  return res.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  api.panier.mockReset();
  api.panier.mockResolvedValue({
    ok: true,
    data: {
      lignes: [
        {
          id: "c1",
          produit: produits[0],
          quantite: 2,
          numero_piece: null,
          reservation_expire_le: null,
        },
      ],
      sous_total_centimes: produits[0].prix_ttc_centimes * 2,
      frais_livraison_centimes: 0,
      tva_incluse_centimes: 0,
      taux_tva: "8.10",
      total_centimes: produits[0].prix_ttc_centimes * 2,
    },
  });
});

describe("E7-02 · axe : zéro violation critique ou sérieuse", () => {
  it("en-tête et pied de page", async () => {
    const { container } = render(
      <>
        <Header locale="fr" dictionary={fr.header} />
        <main id="contenu">
          <h1>Titre</h1>
        </main>
        <Footer locale="fr" dictionary={fr.footer} newsletter={fr.newsletter} />
      </>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it.each([
    ["Classic", produits[0]],
    ["Premium", produits[1]],
  ])("fiche produit %s", async (_nom, produit) => {
    const { container } = render(
      <main>
        <FicheProduit
          produit={detailDe(produit)}
          disponibilite={
            produit.gamme === "Premium"
              ? {
                  ok: true as const,
                  data: {
                    gamme: "Premium" as const,
                    series: [
                      {
                        id: 1,
                        taille_serie: 50,
                        pieces_restantes: 3,
                        numeros_disponibles: [3, 8, 15],
                      },
                    ],
                  },
                }
              : {
                  ok: true as const,
                  data: { gamme: "Classic" as const, quantite_disponible: 7 },
                }
          }
          locale="fr"
          shopEnabled
          textes={fr.fiche}
          prix={fr.price}
          badge={fr.badge}
        />
      </main>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it("panier", async () => {
    const { container } = render(
      <main>
        <Panier
          locale="fr"
          textes={fr.panier}
          catalogueHref="/fr/produits"
          commandeHref="/fr/panier/commande"
        />
      </main>,
    );
    await screen.findAllByRole("listitem");
    expect(await violations(container)).toEqual([]);
  });

  it("commande", async () => {
    const { container } = render(
      <main>
        <Checkout
          locale="fr"
          textes={fr.checkout}
          catalogueHref="/fr/produits"
          cgvHref="/fr/cgv"
          paiementHref="/fr/panier/paiement"
        />
      </main>,
    );
    await screen.findByLabelText(/Adresse e-mail/);
    expect(await violations(container)).toEqual([]);
  });

  it("paiement", async () => {
    const { container } = render(
      <main>
        <Paiement
          textes={fr.paiement}
          reference="NOY-2026-00042"
          retour={null}
          panierHref="/fr/panier"
          redirect={vi.fn()}
        />
      </main>,
    );
    expect(await violations(container)).toEqual([]);
  });
});

describe("E7-02 · parcours clavier", () => {
  it("le lien d'évitement et la navigation sont atteignables au clavier", async () => {
    const user = userEvent.setup();
    render(
      <>
        <a href="#contenu">{fr.a11y.skipToContent}</a>
        <Header locale="fr" dictionary={fr.header} />
      </>,
    );
    await user.tab();
    expect(
      screen.getByRole("link", { name: fr.a11y.skipToContent }),
    ).toHaveFocus();
    await user.tab();
    expect(document.activeElement).not.toBe(document.body);
  });

  it("le formulaire de commande se parcourt entièrement à la tabulation", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <main>
        <Checkout
          locale="fr"
          textes={fr.checkout}
          catalogueHref="/fr/produits"
          cgvHref="/fr/cgv"
          paiementHref="/fr/panier/paiement"
        />
      </main>,
    );
    await screen.findByLabelText(/Adresse e-mail/);
    const champs = container.querySelectorAll<HTMLElement>(
      "input:not([type=hidden]):not([type=radio]), select, textarea, button, a[href]",
    );
    expect(champs.length).toBeGreaterThan(3);
    const vus = new Set<Element>();
    for (let i = 0; i < champs.length + 2; i++) {
      await user.tab();
      if (container.contains(document.activeElement)) {
        vus.add(document.activeElement as Element);
      }
    }
    for (const c of champs) {
      if (!(c as HTMLButtonElement).disabled && c.tabIndex >= 0) {
        expect(vus.has(c)).toBe(true);
      }
    }
  });
});

describe("E7-02 · contrastes du registre sombre (brief §07, AA 4.5:1)", () => {
  const css = readFileSync("styles/tokens.css", "utf8");
  const token = (nom: string) => {
    const m = css.match(new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})`));
    if (!m) throw new Error(`token --${nom} introuvable`);
    return m[1];
  };
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  // Écart connu (rapport docs/a11y-audit.md) : --brass sur --dark-bg-alt = 4.16:1,
  // suffisant pour les éléments non textuels (3:1) mais pas pour du texte courant.
  it("--brass sur --dark-bg-alt ≥ 3:1 (bordures, focus, grand texte)", () => {
    expect(ratio(token("brass"), token("dark-bg-alt"))).toBeGreaterThanOrEqual(
      3,
    );
  });

  it.each([
    ["dark-text", "dark-bg"],
    ["dark-text", "dark-bg-alt"],
    ["brass", "dark-bg"], // .gamme en registre sombre
    ["dark-bg", "brass"], // bouton laiton, texte sombre
    ["text", "bg"],
    ["text-muted", "bg"],
    ["text-muted", "bg-alt"],
  ])("--%s sur --%s ≥ 4.5:1", (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
