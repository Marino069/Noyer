import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hero } from "@/components/Hero";
import { Manifeste } from "@/components/Manifeste";
import frDict from "@/i18n/dictionaries/fr.json";
import { heroAccueil } from "@/mocks/data";

const preload = vi.hoisted(() => vi.fn());
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload,
}));

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const h = frDict.home.hero;
const atelier = {
  surtitre: h.surtitre,
  lien: { libelle: h.lien, href: "/fr/atelier" },
  coteHauteur: h.coteHauteur,
  coteDiametre: h.coteDiametre,
  piece: h.piece,
  filetsLabel: h.filetsLabel,
  filets: h.filets,
};

beforeEach(() => preload.mockClear());

describe("[E8-03] Critère 1 : conforme à la maquette desktop", () => {
  it("reprend les textes de la maquette (docs/maquette-atelier/accueil.html)", () => {
    expect(h.surtitre.toUpperCase()).toBe("CARNET D'ATELIER — N° 01");
    expect(h.cta).toBe("Découvrir les lampes");
    expect(h.lien).toBe("Entrer dans l'atelier");
    expect(h.coteHauteur).toBe("H 42 cm");
    expect(h.coteDiametre).toBe("Ø 28 cm");
    expect(h.piece.toUpperCase()).toBe("LUCERNE PREMIUM · PIÈCE N° 07 / 50");
    expect(h.filets.map((f) => `${f.label} — ${f.valeur}`)).toEqual([
      "Essence — Noyer massif",
      "Métal — Laiton brossé",
      "Geste — Tourné et huilé à la main",
      "Lieu — Atelier de Genève",
    ]);
  });

  it("met en italique uniquement le mot d'accent dans le h1", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" atelier={atelier} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(heroAccueil.titre);
    const em = h1.querySelectorAll("em");
    expect(em).toHaveLength(1);
    expect(em[0].textContent).toBe(heroAccueil.mot_italique);
  });

  it("n'italique rien si le mot d'accent est absent du titre", () => {
    render(
      <Hero
        contenu={{ ...heroAccueil, mot_italique: "introuvable" }}
        ctaHref="/fr"
      />,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.querySelector("em")).toBeNull();
    expect(h1).toHaveTextContent(heroAccueil.titre);
  });

  it("place le surtitre avant le titre, le lien d'atelier après le bouton", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr/p" atelier={atelier} />);
    const surtitre = screen.getByText(h.surtitre);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(
      surtitre.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const bouton = screen.getByRole("link", { name: h.cta });
    const lien = screen.getByRole("link", { name: h.lien });
    expect(
      bouton.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("masque les cotes décoratives aux lecteurs d'écran, garde l'étiquette lisible", () => {
    const { container } = render(
      <Hero contenu={heroAccueil} ctaHref="/fr" atelier={atelier} />,
    );
    for (const label of [h.coteHauteur, h.coteDiametre]) {
      const node = screen.getByText(label, { selector: "*" });
      expect(node.closest("[aria-hidden='true']")).not.toBeNull();
    }
    const fig = container.querySelector("figure")!;
    expect(within(fig).getByText(h.piece).tagName).toBe("FIGCAPTION");
  });

  it("rend le bandeau comme liste étiquetée de 4 éléments", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" atelier={atelier} />);
    const liste = screen.getByRole("list", { name: h.filetsLabel });
    expect(within(liste).getAllByRole("listitem")).toHaveLength(4);
  });

  it("reste utilisable sans habillage atelier (pas de cotes ni de bandeau)", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText(h.coteHauteur)).toBeNull();
  });

  it("lien secondaire souligné laiton via token, sans couleur en dur", () => {
    const css = read("components/Hero.module.css");
    expect(css).toMatch(
      /\.lien\s*\{[^}]*border-bottom:\s*1px solid var\(--brass\)/,
    );
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});

describe("[E8-03] Critère 1 : empilé proprement sur mobile", () => {
  const css = read("components/Hero.module.css");

  it("est mobile-first : une colonne par défaut, deux colonnes dès 900 px", () => {
    const base = css.split("@media")[0];
    expect(base).not.toMatch(/grid-template-columns:\s*1fr 1fr/);
    expect(css).toMatch(
      /@media \(min-width: 900px\)[\s\S]*\.layout\s*\{[^}]*grid-template-columns:\s*1fr 1fr/,
    );
  });

  it("masque les cotes par défaut et ne les affiche qu'en desktop", () => {
    const base = css.split("@media")[0];
    expect(base).toMatch(
      /\.coteHauteur,\s*\.coteDiametre\s*\{[^}]*display:\s*none/,
    );
    expect(css).toMatch(
      /@media \(min-width: 900px\)[\s\S]*\.coteHauteur,\s*\.coteDiametre\s*\{[^}]*display:\s*inline-flex/,
    );
  });

  it("filets : 1 colonne mobile, 2 en tablette, 4 en desktop", () => {
    expect(css.split("@media")[0]).toMatch(
      /\.filets\s*\{[^}]*grid-template-columns:\s*1fr;/,
    );
    expect(css).toMatch(
      /@media \(min-width: 600px\) and \(max-width: 899px\)[\s\S]*repeat\(2, 1fr\)/,
    );
    expect(css).toMatch(
      /@media \(min-width: 900px\)[\s\S]*\.filets\s*\{[^}]*repeat\(4, 1fr\)/,
    );
  });

  it("la cible tactile du lien secondaire fait au moins 44 px", () => {
    expect(css).toMatch(/\.lien\s*\{[^}]*min-height:\s*44px/);
  });
});

describe("[E8-03] Critère 2 : image du hero toujours prioritaire (LCP)", () => {
  it("précharge la plus petite source avec srcset, sizes et priorité haute", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" atelier={atelier} />);
    const sources = [...heroAccueil.image!.sources].sort(
      (a, b) => a.largeur - b.largeur,
    );
    expect(preload).toHaveBeenCalledTimes(1);
    const [href, opts] = preload.mock.calls[0];
    expect(href).toBe(sources[0].url);
    expect(opts).toMatchObject({ as: "image", fetchPriority: "high" });
    for (const s of sources) {
      expect(opts.imageSrcSet).toContain(`${s.url} ${s.largeur}w`);
    }
    expect(opts.imageSizes).toBeTruthy();
  });

  it("l'image est eager, haute priorité, jamais lazy, avec dimensions et srcset", () => {
    render(<Hero contenu={heroAccueil} ctaHref="/fr" atelier={atelier} />);
    const img = screen.getByRole("img", { name: heroAccueil.image!.alt });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("srcset");
    expect(img).toHaveAttribute("sizes");
    expect(img).toHaveAttribute(
      "width",
      String(heroAccueil.image!.largeur_origine),
    );
    expect(img).toHaveAttribute(
      "height",
      String(heroAccueil.image!.hauteur_origine),
    );
  });

  it("l'habillage ne change pas les attributs LCP de l'image", () => {
    const attrs = (a?: typeof atelier) => {
      const { unmount } = render(
        <Hero contenu={heroAccueil} ctaHref="/fr" atelier={a} />,
      );
      const img = screen.getByRole("img", { name: heroAccueil.image!.alt });
      const r = ["loading", "fetchpriority", "srcset", "sizes", "src"].map(
        (n) => img.getAttribute(n),
      );
      unmount();
      return r;
    };
    expect(attrs(atelier)).toEqual(attrs(undefined));
  });

  it("réserve le ratio de l'image (pas de décalage de mise en page)", () => {
    expect(read("components/Hero.module.css")).toMatch(
      /\.media\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/,
    );
  });

  it("sans image, ne précharge rien", () => {
    render(<Hero contenu={{ ...heroAccueil, image: null }} ctaHref="/fr" />);
    expect(preload).not.toHaveBeenCalled();
  });
});

