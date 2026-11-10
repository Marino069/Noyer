import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageRendezVous } from "@/components/PageRendezVous";
import { RendezVous } from "@/components/RendezVous";
import fr from "@/i18n/dictionaries/fr.json";
import { api } from "@/lib/api";

afterEach(() => vi.restoreAllMocks());

const remplir = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/^Nom/), "Alice");
  await user.type(screen.getByLabelText(/^Adresse e-mail/), "a@b.ch");
  await user.type(screen.getByLabelText(/^Créneau souhaité/), "samedi matin");
  await user.type(screen.getByLabelText(/^Message/), "Bonjour");
};

describe("[E10-08] Section « Venez voir la lumière »", () => {
  it("titre, adresse à confirmer et bouton vers /rendez-vous", () => {
    render(<RendezVous href="/fr/rendez-vous" textes={fr.home.rendezVous} />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Venez voir la lumière/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/\[ADRESSE\]/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: fr.home.rendezVous.cta }),
    ).toHaveAttribute("href", "/fr/rendez-vous");
  });
});

describe("[E10-08] Page /rendez-vous", () => {
  it("expose un champ piège caché, sans CAPTCHA", () => {
    const { container } = render(<PageRendezVous dictionary={fr.rendezVous} />);
    const piege = container.querySelector<HTMLInputElement>(
      'input[name="site_web"]',
    );
    expect(piege?.tabIndex).toBe(-1);
    expect(piege?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("messages d'erreur accessibles, focus sur le premier champ invalide, aucun envoi", async () => {
    const spy = vi.spyOn(api, "contact");
    const user = userEvent.setup();
    render(<PageRendezVous dictionary={fr.rendezVous} />);
    await user.click(
      screen.getByRole("button", { name: fr.rendezVous.form.submit }),
    );
    const nom = screen.getByLabelText(/^Nom/);
    expect(nom).toHaveAttribute("aria-invalid", "true");
    expect(nom).toHaveFocus();
    expect(nom).toHaveAccessibleDescription(fr.rendezVous.form.errors.name);
    expect(
      screen.getByText(fr.rendezVous.form.errors.slot),
    ).toBeInTheDocument();
    expect(
      screen.getByText(fr.rendezVous.form.errors.consent),
    ).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuse un téléphone invalide mais accepte un champ vide", async () => {
    const spy = vi.spyOn(api, "contact");
    const user = userEvent.setup();
    render(<PageRendezVous dictionary={fr.rendezVous} />);
    await remplir(user);
    await user.type(screen.getByLabelText(/^Téléphone/), "abc");
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: fr.rendezVous.form.submit }),
    );
    expect(
      await screen.findByText(fr.rendezVous.form.errors.phone),
    ).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("envoie via POST /contact/ avec l'objet « Rendez-vous » et le champ piège vide", async () => {
    const spy = vi
      .spyOn(api, "contact")
      .mockResolvedValue({ ok: true, data: null } as never);
    const user = userEvent.setup();
    render(<PageRendezVous dictionary={fr.rendezVous} />);
    await remplir(user);
    await user.type(screen.getByLabelText(/^Téléphone/), "+41 22 000 00 00");
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: fr.rendezVous.form.submit }),
    );
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith({
      nom: "Alice",
      email: "a@b.ch",
      message:
        "Objet : Rendez-vous\nCréneau souhaité : samedi matin\nTéléphone : +41 22 000 00 00\n\nBonjour",
      consentement: true,
      site_web: "",
    });
    expect(
      await screen.findByText(fr.rendezVous.form.success),
    ).toBeInTheDocument();
  });

  it("annonce l'échec du serveur", async () => {
    vi.spyOn(api, "contact").mockResolvedValue({
      ok: false,
      error: { statut: 500 },
    } as never);
    const user = userEvent.setup();
    render(<PageRendezVous dictionary={fr.rendezVous} />);
    await remplir(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: fr.rendezVous.form.submit }),
    );
    expect(
      await screen.findByText(fr.rendezVous.form.errors.server),
    ).toBeInTheDocument();
  });

  it("aucune route API nouvelle : seul /contact/ est appelé", () => {
    const src = readFileSync("components/RendezVousForm.tsx", "utf8");
    expect(src).toContain("api.contact(");
    expect(src).not.toMatch(/rendez-vous\//);
  });
});
