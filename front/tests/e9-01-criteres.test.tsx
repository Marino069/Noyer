import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { FicheProduit } from "@/components/FicheProduit";
import { Interrupteur } from "@/components/Interrupteur";
import fr from "@/i18n/dictionaries/fr.json";
import { detailDe, produits } from "@/mocks/data";

const lire = (chemin: string) =>
  readFileSync(join(import.meta.dirname, "..", chemin), "utf8");

function Seul() {
  const [on, setOn] = useState(false);
  return (
    <Interrupteur
      allumee={on}
      onBascule={() => setOn((v) => !v)}
      libelleAllumer="Allumer la lampe"
      libelleEteindre="Éteindre la lampe"
    />
  );
}

const fiche = (avec = true) =>
  render(
    <FicheProduit
      produit={detailDe(produits[1])}
      disponibilite={{ ok: true, data: { gamme: "Premium", series: [] } }}
      locale="fr"
      shopEnabled
      textes={fr.fiche}
      prix={fr.price}
      badge={fr.badge}
      interrupteur={avec ? fr.interrupteur : undefined}
    />,
  );

const imgAllumee = (c: HTMLElement) =>
  c.querySelector('img[src*="allumee"]') as HTMLImageElement | null;

describe("[E9-01] Critère 1 : bouton aria-pressed et libellé clair", () => {
  it("l'interrupteur seul est un bouton aria-pressed qui bascule", async () => {
    render(<Seul />);
    const b = screen.getByRole("button", { name: "Allumer la lampe" });
    expect(b.tagName).toBe("BUTTON");
    expect(b).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(b);
    expect(
      screen.getByRole("button", { name: "Éteindre la lampe" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("est activable au clavier (Entrée / Espace)", async () => {
    render(<Seul />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("la fiche produit expose l'interrupteur avec les libellés du dictionnaire", () => {
    fiche();
    expect(
      screen.getByRole("button", { name: fr.interrupteur.allumer }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("la fiche produit sans libellés n'a pas d'interrupteur", () => {
    fiche(false);
    expect(screen.queryByRole("button", { name: /lampe/ })).toBeNull();
  });
});

describe("[E9-01] Critère 2 : image allumée chargée à la demande", () => {
  it("la fiche ne charge pas l'image allumée au rendu initial", () => {
    const { container } = fiche();
    expect(imgAllumee(container)).toBeNull();
  });

  it("la charge au survol de l'interrupteur, sans l'afficher", async () => {
    const { container } = fiche();
    await userEvent.hover(
      screen.getByRole("button", { name: fr.interrupteur.allumer }),
    );
    expect(imgAllumee(container)).toHaveAttribute("data-allumee", "false");
  });

  it("la charge au focus clavier", async () => {
    const { container } = fiche();
    await userEvent.tab();
    const bouton = screen.getByRole("button", {
      name: fr.interrupteur.allumer,
    });
    bouton.focus();
    expect(document.activeElement).toBe(bouton);
    expect(imgAllumee(container)).not.toBeNull();
  });

  it("la fiche : clic allume, re-clic éteint (fond de page inclus)", async () => {
    const { container } = fiche();
    await userEvent.click(
      screen.getByRole("button", { name: fr.interrupteur.allumer }),
    );
    expect(imgAllumee(container)).toHaveAttribute("data-allumee", "true");
    expect(document.documentElement.dataset.lampe).toBe("allumee");
    await userEvent.click(
      screen.getByRole("button", { name: fr.interrupteur.eteindre }),
    );
    expect(imgAllumee(container)).toHaveAttribute("data-allumee", "false");
    expect(document.documentElement.dataset.lampe).toBeUndefined();
  });

  it("retire le réchauffement du fond au démontage", async () => {
    const { unmount } = fiche();
    await userEvent.click(
      screen.getByRole("button", { name: fr.interrupteur.allumer }),
    );
    unmount();
    expect(document.documentElement.dataset.lampe).toBeUndefined();
  });

  it("l'image allumée décorative est masquée aux lecteurs d'écran", async () => {
    const { container } = fiche();
    await userEvent.click(
      screen.getByRole("button", { name: fr.interrupteur.allumer }),
    );
    expect(imgAllumee(container)).toHaveAttribute("aria-hidden", "true");
  });
});

describe("[E9-01] Critère 3 : reduced-motion, bascule instantanée (CSS)", () => {
  it("désactive les transitions de l'image, du halo et de l'interrupteur", () => {
    const lampe = lire("components/LampeAllumable.module.css");
    const inter = lire("components/Interrupteur.module.css");
    const re = /prefers-reduced-motion:\s*reduce\)[\s\S]*transition:\s*none/;
    expect(lampe).toMatch(re);
    expect(inter).toMatch(re);
  });

  it("cible tactile d'au moins 44 px et focus visible", () => {
    const inter = lire("components/Interrupteur.module.css");
    expect(inter).toMatch(/min-width:\s*44px/);
    expect(inter).toMatch(/min-height:\s*44px/);
    expect(inter).toMatch(/:focus-visible/);
  });

  it("le réchauffement du fond n'utilise que des tokens (pas de couleur en dur)", () => {
    const css = lire("styles/globals.css");
    const bloc = css.match(/html\[data-lampe="allumee"\][^{]*\{[^}]*\}/)?.[0];
    expect(bloc).toBeDefined();
    expect(bloc).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });
});

describe("[E9-01] Critère 4 : page design-system", () => {
  it("présente l'interrupteur seul et le hero avec interrupteur", () => {
    const page = lire("app/[locale]/design-system/page.tsx");
    expect(page).toContain("InterrupteurDemo");
    expect(page).toContain("interrupteur={{");
  });
});
