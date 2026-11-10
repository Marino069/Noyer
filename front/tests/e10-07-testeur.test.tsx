import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FicheProduit } from "@/components/FicheProduit";
import fr from "@/i18n/dictionaries/fr.json";
import { detailDe, produits } from "@/mocks/data";

const css = (f: string) =>
  readFileSync(join(__dirname, "../components", f), "utf8");

function rendre(gamme: "Classic" | "Premium", libres = [3, 7, 8]) {
  const produit = detailDe(produits.find((p) => p.gamme === gamme)!);
  const disponibilite =
    gamme === "Premium"
      ? {
          ok: true,
          data: {
            gamme,
            series: [{ taille_serie: 50, numeros_disponibles: libres }],
          },
        }
      : { ok: true, data: { gamme, stock: 4 } };
  return render(
    <FicheProduit
      produit={produit}
      disponibilite={disponibilite as never}
      locale="fr"
      shopEnabled
      textes={fr.fiche}
      prix={fr.price}
      badge={fr.badge}
      interrupteur={fr.interrupteur}
    />,
  );
}

describe("[E10-07] Conforme à fiche-premium.html (testeur)", () => {
  it("la fiche est en pleine largeur sombre, deux colonnes 7/5", () => {
    expect(css("FicheProduit.module.css")).toMatch(
      /minmax\(0,\s*7fr\)\s*minmax\(0,\s*5fr\)/,
    );
    const { container } = rendre("Premium");
    expect(container.querySelector("section")).toHaveAttribute(
      "data-tone",
      "dark",
    );
  });

  it("galerie : filets de 2 px, grande vue 21/20, vues carrées", () => {
    const g = css("GalerieEmpilee.module.css");
    expect(g).toMatch(/\.galerie\s*\{[^}]*gap:\s*2px/);
    expect(g).toMatch(/\.carrees\s*\{[^}]*gap:\s*2px/);
    expect(g).toMatch(/\.photo\s*\{[^}]*aspect-ratio:\s*21\s*\/\s*20/);
    expect(g).toMatch(/\.carree\s*\{[^}]*aspect-ratio:\s*1\s*;/);
  });

  it("galerie : grande vue avec interrupteur et vues secondaires", () => {
    rendre("Premium");
    const galerie = screen.getByRole("group", { name: fr.fiche.gallery.label });
    expect(within(galerie).getAllByRole("img").length).toBeGreaterThanOrEqual(
      3,
    );
    expect(
      within(galerie).getByRole("button", { name: /allumer/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("l'interrupteur bascule en « Éteindre »", async () => {
    rendre("Premium");
    await userEvent.click(screen.getByRole("button", { name: /allumer/i }));
    expect(screen.getByRole("button", { name: /éteindre/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("colonne d'achat dans l'ordre de la maquette", async () => {
    rendre("Premium");
    const aside = screen.getByRole("complementary", {
      name: fr.fiche.buyColumn,
    });
    await within(aside).findByRole("button", { name: /Réserver/ });
    const ordre = [
      within(aside).getByText(fr.fiche.eyebrow.premium),
      within(aside).getByRole("heading", { level: 1 }),
      within(aside).getByText("Premium", { selector: "p" }),
      within(aside).getByRole("group", { name: /Choisissez votre pièce/ }),
      within(aside).getByText(fr.fiche.cart.plateLabel),
      within(aside).getByRole("button", { name: /Réserver/ }),
      within(aside).getByRole("link", { name: fr.fiche.visit }),
      aside.querySelector("dl")!,
    ];
    for (let i = 0; i < ordre.length - 1; i++) {
      expect(
        ordre[i].compareDocumentPosition(ordre[i + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        `élément ${i} avant ${i + 1}`,
      ).toBeTruthy();
    }
  });

  it("grille de la série : libres cliquables, vendues non", async () => {
    rendre("Premium", [3, 7, 8]);
    const groupe = await screen.findByRole("group", {
      name: /Choisissez votre pièce/,
    });
    expect(within(groupe).getAllByRole("button")).toHaveLength(3);
    expect(within(groupe).getAllByRole("img")).toHaveLength(47);
  });

  it("choisir une pièce met à jour le bouton « Réserver la pièce N° … »", async () => {
    rendre("Premium", [3, 7, 8]);
    await userEvent.click(await screen.findByRole("button", { name: "N° 7" }));
    expect(
      screen.getByRole("button", { name: "Réserver la pièce N° 7" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "N° 7" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("le bouton atelier est un lien vers la page rendez-vous", () => {
    rendre("Premium");
    expect(
      screen.getByRole("link", { name: "La voir à l'atelier sur rendez-vous" }),
    ).toHaveAttribute("href", "/fr/rendez-vous");
  });

  it("caractéristiques en dl avec dimensions et matières", () => {
    const { container } = rendre("Premium");
    const dl = container.querySelector("dl")!;
    expect(dl).not.toBeNull();
    expect(dl.querySelectorAll("dt").length).toBeGreaterThanOrEqual(3);
    expect(dl.textContent).toContain(fr.fiche.details.dimensions);
    expect(dl.textContent).toContain(fr.fiche.details.materials);
  });

  it("Classic : ni grille, ni plaque, ni « Réserver la pièce »", () => {
    rendre("Classic");
    expect(screen.queryByRole("group", { name: /Choisissez/ })).toBeNull();
    expect(screen.queryByText(fr.fiche.cart.plateLabel)).toBeNull();
    expect(screen.queryByRole("button", { name: /Réserver/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: fr.fiche.cart.add }),
    ).toBeInTheDocument();
  });

  it("nom à 80 px (5rem) sur grand écran, gamme en italique", () => {
    const c = css("FicheProduit.module.css");
    expect(c).toMatch(
      /min-width:\s*1200px\)\s*\{\s*\.title\s*\{\s*font-size:\s*5rem/,
    );
    expect(c).toMatch(/\.gamme\s*\{[^}]*font-style:\s*italic/);
  });

  it("aucune couleur ni police en dur dans les styles de la fiche", () => {
    for (const f of [
      "FicheProduit.module.css",
      "GalerieEmpilee.module.css",
      "AjoutPanier.module.css",
    ]) {
      const c = css(f);
      expect(c, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(c, f).not.toMatch(/font-family:\s*[^v\s]/);
    }
  });

  it("panier latéral et vol vers le panier (E9-09) toujours branchés", () => {
    const src = readFileSync(
      join(__dirname, "../components/AjoutPanier.tsx"),
      "utf8",
    );
    expect(src).toContain("<PanierLateral");
    expect(src).toMatch(/voler\(depart/);
    expect(src).toContain("setTiroirOuvert(true)");
  });
});
