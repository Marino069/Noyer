import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FicheProduit } from "@/components/FicheProduit";
import fr from "@/i18n/dictionaries/fr.json";
import { detailDe, produits } from "@/mocks/data";

const rendre = (produit: ReturnType<typeof detailDe>) =>
  render(
    <FicheProduit
      produit={produit}
      disponibilite={{ ok: true, data: { gamme: produit.gamme, series: [] } }}
      locale="fr"
      shopEnabled
      textes={fr.fiche}
      prix={fr.price}
      badge={fr.badge}
    />,
  );

describe("[Ticket 338] Fiche produit sans caracteristiques", () => {
  for (const p of produits) {
    describe(`gamme ${p.gamme}`, () => {
      const sans = { ...detailDe(p), caracteristiques: null };

      it("ne plante pas et affiche titre et matières", () => {
        expect(() => rendre(sans)).not.toThrow();
        expect(
          screen.getByRole("heading", { level: 1, name: sans.modele.nom }),
        ).toBeInTheDocument();
        expect(
          screen.getByText(fr.fiche.details.materials),
        ).toBeInTheDocument();
      });

      it("omet les cotes (galerie et ligne Dimensions)", () => {
        rendre(sans);
        expect(screen.queryByText(/^H \d/)).toBeNull();
        expect(screen.queryByText(fr.fiche.details.dimensions)).toBeNull();
      });
    });
  }

  it("affiche toujours les cotes quand caracteristiques est renseigné", () => {
    const avec = detailDe(produits[0]);
    rendre(avec);
    expect(screen.getByText(fr.fiche.details.dimensions)).toBeInTheDocument();
    expect(
      screen.getByText(`H ${avec.caracteristiques?.hauteur_cm} cm`),
    ).toBeInTheDocument();
  });

  it("le contrat docs/api.md documente le cas null", () => {
    const doc = readFileSync(
      join(process.cwd(), "..", "docs", "api.md"),
      "utf8",
    );
    expect(doc).toMatch(/`caracteristiques` est `null`/);
  });
});
