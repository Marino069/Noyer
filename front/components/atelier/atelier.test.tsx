import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BandeauAtelier } from "./BandeauAtelier";
import { Cote } from "./Cote";
import { Filet } from "./Filet";
import { LegendeFigure } from "./LegendeFigure";
import { PlaqueGravee } from "./PlaqueGravee";
import { Surtitre } from "./Surtitre";

describe("BandeauAtelier", () => {
  it("rend chaque information", () => {
    render(<BandeauAtelier items={["ATELIER · GENÈVE", "46°12′ N"]} />);
    expect(screen.getByText("ATELIER · GENÈVE")).toBeInTheDocument();
    expect(screen.getByText("46°12′ N")).toBeInTheDocument();
  });
});

describe("Cote", () => {
  it("est décorative : masquée aux lecteurs d'écran", () => {
    render(<Cote label="H 42 cm" />);
    const cote = screen.getByText("H 42 cm").parentElement;
    expect(cote).toHaveAttribute("aria-hidden", "true");
  });

  it("gère l'orientation verticale et le positionnement", () => {
    render(
      <Cote
        label="Ø 28 cm"
        orientation="vertical"
        position={{ top: "10%", right: "20%" }}
        length="40%"
      />,
    );
    const cote = screen.getByText("Ø 28 cm").parentElement as HTMLElement;
    expect(cote.className).toMatch(/vertical/);
    expect(cote.className).toMatch(/positioned/);
    expect(cote.style.top).toBe("10%");
    expect(cote.style.right).toBe("20%");
    expect(cote.style.getPropertyValue("--cote-length")).toBe("40%");
  });

  it("est horizontale par défaut", () => {
    render(<Cote label="L 10 cm" />);
    expect(screen.getByText("L 10 cm").parentElement?.className).toMatch(
      /horizontal/,
    );
  });
});

describe("LegendeFigure", () => {
  it("rend un figcaption lisible avec numéro sur 2 chiffres et titre", () => {
    render(
      <figure>
        <LegendeFigure numero={1} titre="Le grain" />
      </figure>,
    );
    const legende = screen.getByText("FIG. 01 — Le grain");
    expect(legende.tagName).toBe("FIGCAPTION");
    expect(legende).not.toHaveAttribute("aria-hidden");
    expect(screen.getByRole("figure")).toHaveTextContent("FIG. 01 — Le grain");
  });

  it("fonctionne sans titre et sur une image", () => {
    render(
      <figure>
        <LegendeFigure numero={12} surImage />
      </figure>,
    );
    expect(screen.getByText("FIG. 12").className).toMatch(/surImage/);
  });
});

describe("Surtitre", () => {
  it("rend son texte, avec variantes sombre et accent", () => {
    render(
      <Surtitre tone="dark" accent>
        Carnet d&apos;atelier
      </Surtitre>,
    );
    const surtitre = screen.getByText("Carnet d'atelier");
    expect(surtitre.className).toMatch(/dark/);
    expect(surtitre.className).toMatch(/accent/);
  });
});

describe("Filet", () => {
  it("est décoratif et propose les variantes sombre et laiton", () => {
    const { container } = render(
      <>
        <Filet />
        <Filet tone="dark" accent />
      </>,
    );
    const filets = container.querySelectorAll("hr");
    expect(filets).toHaveLength(2);
    filets.forEach((f) => expect(f).toHaveAttribute("aria-hidden", "true"));
    expect(filets[1].className).toMatch(/dark/);
    expect(filets[1].className).toMatch(/accent/);
  });
});

describe("PlaqueGravee", () => {
  it("affiche « N° 07 / 50 », le libellé et la note", () => {
    const { container } = render(
      <PlaqueGravee
        numero={7}
        total={50}
        label="Votre pièce"
        note="Numéro gravé sous le pied."
      />,
    );
    expect(container.textContent).toContain("N° 07 / 50");
    expect(screen.getByText("Votre pièce")).toBeInTheDocument();
    expect(screen.getByText("Numéro gravé sous le pied.")).toBeInTheDocument();
  });

  it("fonctionne sans libellé ni note", () => {
    const { container } = render(<PlaqueGravee numero={12} total={50} />);
    expect(container.textContent).toBe("N° 12 / 50");
  });
});
