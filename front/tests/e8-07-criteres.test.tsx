import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FicheProduit } from "@/components/FicheProduit";
import fr from "@/i18n/dictionaries/fr.json";
import { detailDe, produits } from "@/mocks/data";

// Tests écrits à partir des critères de l'issue #262 et de la maquette fiche-premium.

const lire = (f: string) =>
  readFileSync(join(__dirname, "../components", f), "utf8");

const rendre = (produit = detailDe(produits[1])) =>
  render(
    <FicheProduit
      produit={produit}
      disponibilite={{ ok: true, data: { gamme: "Premium", series: [] } }}
      locale="fr"
      shopEnabled
      textes={fr.fiche}
      prix={fr.price}
      badge={fr.badge}
    />,
  );

/** CSS sans le bloc @media (min-width: 900px) : ce qui reste s'applique aussi au mobile. */
function horsMedia900(css: string) {
  const debut = css.indexOf("@media (min-width: 900px)");
  if (debut === -1) return css;
  let profondeur = 0;
  let fin = css.length;
  for (let i = css.indexOf("{", debut); i < css.length; i++) {
    if (css[i] === "{") profondeur++;
    if (css[i] === "}" && --profondeur === 0) {
      fin = i + 1;
      break;
    }
  }
  return css.slice(0, debut) + css.slice(fin);
}

describe("[E8-07] Critère : colonne sticky seulement au-dessus de 900 px", () => {
  const css = lire("FicheProduit.module.css");

  it("aucun sticky en dehors du média (min-width: 900px)", () => {
    expect(css).toMatch(/position:\s*sticky/);
    expect(horsMedia900(css)).not.toMatch(/sticky/);
  });

  it("le seuil est 900 px, en min-width uniquement", () => {
    expect(css).toMatch(/@media\s*\(min-width:\s*900px\)/);
    expect(css).not.toMatch(/max-width:\s*[^n\s]/);
  });

  it("le sticky a un décalage top (sinon il ne colle pas)", () => {
    expect(css).toMatch(/position:\s*sticky;\s*top:\s*[^;]+;/);
  });

  it("la grille passe de 1 colonne (mobile) à 7fr 5fr (desktop)", () => {
    expect(horsMedia900(css)).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/,
    );
    expect(css).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*7fr\)\s*minmax\(0,\s*5fr\)/,
    );
    expect(css).toMatch(/align-items:\s*start/);
  });

  it("galerie à gauche, aside Achat à droite, dans la même grille", () => {
    rendre();
    const aside = screen.getByRole("complementary", { name: "Achat" });
    const layout = aside.parentElement as HTMLElement;
    expect(layout.children).toHaveLength(2);
    expect(layout.children[1]).toBe(aside);
    expect(layout.children[0]).toHaveAttribute("aria-label", "Galerie photo");
  });
});

describe("[E8-07] Critère : conforme à la maquette fiche-premium", () => {
  it("galerie : grande vue 21/20, deux carrées 1/1 côte à côte, gros plan 16/9", () => {
    const css = lire("GalerieEmpilee.module.css");
    expect(css).toMatch(/\.photo\s*\{[^}]*aspect-ratio:\s*21\s*\/\s*20/);
    expect(css).toMatch(/\.carree\s*\{[^}]*aspect-ratio:\s*1\s*;/);
    expect(css).toMatch(/\.matiere\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
    expect(css).toMatch(
      /\.carrees\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/,
    );
  });

  it("ordre : grande vue, deux carrées, puis gros plan (ordre des médias)", () => {
    const produit = detailDe(produits[1]);
    rendre(produit);
    const imgs = within(
      screen.getByRole("group", { name: "Galerie photo" }),
    ).getAllByRole("img");
    const plusPetite = (m: (typeof produit.medias)[number]) =>
      [...m.sources].sort((a, b) => a.largeur - b.largeur)[0].url;
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual(
      produit.medias.map(plusPetite),
    );
  });

  it("la cote est décorative et posée sur la grande vue", () => {
    rendre();
    const cote = screen.getByText(/^H \d+ cm$/);
    expect(cote).toHaveAttribute("aria-hidden", "true");
    const figure = cote.closest("figure");
    expect(figure).not.toBeNull();
    expect(figure?.querySelector("img")).not.toBeNull();
  });

  it("chaque image a un alt non vide, des dimensions et un srcset", () => {
    rendre();
    const imgs = within(
      screen.getByRole("group", { name: "Galerie photo" }),
    ).getAllByRole("img");
    for (const img of imgs) {
      expect((img.getAttribute("alt") ?? "").trim()).not.toBe("");
      expect(img).toHaveAttribute("width");
      expect(img).toHaveAttribute("height");
      expect(img.getAttribute("srcset")).toMatch(/\d+w/);
    }
  });

  it("caractéristiques : dl avec dt/dd pour dimensions, matières, entretien", () => {
    rendre();
    const aside = screen.getByRole("complementary", { name: "Achat" });
    const dl = aside.querySelector("dl") as HTMLElement;
    const dts = [...dl.querySelectorAll("dt")].map((d) => d.textContent);
    expect(dts).toEqual(
      expect.arrayContaining([
        fr.fiche.details.dimensions,
        fr.fiche.details.materials,
        fr.fiche.details.care,
      ]),
    );
    expect(dl.querySelectorAll("dd")).toHaveLength(dts.length);
    expect(dl).toHaveTextContent(/Diamètre \d+ cm/);
  });

  it("le lien de bascule pointe vers l'autre gamme", () => {
    const p = detailDe(produits[1]);
    rendre(p);
    const lien = screen.getByRole("link", { name: "Comparer avec la Classic" });
    expect(lien.getAttribute("href")).toContain(p.autre_gamme);
  });

  it("fiche Classic : mêmes colonnes, lien vers la Premium", () => {
    rendre(detailDe(produits[0]));
    expect(
      screen.getByRole("complementary", { name: "Achat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Comparer avec la Premium" }),
    ).toBeInTheDocument();
  });

  it("sans photo : message de remplacement, pas de galerie", () => {
    rendre({ ...detailDe(produits[1]), medias: [] });
    expect(screen.getByText(fr.fiche.gallery.empty)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Galerie photo" })).toBeNull();
  });

  it("une seule photo : une seule image, sans crash", () => {
    const p = detailDe(produits[1]);
    rendre({ ...p, medias: p.medias.slice(0, 1) });
    const imgs = within(
      screen.getByRole("group", { name: "Galerie photo" }),
    ).getAllByRole("img");
    expect(imgs).toHaveLength(1);
  });
});

describe("[E8-07] Charte : pas de valeur hors tokens", () => {
  for (const f of ["GalerieEmpilee.module.css", "FicheProduit.module.css"]) {
    it(`${f} : pas de couleur, police ni rayon en dur`, () => {
      const css = lire(f);
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css).not.toMatch(/\brgba?\(/);
      expect(css).not.toMatch(/font-family:\s+(?!var\()/);
      expect(css).not.toMatch(/border-radius:\s+(?!var\()/);
    });
  }
});
