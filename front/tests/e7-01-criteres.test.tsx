import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConsentCookies } from "@/components/ConsentCookies";
import { Footer } from "@/components/Footer";
import fr from "@/i18n/dictionaries/fr.json";

// Tests indépendants écrits à partir des critères d'acceptation de #47.
const SRC = "https://stats.example.test/t.js";
const scripts = () =>
  Array.from(document.querySelectorAll("script")).filter((s) =>
    s.getAttribute("src")?.includes("stats.example.test"),
  );
const title = () => screen.queryByRole("heading", { name: fr.consent.title });

function page(trackerSrc: string = SRC) {
  return render(
    <>
      <Footer
        locale="fr"
        dictionary={fr.footer}
        newsletter={fr.newsletter}
        consentLabel={trackerSrc ? fr.consent.footerLink : undefined}
      />
      <ConsentCookies dictionary={fr.consent} trackerSrc={trackerSrc} />
    </>,
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(() => scripts().forEach((s) => s.remove()));

describe("E7-01 : aucun tracker avant consentement", () => {
  it("n'insère aucun script tant que le visiteur n'a pas choisi", () => {
    page();
    expect(title()).toBeInTheDocument();
    expect(scripts()).toHaveLength(0);
  });

  it("n'insère aucun script après « Refuser »", async () => {
    page();
    await userEvent.click(screen.getByRole("button", { name: "Refuser" }));
    expect(scripts()).toHaveLength(0);
  });

  it("n'insère le script qu'une fois après « Accepter »", async () => {
    page();
    await userEvent.click(screen.getByRole("button", { name: "Accepter" }));
    expect(scripts()).toHaveLength(1);
  });

  it("ne charge pas le tracker si un refus est mémorisé", () => {
    window.localStorage.setItem("noyer-consent", "refused");
    page();
    expect(scripts()).toHaveLength(0);
  });

  it("un choix « accepté » mémorisé recharge le tracker", () => {
    window.localStorage.setItem("noyer-consent", "accepted");
    page();
    expect(scripts()).toHaveLength(1);
  });

  it("ignore une valeur mémorisée invalide", () => {
    window.localStorage.setItem("noyer-consent", "yes");
    page();
    expect(scripts()).toHaveLength(0);
    expect(title()).toBeInTheDocument();
  });
});

describe("E7-01 : « Refuser » aussi accessible qu'« Accepter »", () => {
  it("les deux boutons ont le même style et le même ordre de tabulation", () => {
    page();
    const refuse = screen.getByRole("button", { name: "Refuser" });
    const accept = screen.getByRole("button", { name: "Accepter" });
    expect(refuse.tagName).toBe(accept.tagName);
    expect(refuse.className).toBe(accept.className);
    expect(refuse.getAttribute("tabindex")).toBe(
      accept.getAttribute("tabindex"),
    );
    expect(refuse.getAttribute("style")).toBe(accept.getAttribute("style"));
  });

  it("« Refuser » est atteignable au clavier et activable avec Espace", async () => {
    page();
    const user = userEvent.setup();
    const refuse = screen.getByRole("button", { name: "Refuser" });
    for (let i = 0; i < 60 && document.activeElement !== refuse; i++) {
      await user.tab();
    }
    expect(refuse).toHaveFocus();
    await user.keyboard(" ");
    expect(window.localStorage.getItem("noyer-consent")).toBe("refused");
    expect(title()).toBeNull();
  });
});

describe("E7-01 : préférences modifiables depuis le footer", () => {
  it("le footer propose le lien quand un tracker est configuré", () => {
    page();
    expect(
      screen.getByRole("button", { name: fr.consent.footerLink }),
    ).toBeInTheDocument();
  });

  it("le footer n'affiche pas le lien sans tracker", () => {
    page("");
    expect(
      screen.queryByRole("button", { name: fr.consent.footerLink }),
    ).toBeNull();
  });

  it("rouvre la bannière après un refus ; « Accepter » charge alors le tracker", async () => {
    window.localStorage.setItem("noyer-consent", "refused");
    page();
    expect(title()).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: fr.consent.footerLink }),
    );
    expect(title()).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accepter" }));
    expect(scripts()).toHaveLength(1);
    expect(window.localStorage.getItem("noyer-consent")).toBe("accepted");
  });

  it("retire le tracker quand on passe d'« accepté » à « refusé »", async () => {
    window.localStorage.setItem("noyer-consent", "accepted");
    page();
    expect(scripts()).toHaveLength(1);
    await userEvent.click(
      screen.getByRole("button", { name: fr.consent.footerLink }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Refuser" }));
    expect(scripts()).toHaveLength(0);
  });
});

describe("E7-01 : accessibilité clavier", () => {
  it("la bannière est une région nommée par son titre", () => {
    page();
    expect(
      screen.getByRole("region", { name: fr.consent.title }),
    ).toBeInTheDocument();
  });

  it("à la réouverture le focus va sur le titre ; Échap ferme sans changer le choix", async () => {
    window.localStorage.setItem("noyer-consent", "accepted");
    page();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: fr.consent.footerLink }),
    );
    expect(title()).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(title()).toBeNull();
    expect(window.localStorage.getItem("noyer-consent")).toBe("accepted");
    expect(scripts()).toHaveLength(1);
  });

  it("Échap ne ferme pas la bannière initiale (aucun choix fait)", async () => {
    page();
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard("{Escape}");
    expect(title()).toBeInTheDocument();
  });
});

describe("E7-01 : sobriété et charte", () => {
  const css = readFileSync(
    join(__dirname, "../components/ConsentCookies.module.css"),
    "utf8",
  );

  it("n'utilise aucune couleur en dur (tokens uniquement)", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
  });

  it("n'utilise aucun rayon ni police en dur", () => {
    expect(css).not.toMatch(/border-radius:\s*[\d.]+(px|rem)/);
    expect(css).not.toMatch(/font-family:\s*(?!var\()\S/);
  });

  it("n'utilise aucune animation", () => {
    expect(css).not.toMatch(/@keyframes|animation:/);
  });
});
