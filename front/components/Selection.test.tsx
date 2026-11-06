import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { networkError } from "@/lib/api";
import { produits } from "@/mocks/data";
import { Selection, SelectionSkeleton, texteDispo } from "./Selection";

const textes = {
  locale: "fr" as const,
  title: "Notre sélection",
  empty: "Bientôt",
  errorTitle: "Indisponible",
  errorMessage: "Rechargez la page.",
};

const page = (results: typeof produits) => ({
  ok: true as const,
  data: { count: results.length, next: null, previous: null, results },
});

describe("[E3-05] Homepage : sélection produits", () => {
  it("affiche une carte par produit mis en avant", () => {
    render(<Selection {...textes} produits={page(produits.slice(0, 2))} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Notre sélection" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("[E8-06] cartes 4:5 entièrement cliquables avec un seul lien", () => {
    render(<Selection {...textes} produits={page(produits.slice(0, 2))} />);
    for (const carte of screen.getAllByRole("article")) {
      expect(within(carte).getAllByRole("link")).toHaveLength(1);
    }
    const css = readFileSync(join(__dirname, "Selection.module.css"), "utf8");
    expect(css).toMatch(/aspect-ratio:\s*4\s*\/\s*5/);
    expect(css).toMatch(/\.lien::after\s*{[^}]*inset:\s*0/);
  });

  it("[E8-06] affiche stock Classic et pièces libres Premium, rien sans donnée", () => {
    render(
      <Selection
        {...textes}
        produits={page(produits)}
        dispo={fr.home.selection.dispo}
        disponibilites={{
          "lucerne-classic": { gamme: "Classic", quantite_disponible: 7 },
          "lucerne-premium": {
            gamme: "Premium",
            series: [
              {
                id: 1,
                taille_serie: 50,
                pieces_restantes: 12,
                numeros_disponibles: [1],
              },
            ],
          },
          "leman-classic": { gamme: "Classic", quantite_disponible: 0 },
        }}
      />,
    );
    const [a, b, c] = screen.getAllByRole("article");
    expect(a).toHaveTextContent("En stock");
    expect(b).toHaveTextContent("12 pièces sur 50 encore libres");
    expect(c).toHaveTextContent("Épuisée pour le moment");
  });

  it("[E8-06] série Premium complète quand il ne reste aucune pièce", () => {
    expect(
      texteDispo(
        {
          gamme: "Premium",
          series: [
            {
              id: 1,
              taille_serie: 50,
              pieces_restantes: 0,
              numeros_disponibles: [],
            },
          ],
        },
        fr.home.selection.dispo,
      ),
    ).toBe("Série complète");
  });

  it("affiche un message quand la sélection est vide", () => {
    render(<Selection {...textes} produits={page([])} />);
    expect(screen.getByText("Bientôt")).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("affiche une alerte quand l'API échoue", () => {
    render(
      <Selection {...textes} produits={{ ok: false, error: networkError() }} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Rechargez la page.");
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("expose un état de chargement occupé", () => {
    render(<SelectionSkeleton label="Chargement" />);
    expect(screen.getByRole("region", { name: "Chargement" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
