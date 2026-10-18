import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { networkError } from "@/lib/api";
import { produits } from "@/mocks/data";
import { Selection, SelectionSkeleton } from "./Selection";

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
