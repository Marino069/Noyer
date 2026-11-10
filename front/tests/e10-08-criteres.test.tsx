import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageRendezVous } from "@/components/PageRendezVous";
import fr from "@/i18n/dictionaries/fr.json";
import { api } from "@/lib/api";

afterEach(() => vi.restoreAllMocks());

const remplirSansPiege = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/^Nom/), "Alice");
  await user.type(screen.getByLabelText(/^Adresse e-mail/), "a@b.ch");
  await user.type(screen.getByLabelText(/^Créneau souhaité/), "lundi");
  await user.type(screen.getByLabelText(/^Message/), "Bonjour");
};

describe("[E10-08] Critère : validation et messages d'erreur accessibles", () => {
  it("chaque champ invalide est relié à son message par aria-describedby et aria-invalid", async () => {
    const user = userEvent.setup();
    render(<PageRendezVous dictionary={fr.rendezVous} />);
    await user.type(screen.getByLabelText(/^Adresse e-mail/), "pas-un-email");
    await user.click(
      screen.getByRole("button", { name: fr.rendezVous.form.submit }),
    );
    const cas: [RegExp, string][] = [
      [/^Nom/, fr.rendezVous.form.errors.name],
      [/^Adresse e-mail/, fr.rendezVous.form.errors.email],
      [/^Créneau souhaité/, fr.rendezVous.form.errors.slot],
      [/^Message/, fr.rendezVous.form.errors.message],
    ];
    for (const [label, erreur] of cas) {
      const champ = screen.getByLabelText(label);
      expect(champ).toHaveAttribute("aria-invalid", "true");
      expect(champ).toHaveAccessibleDescription(
        expect.stringContaining(erreur),
      );
    }
  });

  it("le consentement nLPD est obligatoire", async () => {
    const spy = vi.spyOn(api, "contact");
    const user = userEvent.setup();
    render(<PageRendezVous dictionary={fr.rendezVous} />);
    await remplirSansPiege(user);
    await user.click(
      screen.getByRole("button", { name: fr.rendezVous.form.submit }),
    );
    expect(
      screen.getByText(fr.rendezVous.form.errors.consent),
    ).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("les zones de statut de succès et d'erreur serveur sont des régions annoncées", () => {
    render(<PageRendezVous dictionary={fr.rendezVous} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});

describe("[E10-08] Critère : champ piège anti-robot comme le contact", () => {
  it("transmet le contenu du champ piège tel quel (le serveur rejette les robots)", async () => {
    const spy = vi
      .spyOn(api, "contact")
      .mockResolvedValue({ ok: true, data: null } as never);
    const user = userEvent.setup();
    const { container } = render(<PageRendezVous dictionary={fr.rendezVous} />);
    await remplirSansPiege(user);
    const piege = container.querySelector<HTMLInputElement>(
      'input[name="site_web"]',
    );
    await user.type(piege as HTMLInputElement, "http://spam.example");
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: fr.rendezVous.form.submit }),
    );
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toMatchObject({
      site_web: "http://spam.example",
    });
  });

  it("le champ piège est le même que celui du formulaire de contact", () => {
    const contact = readFileSync("components/ContactForm.tsx", "utf8");
    const rdv = readFileSync("components/RendezVousForm.tsx", "utf8");
    const piege = /name="site_web" tabIndex=\{-1\} autoComplete="off"/;
    expect(contact).toMatch(piege);
    expect(rdv).toMatch(piege);
  });
});

describe("[E10-08] Critère : aucune route API nouvelle", () => {
  it("docs/api.md ne documente aucune route de rendez-vous", () => {
    const doc = readFileSync("../docs/api.md", "utf8");
    expect(doc).not.toMatch(/rendez-vous|rendezvous/i);
    expect(doc).toContain("### `POST /contact/`");
  });

  it("le téléphone facultatif vide n'apparaît pas dans le message", async () => {
    const spy = vi
      .spyOn(api, "contact")
      .mockResolvedValue({ ok: true, data: null } as never);
    const user = userEvent.setup();
    render(<PageRendezVous dictionary={fr.rendezVous} />);
    await remplirSansPiege(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: fr.rendezVous.form.submit }),
    );
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const { message } = spy.mock.calls[0][0] as { message: string };
    expect(message.startsWith("Objet : Rendez-vous")).toBe(true);
    expect(message).not.toContain("Téléphone");
  });
});
