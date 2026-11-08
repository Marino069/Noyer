import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import fr from "@/i18n/dictionaries/fr.json";
import { DeuxGammes } from "@/components/DeuxGammes";
import { Selection } from "@/components/Selection";
import { ToastAjout } from "@/components/ToastAjout";
import type { ImagePrincipale, ProduitResume } from "@/lib/api";
import { detailDe, produits } from "@/mocks/data";

// Contrat docs/api.md : image_principale = { url, alt } ; sources et dimensions seulement
// pour une photo téléversée.
const sansSources: ImagePrincipale = {
  url: "https://example.org/a.jpg",
  alt: "Lampe Lucerne",
};
const avecSources: ImagePrincipale = {
  alt: "Lampe téléversée",
  largeur_origine: 1600,
  hauteur_origine: 1000,
  sources: [
    { largeur: 960, url: "/b.webp" },
    { largeur: 480, url: "/a.webp" },
  ],
};

const avec = (p: ProduitResume, image: ImagePrincipale | null) => ({
  ...p,
  image_principale: image,
});
const classic = produits.find((p) => p.slug === "lucerne-classic")!;
const premium = produits.find((p) => p.slug === "lucerne-premium")!;

const renderSelection = (image: ImagePrincipale | null) =>
  render(
    <Selection
      produits={{
        ok: true,
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [avec(classic, image)],
        },
      }}
      locale="fr"
      title="Atelier"
      empty="vide"
      errorTitle="Erreur"
      errorMessage="msg"
    />,
  );

describe("[Bug 290] Accueil : Selection avec image sans sources", () => {
  it("affiche l'image en repli sur url, sans erreur", () => {
    const { container } = renderSelection(sansSources);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.org/a.jpg");
  });

  it("garde le srcset quand les sources existent", () => {
    const { container } = renderSelection(avecSources);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/a.webp");
    expect(img?.getAttribute("srcset")).toBe("/a.webp 480w, /b.webp 960w");
  });

  it("n'affiche pas d'img (ni erreur) quand image_principale est null", () => {
    const { container } = renderSelection(null);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});

describe("[Bug 290] Accueil : DeuxGammes avec image sans sources", () => {
  it("affiche les deux cartes avec repli sur url", () => {
    const { container } = render(
      <DeuxGammes
        classic={{
          produit: avec(classic, sansSources),
          detail: detailDe(classic),
          tirage: null,
        }}
        premium={{
          produit: avec(premium, {
            url: "https://example.org/p.jpg",
            alt: "Premium",
          }),
          detail: detailDe(premium),
          tirage: 50,
        }}
        locale="fr"
        textes={fr.home.gammes}
      />,
    );
    const srcs = [...container.querySelectorAll("article img")].map((i) =>
      i.getAttribute("src"),
    );
    expect(srcs).toEqual([
      "https://example.org/a.jpg",
      "https://example.org/p.jpg",
    ]);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("tolère une image absente ou sans url ni sources", () => {
    const { container } = render(
      <DeuxGammes
        classic={{ produit: avec(classic, null), detail: null, tirage: null }}
        premium={{
          produit: avec(premium, { alt: "sans rien" }),
          detail: null,
          tirage: null,
        }}
        locale="fr"
        textes={fr.home.gammes}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});

describe("[Bug 290] Panier : ToastAjout avec image sans sources", () => {
  const props = {
    message: "Ajouté",
    href: "/fr/panier",
    viewCart: "Voir",
    dismiss: "Fermer",
    onClose: vi.fn(),
  };

  it("affiche la vignette en repli sur url", () => {
    render(<ToastAjout {...props} image={sansSources} />);
    const img = screen.getByTestId("toast-ajout").querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.org/a.jpg");
  });

  it("utilise la plus petite source quand elle existe", () => {
    render(<ToastAjout {...props} image={avecSources} />);
    const img = screen.getByTestId("toast-ajout").querySelector("img");
    expect(img?.getAttribute("src")).toBe("/a.webp");
  });

  it("sans image, le toast s'affiche sans vignette", () => {
    render(<ToastAjout {...props} image={null} />);
    const toast = screen.getByTestId("toast-ajout");
    expect(toast.querySelector("img")).toBeNull();
    expect(toast).toHaveTextContent("Ajouté");
  });
});
