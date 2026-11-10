import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BandeauDemo } from "@/components/BandeauDemo";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import fr from "@/i18n/dictionaries/fr.json";

vi.mock("next/navigation", () => ({ usePathname: () => "/fr" }));
vi.mock("@/lib/mocks", () => ({ startMocks: () => new Promise(() => {}) }));

const root = join(__dirname, "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");

describe("E10-02 : en-tête", () => {
  it("garde le menu burger plein écran et le trait de progression", () => {
    render(<Header locale="fr" dictionary={fr.header} />);
    expect(
      screen.getByRole("button", { name: "Ouvrir le menu" }),
    ).toHaveAttribute("aria-expanded", "false");
    const header = document.querySelector("header") as HTMLElement;
    expect(header.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    expect(header).toHaveAttribute("data-cache", "false");
  });

  it("le logo NOYER est en capitales espacées", () => {
    render(<Header locale="fr" dictionary={fr.header} />);
    expect(
      screen.getByRole("link", { name: fr.header.home }),
    ).toHaveTextContent(/noyer/i);
    const css = read("components/Logo.module.css");
    expect(css).toMatch(/text-transform:\s*uppercase/);
    expect(css).toMatch(/letter-spacing:\s*0\.6em/);
  });

  it("plus de bandeau d'atelier ni de bouton noir", () => {
    const tsx = read("components/Header.tsx");
    expect(tsx).not.toMatch(/BandeauAtelier/);
    expect(tsx).not.toMatch(/<Button/);
  });
});

describe("E10-02 : bandeau de démo", () => {
  it("reste affiché par le layout quand NEXT_PUBLIC_API_MOCKS=true", () => {
    expect(read("app/[locale]/layout.tsx")).toMatch(
      /API_MOCKS && <BandeauDemo/,
    );
    render(<BandeauDemo texte={fr.demo.bandeau} />);
    expect(screen.getByRole("note")).toHaveTextContent(fr.demo.bandeau);
  });
});

describe("E10-02 : pied de page", () => {
  it("a 4 colonnes dont la lettre de l'atelier", () => {
    render(
      <Footer locale="fr" dictionary={fr.footer} newsletter={fr.newsletter} />,
    );
    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("navigation", { name: "Collections" }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("navigation", { name: "La maison" }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("heading", { name: fr.newsletter.title }),
    ).toBeInTheDocument();
    expect(read("components/Footer.module.css")).toMatch(
      /repeat\(4,\s*minmax\(0,\s*1fr\)\)/,
    );
  });
});
