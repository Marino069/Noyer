import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Price } from "./Price";

const vatLabel = "TVA incluse ({rate})";

describe("Price", () => {
  it("affiche le montant en CHF sans décimale pour un montant rond", () => {
    render(<Price centimes={124000} locale="fr" vatLabel={vatLabel} />);
    expect(screen.getByText(/^CHF\s.*240\.–$/)).toBeInTheDocument();
  });

  it("affiche les centimes quand il y en a", () => {
    render(<Price centimes={4905} locale="fr" vatLabel={vatLabel} />);
    expect(screen.getByText("CHF 49.05")).toBeInTheDocument();
  });

  it("affiche la mention TVA seulement si le taux est fourni", () => {
    const { rerender } = render(
      <Price centimes={4905} locale="fr" vatLabel={vatLabel} />,
    );
    expect(screen.queryByText(/TVA incluse/)).not.toBeInTheDocument();

    rerender(
      <Price centimes={4905} locale="fr" tauxTva="8.10" vatLabel={vatLabel} />,
    );
    expect(screen.getByText(/TVA incluse \(8[.,]1\s?%\)/)).toBeInTheDocument();
  });
});
