import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Contact } from "@/components/Contact";
import { api } from "@/lib/api";
import fr from "@/i18n/dictionaries/fr.json";

afterEach(() => vi.restoreAllMocks());

function remplir(user: ReturnType<typeof userEvent.setup>) {
  return (async () => {
    await user.type(screen.getByLabelText(/^Nom/), "Alice");
    await user.type(screen.getByLabelText(/^Adresse e-mail/), "a@b.ch");
    await user.type(screen.getByLabelText(/^Message/), "Bonjour");
  })();
}

describe("Page contact (E6-03)", () => {
  it("expose un champ piège caché aux humains et aux lecteurs d'écran, sans CAPTCHA", () => {
    const { container } = render(<Contact dictionary={fr.contact} />);
    const piege = container.querySelector<HTMLInputElement>(
      'input[name="site_web"]',
    );
    expect(piege).not.toBeNull();
    expect(piege?.tabIndex).toBe(-1);
    expect(piege?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByText(/captcha/i)).toBeNull();
  });

  it("refuse l'envoi sans consentement", async () => {
    const spy = vi.spyOn(api, "contact");
    const user = userEvent.setup();
    render(<Contact dictionary={fr.contact} />);
    await remplir(user);
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(
      await screen.findByText(fr.contact.form.errors.consent),
    ).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("envoie le message avec consentement et champ piège vide", async () => {
    const spy = vi
      .spyOn(api, "contact")
      .mockResolvedValue({ ok: true, data: null } as never);
    const user = userEvent.setup();
    render(<Contact dictionary={fr.contact} />);
    await remplir(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith({
      nom: "Alice",
      email: "a@b.ch",
      message: "Bonjour",
      consentement: true,
      site_web: "",
    });
    expect(
      await screen.findByText(fr.contact.form.success),
    ).toBeInTheDocument();
  });

  it("affiche l'adresse et les horaires du showroom", () => {
    render(<Contact dictionary={fr.contact} />);
    expect(screen.getByText("Genève, Suisse")).toBeInTheDocument();
    expect(screen.getByText("Samedi")).toBeInTheDocument();
    expect(screen.getByText("10 h – 17 h")).toBeInTheDocument();
  });

  it("ne charge la carte qu'après consentement explicite", async () => {
    const user = userEvent.setup();
    const { container } = render(<Contact dictionary={fr.contact} />);
    expect(container.querySelector("iframe")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Afficher le plan" }));
    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute("title")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Masquer le plan" }));
    expect(container.querySelector("iframe")).toBeNull();
  });
});
