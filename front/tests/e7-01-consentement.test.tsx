import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConsentCookies } from "@/components/ConsentCookies";
import { Footer } from "@/components/Footer";
import fr from "@/i18n/dictionaries/fr.json";
import { CONSENT_KEY } from "@/lib/consent";

const SRC = "https://stats.example.test/t.js";
const tracker = () => document.getElementById("noyer-tracker");

function renderPage() {
  return render(
    <>
      <Footer
        locale="fr"
        dictionary={fr.footer}
        newsletter={fr.newsletter}
        consentLabel={fr.consent.footerLink}
      />
      <ConsentCookies dictionary={fr.consent} trackerSrc={SRC} />
    </>,
  );
}

describe("Consentement cookies (E7-01)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => tracker()?.remove());

  it("ne charge aucun tracker avant consentement", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: fr.consent.title }),
    ).toBeInTheDocument();
    expect(tracker()).toBeNull();
  });

  it("charge le tracker après « Accepter » et mémorise le choix", async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: fr.consent.accept }),
    );
    expect(tracker()?.getAttribute("src")).toBe(SRC);
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("accepted");
    expect(
      screen.queryByRole("heading", { name: fr.consent.title }),
    ).toBeNull();
  });

  it("« Refuser » est aussi accessible qu'« Accepter » et ne charge rien", async () => {
    renderPage();
    const refuse = screen.getByRole("button", { name: fr.consent.refuse });
    const accept = screen.getByRole("button", { name: fr.consent.accept });
    expect(refuse.className).toBe(accept.className);
    await userEvent.click(refuse);
    expect(tracker()).toBeNull();
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("refused");
  });

  it("n'affiche rien et ne charge rien si le choix est déjà fait", () => {
    window.localStorage.setItem(CONSENT_KEY, "refused");
    renderPage();
    expect(
      screen.queryByRole("heading", { name: fr.consent.title }),
    ).toBeNull();
    expect(tracker()).toBeNull();
  });

  it("les préférences se modifient depuis le pied de page", async () => {
    window.localStorage.setItem(CONSENT_KEY, "accepted");
    renderPage();
    expect(tracker()).not.toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: fr.consent.footerLink }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: fr.consent.refuse }),
    );
    expect(tracker()).toBeNull();
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("refused");
  });

  it("est utilisable au clavier", async () => {
    renderPage();
    const user = userEvent.setup();
    const refuse = screen.getByRole("button", { name: fr.consent.refuse });
    await act(async () => refuse.focus());
    await user.keyboard("{Enter}");
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe("refused");
  });

  it("sans tracker, ni bannière ni lien de préférences", () => {
    render(<ConsentCookies dictionary={fr.consent} />);
    expect(
      screen.queryByRole("heading", { name: fr.consent.title }),
    ).toBeNull();
  });
});
