// Tests indépendants du ticket E6-03 : un bloc par critère d'acceptation.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Contact } from "@/components/Contact";
import ContactPage from "@/app/[locale]/contact/page";
import { api } from "@/lib/api";
import fr from "@/i18n/dictionaries/fr.json";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

afterEach(() => vi.restoreAllMocks());

async function remplir(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Nom/), "Bob");
  await user.type(screen.getByLabelText(/^Adresse e-mail/), "bob@exemple.ch");
  await user.type(screen.getByLabelText(/^Message/), "Une question");
}

describe("Critère 1 : anti-spam sans CAPTCHA visuel (honeypot)", () => {
  it("le champ piège est hors tab, masqué aux lecteurs d'écran, non requis", () => {
    const { container } = render(<Contact dictionary={fr.contact} />);
    const piege = container.querySelector<HTMLInputElement>(
      'input[name="site_web"]',
    );
    expect(piege).not.toBeNull();
    expect(piege!.tabIndex).toBe(-1);
    expect(piege!.required).toBe(false);
    expect(piege!.autocomplete).toBe("off");
    expect(piege!.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(piege!.value).toBe("");
  });

  it("aucun CAPTCHA (iframe, script tiers, mention)", () => {
    const { container } = render(<Contact dictionary={fr.contact} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toMatch(/captcha/i);
  });

  it("transmet la valeur du champ piège telle quelle (le serveur tranche)", async () => {
    const spy = vi
      .spyOn(api, "contact")
      .mockResolvedValue({ ok: true, data: null } as never);
    const user = userEvent.setup();
    const { container } = render(<Contact dictionary={fr.contact} />);
    await remplir(user);
    const piege = container.querySelector<HTMLInputElement>(
      'input[name="site_web"]',
    )!;
    await user.type(piege, "http://spam.example");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0][0].site_web).toBe("http://spam.example");
  });

  it("envoie site_web vide pour un humain (contrat docs/api.md)", async () => {
    const spy = vi
      .spyOn(api, "contact")
      .mockResolvedValue({ ok: true, data: null } as never);
    const user = userEvent.setup();
    render(<Contact dictionary={fr.contact} />);
    await remplir(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0][0]).toEqual({
      nom: "Bob",
      email: "bob@exemple.ch",
      message: "Une question",
      consentement: true,
      site_web: "",
    });
  });
});

describe("Critère 2 : consentement au traitement des données (nLPD)", () => {
  it("la case de consentement existe, décochée par défaut, mentionne la nLPD", () => {
    render(<Contact dictionary={fr.contact} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/nLPD/)).toBeInTheDocument();
  });

  it("sans consentement : message d'erreur et aucun envoi", async () => {
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

  it("l'erreur de consentement est annoncée aux technologies d'assistance", async () => {
    const user = userEvent.setup();
    render(<Contact dictionary={fr.contact} />);
    await remplir(user);
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    const erreur = await screen.findByText(fr.contact.form.errors.consent);
    const box = screen.getByRole("checkbox");
    const annoncee =
      erreur.closest('[role="alert"]') !== null ||
      box.getAttribute("aria-invalid") === "true" ||
      (box.getAttribute("aria-describedby") ?? "").length > 0;
    expect(annoncee).toBe(true);
  });

  it("champs vides ou e-mail invalide : aucun envoi", async () => {
    const spy = vi.spyOn(api, "contact");
    const user = userEvent.setup();
    render(<Contact dictionary={fr.contact} />);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(spy).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/^Nom/), "Bob");
    await user.type(screen.getByLabelText(/^Adresse e-mail/), "pas-un-mail");
    await user.type(screen.getByLabelText(/^Message/), "Salut");
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText(fr.contact.form.errors.email)).toBeInTheDocument();
  });

  it("échec serveur : erreur affichée, pas de faux succès", async () => {
    vi.spyOn(api, "contact").mockResolvedValue({
      ok: false,
      error: { status: 500 },
    } as never);
    const user = userEvent.setup();
    render(<Contact dictionary={fr.contact} />);
    await remplir(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    expect(
      await screen.findByText(fr.contact.form.errors.server),
    ).toBeInTheDocument();
    expect(screen.queryByText(fr.contact.form.success)).toBeNull();
  });
});

describe("Critère 3 : showroom et carte chargée seulement après consentement", () => {
  it("affiche adresse et horaires dans une section titrée", () => {
    render(<Contact dictionary={fr.contact} />);
    expect(
      screen.getByRole("region", { name: "Showroom" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Genève, Suisse")).toBeInTheDocument();
    for (const h of fr.contact.showroom.hours) {
      expect(screen.getByText(h.jour)).toBeInTheDocument();
      expect(screen.getByText(h.horaire)).toBeInTheDocument();
    }
  });

  it("avant clic : ni iframe, ni ressource OpenStreetMap, ni requête réseau", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = render(<Contact dictionary={fr.contact} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(
      container.querySelector(
        '[src*="openstreetmap"], [href*="openstreetmap"]',
      ),
    ).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/OpenStreetMap/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Afficher le plan" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("après clic explicite : plan chargé et titré ; re-clic le retire", async () => {
    const user = userEvent.setup();
    const { container } = render(<Contact dictionary={fr.contact} />);
    await user.click(screen.getByRole("button", { name: "Afficher le plan" }));
    const frame = container.querySelector("iframe")!;
    expect(frame.getAttribute("src")).toMatch(
      /^https:\/\/www\.openstreetmap\.org\//,
    );
    expect(frame.getAttribute("title")).toBeTruthy();
    const masquer = screen.getByRole("button", { name: "Masquer le plan" });
    expect(masquer).toHaveAttribute("aria-expanded", "true");
    await user.click(masquer);
    expect(container.querySelector("iframe")).toBeNull();
  });
});

describe("Route /[locale]/contact", () => {
  it("rend la page avec un seul h1 et le formulaire", async () => {
    const ui = await ContactPage({ params: Promise.resolve({ locale: "fr" }) });
    render(ui);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeInTheDocument();
  });

  it("locale inconnue : 404", async () => {
    await expect(
      ContactPage({ params: Promise.resolve({ locale: "xx" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