describe("[E8-03] Critère 3 : placeholders conservés tels quels", () => {
  it("garde [PRÉNOM] littéral dans la signature du manifeste", () => {
    expect(frDict.home.manifeste.signature).toContain("[PRÉNOM]");
    render(<Manifeste {...frDict.home.manifeste} />);
    expect(screen.getByText(/\[PRÉNOM\]/)).toBeInTheDocument();
  });

  it("rend la citation complète de la maquette, accent en italique", () => {
    render(<Manifeste {...frDict.home.manifeste} />);
    const quote = screen.getByRole("blockquote");
    expect(quote).toHaveTextContent(
      "On ne fabrique pas une lampe plus vite que le bois ne sèche. Chaque pièce garde la trace de la main qui l'a tournée.",
    );
    expect(quote.querySelector("em")?.textContent).toBe(
      frDict.home.manifeste.accent,
    );
  });

  it("n'altère pas un placeholder passé en prop", () => {
    render(<Manifeste texte="Texte" accent="accent" signature="[PRÉNOM], X" />);
    expect(screen.getByText(/\[PRÉNOM\], X/)).toBeInTheDocument();
  });
});

describe("[E8-03] Homepage et règles du projet", () => {
  it("place le Manifeste juste après le Hero dans la homepage", () => {
    const page = read("app/[locale]/page.tsx");
    const hero = page.indexOf("<Hero");
    const manifeste = page.indexOf("<Manifeste");
    const next = page.indexOf("<Matiere", hero);
    expect(hero).toBeGreaterThan(-1);
    expect(manifeste).toBeGreaterThan(hero);
    expect(manifeste).toBeLessThan(next);
  });

  it("n'utilise ni clamp() ni couleur en dur dans les composants (tokens)", () => {
    for (const f of [
      "components/Hero.module.css",
      "components/Manifeste.module.css",
    ]) {
      const css = read(f);
      expect(css).not.toMatch(/clamp\(/);
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    }
    expect(read("styles/tokens.css")).toMatch(/--fs-quote:/);
  });
});
